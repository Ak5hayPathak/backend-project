import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Notification } from "../models/notification.model.js";
import { getSocketIO } from "../sockets/socket.manager.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }

  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new APIError(404, "Video not found!");
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
    const like = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });

    if (video.owner.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: video.owner,
        sender: req.user._id,
        type: "video_like",
        message: `${req.user.username} liked your video`,
        resource: like._id,
      });

      const io = getSocketIO();

      io.to(`userId:${video.owner}`).emit("notification", notification);
    }

    return res
      .status(201)
      .json(new APIResponse(201, null, "Video liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }

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
    const like = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });

    if (comment.owner.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: comment.owner,
        sender: req.user._id,
        type: "comment_like",
        message: `${req.user.username} liked your comment`,
        resource: comment._id,
      });

      const io = getSocketIO();

      io.to(`userId:${comment.owner}`).emit("notification", notification);
    }

    return res
      .status(201)
      .json(new APIResponse(201, null, "Comment liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }

  if (!tweetId) {
    throw new APIError(400, "Tweet id is required!");
  }

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet id!");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new APIError(404, "Tweet not found!");
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
    const like = await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });

    if (tweet.owner.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: tweet.owner,
        sender: req.user._id,
        type: "tweet_like",
        message: `${req.user.username} liked your tweet`,
        resource: tweet._id,
      });

      const io = getSocketIO();

      io.to(`userId:${tweet.owner}`).emit("notification", notification);
    }

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
      new APIResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

const getLikedTweets = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }
  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const likedTweets = await Like.aggregatePaginate(
    Like.aggregate([
      {
        $match: {
          likedBy: new mongoose.Types.ObjectId(req.user._id),
          tweet: {
            $exists: true,
          },
        },
      },

      {
        $lookup: {
          from: "tweets",
          localField: "tweet",
          foreignField: "_id",
          as: "tweets",
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
                content: 1,
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
        $unwind: "$tweets",
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },
      {
        $project: {
          _id: "$tweets._id",
          content: "$tweets.content",
          ownerDetails: "$tweets.ownerDetails",
        },
      },
    ]),

    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (likedTweets.docs.length === 0) {
    throw new APIError(404, "No liked tweets found");
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, likedTweets, "liked tweets fetched successfully")
    );
});

export {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos,
  getLikedTweets,
};
