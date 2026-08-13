import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const userId = req.user._id;

  const [totalSubscribers, videoAggregate, likeAggregate] = await Promise.all([
    Subscription.countDocuments({
      channel: userId,
    }),

    Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
        },
      },
    ]),

    Like.aggregate([
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "videoInfo",
        },
      },
      {
        $unwind: "$videoInfo",
      },
      {
        $match: {
          "videoInfo.owner": new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: 1 },
        },
      },
    ]),
  ]);

  const stats = {
    subscribers: totalSubscribers || 0,
    totalVideos: videoAggregate[0]?.totalVideos || 0,
    totalViews: videoAggregate[0]?.totalViews || 0,
    totalLikes: likeAggregate[0]?.totalLikes || 0,
  };

  return res
    .status(200)
    .json(new APIResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const userId = req.user._id;

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const videos = await Video.aggregatePaginate(
    Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
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
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
        },
      },

      {
        $project: {
          likes: 0,
        },
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (videos.docs.length === 0) {
    throw new APIError(404, "No videos found!");
  }

  return res
    .status(200)
    .json(new APIResponse(200, videos, "Channel videos fetched successfully!"));
});

export { getChannelStats, getChannelVideos };
