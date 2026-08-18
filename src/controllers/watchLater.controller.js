import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { WatchLater } from "../models/watchLater.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addToWatchLater = asyncHandler(async (req, res) => {

    if (!req.user) {
        throw new APIError(401, "Unauthorized request!");
    }

    const { videoId } = req.params;

    if (!videoId) {
        throw new APIError(400, "Video id is required!");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(404, "Video not found!");
    }

    const alreadyExists = await WatchLater.findOne({
        video: videoId,
        savedBy: req.user._id,
    });

    if (alreadyExists) {
        throw new APIError(400, "Video already exists in watch later!");
    }

    const watchLater = await WatchLater.create({
        video: videoId,
        savedBy: req.user._id,
    });

    if (!watchLater) {
        throw new APIError(500, "Video could not be added to watch later!");
    }

    return res
        .status(201)
        .json(new APIResponse(201, watchLater, "Video added to watch later successfully!"));

});

const removeFromWatchLater = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new APIError(401, "Unauthorized request!");
    }

    const { videoId } = req.params;

    if (!videoId) {
        throw new APIError(400, "Video id is required!");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id!");
    }


    const doesExist = await WatchLater.findOne({
        video: videoId,
        savedBy: req.user._id,
    });

    if (!doesExist) {
        throw new APIError(400, "Video does not exist in watch later!");
    }

    await doesExist.deleteOne();

    return res
        .status(200)
        .json(new APIResponse(200, null, "Video removed from watch later successfully!"));

});

const getWatchLaterVideos = asyncHandler(async (req, res) => {

    if (!req.user) {
        throw new APIError(401, "Unauthorized request!");
    }

    const { page = 1, limit = 10, sortType = "desc" } = req.query;

    const watchLaterVideos = await WatchLater.aggregatePaginate(
        WatchLater.aggregate([

            {
                $match: {
                    savedBy: new mongoose.Types.ObjectId(req.user._id),
                },
            },


            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "ownerDetails",
                            },
                        },

                        {
                            $unwind: "$ownerDetails",
                        },

                        {
                            $project: {
                                videoFile: 1,
                                title: 1,
                                thumbnail: 1,
                                views: 1,
                                ownerDetails: {
                                    username: 1,
                                    avatar: 1,
                                    fullName: 1,
                                },
                            },
                        },
                    ],
                },
            },

            {
                $unwind: "$videos",
            },

            {
                $sort: {
                    createdAt: sortType === "asc" ? 1 : -1,
                },
            },
            {
                $project: {
                    // Final cleanup
                    _id: 1,
                    videos: 1,
                },
            },

        ]),

        {
            page: Number(page),
            limit: Number(limit),
        }
    );


    if (watchLaterVideos.docs.length === 0) {
        throw new APIError(404, "No watch later videos found");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, watchLaterVideos, "watch later videos fetched successfully")
        );

});


