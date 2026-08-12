import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStatus = asyncHandler(async (req, res) => {
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
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {});

export { getChannelStats, getChannelVideos };
