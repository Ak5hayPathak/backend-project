import mongoose from "mongoose";
import { PlaylistCollaborator } from "../models/playlistCollaborator.model.js";
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";

const sendInvitation = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { playlistId, userId } = req.params;

  if (!playlistId) {
    throw new APIError(400, "Playlist id is required!");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new APIError(400, "Invalid playlist id!");
  }

  const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new APIError(404, "Playlist not found or access denied!");
  }

  if (!userId) {
    throw new APIError(400, "User Id is required!");
  }

  if (userId === req.user._id.toString()) {
    throw new APIError(400, "You cannot invite yourself to collaborate!");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new APIError(400, "invalid user Id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new APIError(404, "User not found!");
  }

  const invitation = await PlaylistCollaborator.create({
    playlist: playlistId,
    user: userId,
  });

//   if (!invitation) {
//     throw new APIError(
//       500,
//       "Something went wrong while creating the invitation!"
//     );
//   }

  return res
    .status(201)
    .json(new APIResponse(201, invitation, "Invitation sent successfully!"));
});

export {sendInvitation};