import mongoose from "mongoose";
import { PlaylistCollaborator } from "../models/playlistCollaborator.model.js";
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";

// sendInvitation
// acceptInvitation
// rejectInvitation
// cancelInvitation
// getAllPendingInvitations
// getAllAcceptedInvitations
// getAllCollaborators
// removeCollaborator

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
    invitedBy: req.user._id,
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

const acceptInvitation = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { invitationId } = req.params;

  if (!invitationId) {
    throw new APIError(400, "Invitation id is required!");
  }

  if (!mongoose.isValidObjectId(invitationId)) {
    throw new APIError(400, "Invalid invitation id!");
  }

  const invitation = await PlaylistCollaborator.findOne({
    _id: invitationId,
    user: req.user._id,
    status: "pending",
  });

  if (!invitation) {
    throw new APIError(404, "Invitation not found!");
  }

  invitation.status = "accepted";
  await invitation.save();

  return res
    .status(200)
    .json(
      new APIResponse(200, invitation, "Invitation accepted successfully!")
    );
});

export { sendInvitation, acceptInvitation };
