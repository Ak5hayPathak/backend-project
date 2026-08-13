import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { APIError, ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new APIError(400, "Channel id is required!");
  }

  if (!isValidObjectId(channelId)) {
    throw new APIError(400, "Invalid channel id!");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new APIError(404, "Channel not found!");
  }

  if (!req.user) {
    throw new APIError(401, "Unauthorized Request!");
  }

  if (channelId === req.user._id.toString()) {
    throw new APIError(400, "You cannot subscribe to yourself!");
  }

  const alreadySubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user._id,
  });

  if (alreadySubscribed) {
    await alreadySubscribed.deleteOne();
    return res
      .status(200)
      .json(new APIResponse(200, null, "Channel unsubscribed successfully"));
  } else {
    await Subscription.create({
      channel: channelId,
      subscriber: req.user._id,
    });

    return res
      .status(201)
      .json(new APIResponse(201, null, "Channel subscribed successfully"));
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 20, sortType = "desc" } = req.query;

  const subscribers = await Subscription.aggregatePaginate(
    Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(req.user._id),
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriberDetails",
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
        $unwind: "$subscriberDetails",
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (subscribers.docs.length === 0) {
    throw new APIError(404, "No subscribers found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 20, sortType = "desc" } = req.query;

  const subscribedChannels = await Subscription.aggregatePaginate(
    Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(req.user._id),
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "channelDetails",
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
                fullName: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$channelDetails",
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (subscribedChannels.docs.length === 0) {
    throw new APIError(404, "No subscribed channel found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    );
});

export {toggleSubscription, getSubscribedChannels, getUserChannelSubscribers};