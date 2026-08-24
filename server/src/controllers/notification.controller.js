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

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: req.user._id,
    },
    {
      $set: {
        isRead: true,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!notification) {
    throw new APIError(404, "Notification not found!");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        notification,
        "Notification marked as read successfully!"
      )
    );
});

export { getUserNotifications, markNotificationAsRead };
