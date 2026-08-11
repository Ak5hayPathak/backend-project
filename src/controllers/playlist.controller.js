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

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new APIError(400, "Playlist id is required!");
  }

  if (!isValidObjectId(playlistId)) {
    throw new APIError(400, "Invalid playlist id!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  //   const playlistExists = await Playlist.findById(playlist);

  //   if(!playlistExists){
  //     throw new APIError(404, "Playlist not found!");
  //   }

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },

    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
      },
    },

    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videosDetails",
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

          {
            $sort: { createdAt: sortType === "asc" ? 1 : -1 },
          },

          {
            $skip: skip,
          },

          {
            $limit: limitNumber,
          },

          {
            $project: {
              title: 1,
              thumbnail: 1,
              createdAt: 1,
              userDetails: 1,
            },
          },
        ],
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerPlaylist",
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
      $addFields: {
        ownerPlaylist: {
          $first: "$ownerPlaylist",
        },
      },
    },
  ]);

  if (playlist.length === 0) {
    throw new APIError(404, "Playlist not found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "User playlist fetched successfully!")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new APIError(400, "User Id is required!");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "invalid user Id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new APIError(404, "User not found!");
  }

  const { page = 1, limit = 10 } = req.query;

  const playlists = await Playlist.aggregatePaginate(
    Playlist.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $lookup: {
          from: "videos",
          localField: "videos",
          foreignField: "_id",
          as: "videosDetails",
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
                title: 1,
                thumbnail: 1,
                description: 1,
                userDetails: 1,
              },
            },
          ],
        },
      },

      {
        $addFields: {
          totalVideos: {
            $size: "$videosDetails",
          },
        },
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (playlists.docs.length === 0) {
    throw new APIError(404, "No playlists found!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully!"));
});
