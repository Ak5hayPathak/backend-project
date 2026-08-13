import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const pipeline = [];

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

const publishAVideo = asyncHandler(async (req, res) => {
  let { title, description = "" } = req.body;

  if (!title) {
    throw new APIError(400, "Video title is required!");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new APIError(400, "Video File is required!");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);

  let isPublished;

  if (!videoFile) {
    throw new APIError(500, "Failed to upload video on cloudinary!");
  }

  let thumbnail;
  if (thumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
      throw new APIError(500, "Failed to upload thumbnail on cloudinary!");
    }
  }

  const duration = videoFile?.duration;

  if (duration === null) {
    throw new APIError(500, "Video File is not uploaded!");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new APIError(401, "Unauthorized Request!");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail?.url || "",
    isPublished: true,
    duration,
    owner: userId,
  });

  const publishedVideo = await Video.findById(video._id);

  if (!publishedVideo) {
    throw new APIError(500, "Something went wrong while uploading the video!");
  }

  return res
    .status(201)
    .json(
      new APIResponse(201, publishedVideo, "Video Published Successfully!")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!isValidObjectId(videoId)) {
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

  if (!isValidObjectId(videoId)) {
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

  if (!isValidObjectId(videoId)) {
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
    try {
      await deleteFromCloudinary(videoFilePath);
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

  if (!isValidObjectId(videoId)) {
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

export {getAllVideos, publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus};