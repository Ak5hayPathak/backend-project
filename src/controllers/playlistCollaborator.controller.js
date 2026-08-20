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

const rejectInvitation = asyncHandler(async (req, res) => {
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

  await invitation.deleteOne();

  return res
    .status(200)
    .json(new APIResponse(200, null, "Invitation rejected successfully!"));
});

const cancelInvitation = asyncHandler(async (req, res) => {
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
    invitedBy: req.user._id,
    status: "pending",
  });

  if (!invitation) {
    throw new APIError(404, "Invitation not found or access denied!");
  }

  await invitation.deleteOne();

  return res
    .status(200)
    .json(new APIResponse(200, null, "Invitation cancelled successfully!"));
});

const getInvitationById = asyncHandler(async (req, res) => {
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
    $or: [{ user: req.user._id }, { invitedBy: req.user._id }],
  });

  if (!invitation) {
    throw new APIError(404, "Invitation not found or access denied!");
  }

  return res
    .status(200)
    .json(new APIResponse(200, invitation, "Invitation fetched successfully!"));
});

const removeCollaborator = asyncHandler(async (req, res) => {
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

  if (!userId) {
    throw new APIError(400, "User id is required!");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new APIError(400, "Invalid user id!");
  }

  // Only the playlist owner can remove collaborators
  const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new APIError(404, "Playlist not found or access denied!");
  }

  const collaboration = await PlaylistCollaborator.findOne({
    playlist: playlistId,
    user: userId,
    status: "accepted",
  });

  if (!collaboration) {
    throw new APIError(404, "Collaborator not found!");
  }

  await collaboration.deleteOne();

  return res
    .status(200)
    .json(new APIResponse(200, null, "Collaborator removed successfully!"));
});

const getAllInvitations = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const invitations = await PlaylistCollaborator.aggregatePaginate(
    PlaylistCollaborator.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id),
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },

      {
        $lookup: {
          from: "playlists",
          localField: "playlist",
          foreignField: "_id",
          as: "playlistDetails",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      avatar: 1,
                      fullName: 1,
                    },
                  },
                ],
              },
            },

            {
              $unwind: "$userDetails",
            },

            {
              $project: {
                name: 1,
                owner: 1,
                userDetails: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$playlistDetails",
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(200, invitations, "Invitations fetched successfully!")
    );
});

const getAllPendingInvitations = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const invitations = await PlaylistCollaborator.aggregatePaginate(
    PlaylistCollaborator.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id),
          status: "pending",
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },

      {
        $lookup: {
          from: "playlists",
          localField: "playlist",
          foreignField: "_id",
          as: "playlistDetails",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      avatar: 1,
                      fullName: 1,
                    },
                  },
                ],
              },
            },

            {
              $unwind: "$userDetails",
            },

            {
              $project: {
                name: 1,
                owner: 1,
                userDetails: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$playlistDetails",
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(200, invitations, "Invitations fetched successfully!")
    );
});

const getAllAcceptedInvitations = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const invitations = await PlaylistCollaborator.aggregatePaginate(
    PlaylistCollaborator.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id),
          status: "accepted",
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },

      {
        $lookup: {
          from: "playlists",
          localField: "playlist",
          foreignField: "_id",
          as: "playlistDetails",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      avatar: 1,
                      fullName: 1,
                    },
                  },
                ],
              },
            },

            {
              $unwind: "$userDetails",
            },

            {
              $project: {
                name: 1,
                owner: 1,
                userDetails: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$playlistDetails",
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(200, invitations, "Invitations fetched successfully!")
    );
});

const getAllSentInvitations = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const invitations = await PlaylistCollaborator.aggregatePaginate(
    PlaylistCollaborator.aggregate([
      {
        $match: {
          invitedBy: new mongoose.Types.ObjectId(req.user._id),
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },

      {
        $lookup: {
          from: "playlists",
          localField: "playlist",
          foreignField: "_id",
          as: "playlistDetails",
          pipeline: [
            {
              $project: {
                name: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$playlistDetails",
      },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
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
        $unwind: "$userDetails",
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        invitations,
        "Sent invitations fetched successfully!"
      )
    );
});

const getAllSentPendingInvitations = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const invitations = await PlaylistCollaborator.aggregatePaginate(
    PlaylistCollaborator.aggregate([
      {
        $match: {
          invitedBy: new mongoose.Types.ObjectId(req.user._id),
          status: "pending",
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },

      {
        $lookup: {
          from: "playlists",
          localField: "playlist",
          foreignField: "_id",
          as: "playlistDetails",
          pipeline: [
            {
              $project: {
                name: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$playlistDetails",
      },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
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
        $unwind: "$userDetails",
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        invitations,
        "Pending sent invitations fetched successfully!"
      )
    );
});

const getAllSentAcceptedInvitations = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new APIError(401, "Unauthorized request!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const invitations = await PlaylistCollaborator.aggregatePaginate(
    PlaylistCollaborator.aggregate([
      {
        $match: {
          invitedBy: new mongoose.Types.ObjectId(req.user._id),
          status: "accepted",
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },

      {
        $lookup: {
          from: "playlists",
          localField: "playlist",
          foreignField: "_id",
          as: "playlistDetails",
          pipeline: [
            {
              $project: {
                name: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$playlistDetails",
      },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
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
        $unwind: "$userDetails",
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        invitations,
        "Accepted sent invitations fetched successfully!"
      )
    );
});

const getAllCollaborators = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  if (!playlistId) {
    throw new APIError(400, "Playlist id is required!");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new APIError(400, "Invalid playlist id!");
  }

  const collaborators = await PlaylistCollaborator.aggregatePaginate(
    PlaylistCollaborator.aggregate([
      {
        $match: {
          playlist: new mongoose.Types.ObjectId(playlistId),
          status: "accepted",
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
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
        $unwind: "$userDetails",
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(200, collaborators, "Collaborators fetched successfully!")
    );
});

export {
  sendInvitation,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  getInvitationById,
  removeCollaborator,
  getAllInvitations,
  getAllPendingInvitations,
  getAllAcceptedInvitations,
  getAllSentInvitations,
  getAllSentPendingInvitations,
  getAllSentAcceptedInvitations,
  getAllCollaborators,
};