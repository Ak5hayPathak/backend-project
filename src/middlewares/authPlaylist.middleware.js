import mongoose from "mongoose";

import { Playlist } from "../models/playlist.model.js";
import { PlaylistCollaborator } from "../models/playlistCollaborator.model.js";
import { APIError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyPlaylistEditor = asyncHandler(async (req, res, next) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new APIError(400, "Playlist id is required!");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new APIError(400, "Invalid playlist id!");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new APIError(404, "Playlist not found!");
  }

  const isOwner = playlist.owner.equals(req.user._id);

  if (isOwner) {
    req.playlist = playlist;
    return next();
  }

  const isCollaborator = await PlaylistCollaborator.exists({
    playlist: playlistId,
    user: req.user._id,
    status: "accepted",
  });

  if (!isCollaborator) {
    throw new APIError(403, "You are not authorized to modify this playlist!");
  }

  req.playlist = playlist;

  next();
});

export { verifyPlaylistEditor };
