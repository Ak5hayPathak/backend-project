import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  let { content } = req.body;

  if (!content) {
    throw new APIError(400, "Tweet is required");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new APIError(401, "Unauthorized Request!");
  }

  const tweet = await Tweet.create({
    content,
    owner: userId
  });

  return res
  .status(201)
  .json(new APIResponse(201, tweet, "Tweet created Successfully"));
});

const getUserTweet = asyncHandler(async (req, res) => {
    const {userId} = req.body;

    if(!mongoose.isValidObjectId(userId)){
        throw new ApiError(400, "Invalid User ID");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(userId)
            },
        },

        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },

        {
            $unwind: "$ownerDetails"
        },

        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    if(tweets.length === 0){
        throw new APIError(404, "No tweets found for this user");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {});

const deleteTweet = asyncHandler(async (req, res) => {});

export { createTweet, getUserTweet, updateTweet, deleteTweet };
