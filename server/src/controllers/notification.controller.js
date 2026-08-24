import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";

const getUserNotifications = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const notifications = await Notification.aggregate([
    {
      $match: {
        recipient: req.user._id,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "senderDetails",
      },
    },

    {
      $unwind: "$senderDetails",
    },

    {
      $project: {
        recipient: 1,
        type: 1,
        message: 1,
        resource: 1,
        isRead: 1,
        createdAt: 1,
        updatedAt: 1,

        sender: {
          _id: "$senderDetails._id",
          username: "$senderDetails.username",
          fullName: "$senderDetails.fullName",
          avatar: "$senderDetails.avatar",
        },
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new APIResponse(200, notifications, "Notifications fetched successfully!")
    );
});

export { getUserNotifications };
