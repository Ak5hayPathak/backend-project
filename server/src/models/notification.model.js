import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "playlist_invitation",
        "playlist_invitation_accepted",
        "new_subscriber",
        "video_comment",
        "comment_reply",
        "video_like",
        "comment_like",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    resource: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model("Notification", notificationSchema);