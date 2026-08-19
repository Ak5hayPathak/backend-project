import mongoose, { Schema } from "mongoose";

const playlistCollaboratorSchema = new Schema(
  {
    playlist: {
      type: Schema.Types.ObjectId,
      ref: "Playlist",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

playlistCollaboratorSchema.index({ playlist: 1, user: 1 }, { unique: true });

export const PlaylistCollaborator = mongoose.model(
  "PlaylistCollaborator",
  playlistCollaboratorSchema
);