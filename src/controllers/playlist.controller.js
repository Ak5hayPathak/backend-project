import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/ApiError.js";
import { APIResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { name, description = "" } = req.body;

  if (!name?.trim()) {
    throw new APIError(400, "Playlist name is required!");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new APIError(
      500,
      "Something went wrong while creating the playlist!"
    );
  }

  return res
    .status(201)
    .json(new APIResponse(201, playlist, "Playlist created successfully!"));
});
