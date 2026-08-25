import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Notification } from "../models/notification.model.js";
import { Subscription } from "../models/subscription.model.js";
import { getSocketIO } from "../sockets/socket.manager.js";

const createTweet = asyncHandler(async (req, res) => {
  let { content } = req.body;

  if (!content?.trim()) {
    throw new APIError(400, "Tweet is required");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new APIError(401, "Unauthorized Request!");
  }

  const tweet = await Tweet.create({
    content,
    owner: userId,
  });

  const subscriptions = await Subscription.find({
    channel: userId,
  }).select("subscriber");

  const notifications = subscriptions.map((subscription) => ({
    recipient: subscription.subscriber,
    sender: userId,
    type: "new_tweet",
    message: `${req.user.username} posted a new tweet`,
    resource: tweet._id,
  }));

  if (notifications.length > 0) {
    // Bulk insert notifications instead of creating them individually for each subscriber using inserMany()
    await Notification.insertMany(notifications);
  }

  const io = getSocketIO();

  for (const subscription of subscriptions) {
    io.to(`userId:${subscription.subscriber}`).emit("notification", {
      recipient: subscription.subscriber,
      sender: userId,
      type: "new_tweet",
      message: `${req.user.username} posted a new tweet`,
      resource: tweet._id,
    });
  }

  return res
    .status(201)
    .json(new APIResponse(201, tweet, "Tweet created Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new APIError(400, "Invalid User ID");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
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
      $unwind: "$ownerDetails",
    },

    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  if (tweets.length === 0) {
    throw new APIError(404, "No tweets found for this user");
  }

  return res
    .status(200)
    .json(new APIResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new APIError(400, "Tweet id is required!");
  }

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet id!");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new APIError(404, "Tweet not found or access denied!");
  }

  const { content } = req.body;

  if (!content?.trim()) {
    throw new APIError(400, "Content is required!");
  }

  tweet.content = content;

  await tweet.save();

  return res
    .status(200)
    .json(new APIResponse(200, tweet, "Tweet updated successfully!"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new APIError(400, "Tweet id is required!");
  }

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet id!");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new APIError(404, "Tweet not found or access denied!");
  }

  await tweet.deleteOne();

  return res
    .status(200)
    .json(new APIResponse(200, null, "Tweet deleted successfully!"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
