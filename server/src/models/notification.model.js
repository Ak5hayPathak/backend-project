import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

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
        "tweet_like",
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

notificationSchema.plugin(mongooseAggregatePaginate);

export const Notification = mongoose.model("Notification", notificationSchema);