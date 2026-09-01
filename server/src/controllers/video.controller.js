import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { Subscription } from "../models/subscription.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSocketIO } from "../sockets/socket.manager.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { processAndUploadVideo } from "../services/videoProcessing.service.js";
import { generateThumbnail } from "../utils/videoProcessor.js";
import { deleteVideoDirectoryFromB2 } from "../utils/b2Uploader.js";
import path from "path";
import fs from "fs/promises";

const publishAVideo = asyncHandler(async (req, res) => {
  let { title, description = "" } = req.body;

  if (!title?.trim()) {
    throw new APIError(400, "Video title is required!");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  let thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new APIError(400, "Video File is required!");
  }

  // Generate thumbnail if user didn't upload one
  if (!thumbnailLocalPath) {
    thumbnailLocalPath = path.join(
      "public",
      "temp",
      `thumbnail-${Date.now()}.jpg`
    );
    await generateThumbnail(videoFileLocalPath, thumbnailLocalPath);
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new APIError(401, "Unauthorized Request!");
  }

  // Process video and upload HLS files to B2
  const { videoFile, qualities, duration } =
    await processAndUploadVideo(videoFileLocalPath);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new APIError(500, "Failed to upload thumbnail on Cloudinary!");
  }

  console.log("Thumbnail Uploaded Successfully");
   await fs.unlink(videoFileLocalPath);

  const video = await Video.create({
    title,
    description,
    videoFile,
    thumbnail: thumbnail.url,
    isPublished: true,
    duration,
    qualities,
    owner: userId,
  });

  const publishedVideo = await Video.findById(video._id);

  if (!publishedVideo) {
    throw new APIError(500, "Something went wrong while uploading the video!");
  }

  const subscriptions = await Subscription.find({
    channel: userId,
  }).select("subscriber");

  const notifications = subscriptions.map((subscription) => ({
    recipient: subscription.subscriber,
    sender: userId,
    type: "new_video",
    message: `${req.user.username} posted a new video`,
    resource: publishedVideo._id,
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  const io = getSocketIO();

  //might not be efficient
  for (const subscription of subscriptions) {
    io.to(`userId:${subscription.subscriber}`).emit("notification", {
      recipient: subscription.subscriber,
      sender: userId,
      type: "new_video",
      message: `${req.user.username} posted a new video`,
      resource: publishedVideo._id,
    });
  }

  return res
    .status(201)
    .json(
      new APIResponse(201, publishedVideo, "Video Published Successfully!")
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  let {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const pipeline = [];

  if (!userId) {
    userId = req.user._id;
  }
  // Search by title or description
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    });
  }

  // Only published videos
  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  // Filter by owner (optional)
  if (userId) {
    if (!mongoose.mongoose.isValidObjectId(userId)) {
      throw new APIError(400, "Invalid user ID");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // Sort
  pipeline.push({
    $sort: {
      [sortBy]: sortType === "asc" ? 1 : -1,
    },
  });

  // Get owner details
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "ownerDetails",
      pipeline: [
        {
          $project: {
            username: 1,
            avatar: 1,
          },
        },
      ],
    },
  });

  // Convert ownerDetails array into an object
  pipeline.push({
    $unwind: "$ownerDetails",
  });

  const result = await Video.aggregatePaginate(Video.aggregate(pipeline), {
    page: Number(page),
    limit: Number(limit),
  });

  return res
    .status(200)
    .json(new APIResponse(200, result, "Videos fetched successfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { views: 1 } }, //increases views to +1 preventing race condition
    { returnDocument: "after" }
  );

  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        watchHistory: {
          video: new mongoose.Types.ObjectId(videoId),
          watchedAt: new Date(), //attaches the exact date and time when the video was watched
        },
      },
    });
  }

  const aggregatedArrayOfVideo = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },

    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },

    {
      $lookup: {
        from: "subscription",
        localField: "owner",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        owner: {
          $first: "$owner",
        },

        likesCount: {
          $size: "$likes",
        },

        isLiked: {
          $in: [req.user.id, "$likes.likedBy"],
        },

        subscriberCount: {
          $size: "$subscribers",
        },

        isSubscribed: {
          $in: [req.user.id, "$subscribers.subscriber"],
        },
      },
    },

    {
      $project: {
        likes: 0,
        subscribers: 0,
      },
    },
  ]);

  if (!aggregatedArrayOfVideo?.length) {
    throw new ApiError(404, "Video dataset error");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        aggregatedArrayOfVideo[0],
        "Video Received Successfully!"
      )
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });

  if (!video) {
    throw new APIError(404, "Video not found or access denied!");
  }

  const { title, description, isPublished } = req.body;
  const newThumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (
    title === undefined &&
    description === undefined &&
    isPublished === undefined &&
    !newThumbnailLocalPath
  ) {
    throw new APIError(400, "At least one field must be provided for editing.");
  }

  const oldThumbnail = video.thumbnail;

  if (title !== undefined) {
    video.title = title;
  }

  if (description !== undefined) {
    video.description = description;
  }

  if (isPublished !== undefined) {
    video.isPublished = isPublished;
  }

  if (newThumbnailLocalPath) {
    const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);

    if (!newThumbnail?.url) {
      throw new APIError(500, "Error while uploading new thumbnail!");
    }

    video.thumbnail = newThumbnail.url;
  }

  await video.save();

  if (newThumbnailLocalPath && oldThumbnail) {
    try {
      await deleteFromCloudinary(oldThumbnail);
    } catch (err) {
      throw new APIError(500, err.message);
    }
  }

  return res
    .status(200)
    .json(new APIResponse(200, video, "Video updated successfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });

  if (!video) {
    throw new APIError(404, "Video not found or access denied!");
  }

  const videoFilePath = video.videoFile;
  const thumbnailPath = video.thumbnail;

  if (videoFilePath) {
    const parts = videoFilePath.split("/");
    const videoId = parts[1];

    try {
      await deleteVideoDirectoryFromB2(videoId);
    } catch (err) {
      throw new APIError(500, err.message);
    }
  }

  if (thumbnailPath) {
    try {
      await deleteFromCloudinary(thumbnailPath);
    } catch (err) {
      throw new APIError(500, err.message);
    }
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new APIResponse(200, null, "Video deleted successfully!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });

  if (!video) {
    throw new APIError(404, "Video not found or access denied!");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(new APIResponse(200, video, "Publish status updated successfully!"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
