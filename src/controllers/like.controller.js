import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new APIError(404, "Video not found!");
  }

  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }

  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (alreadyLiked) {
    await alreadyLiked.deleteOne();
    return res
      .status(200)
      .json(new APIResponse(200, null, "Video unliked successfully"));
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });

    return res
      .status(201)
      .json(new APIResponse(201, null, "Video liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new APIError(400, "Comment id is required!");
  }

  if (!mongoose.isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment id!");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new APIError(404, "Comment not found!");
  }

  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }

  const alreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (alreadyLiked) {
    await alreadyLiked.deleteOne();
    return res
      .status(200)
      .json(new APIResponse(200, null, "Comment unliked successfully"));
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });

    return res
      .status(201)
      .json(new APIResponse(201, null, "Comment liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new APIError(400, "Tweet id is required!");
  }

  if (!isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet id!");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new APIError(404, "Tweet not found!");
  }

  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }

  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (alreadyLiked) {
    await alreadyLiked.deleteOne();
    return res
      .status(200)
      .json(new APIResponse(200, null, "Tweet unliked successfully"));
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });

    return res
      .status(201)
      .json(new APIResponse(201, null, "Tweet liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }
  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const likedVideos = await Like.aggregatePaginate(
    Like.aggregate([
      {
        $match: {
          likedBy: new mongoose.Types.ObjectId(req.user._id),
          video: {
            $exists: true,
          },
        },
      },

      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "videos",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
              },
            },

            {
              $unwind: "$ownerDetails",
            },

            {
              $project: {
                videoFile: 1,
                title: 1,
                thumbnail: 1,
                views: 1,
                ownerDetails: {
                  username: 1,
                  avatar: 1,
                  fullName: 1,
                },
              },
            },
          ],
        },
      },

      {
        $unwind: "$videos",
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },
      {
        $project: {
          // Final cleanup
          _id: 1,
          videos: 1,
        },
      },
    ]),

    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (likedVideos.docs.length === 0) {
    throw new APIError(404, "No liked videos found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
