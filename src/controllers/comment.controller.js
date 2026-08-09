import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    throw new APIError(400, "Content is required!");
  }

  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const videoExists = await Video.findById(videoId);

  if (!videoExists) {
    throw new APIError(404, "Video not found");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new APIError(400, "Unauthorized request!");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });

  if (!comment) {
    throw new APIError(500, "Comment can't be created!");
  }

  const populatedComment = await comment.populate("owner", "username avatar");

  return res
    .status(201)
    .json(
      new APIResponse(201, populatedComment, "Comment created successfully!")
    );
});

const updateComment = asyncHandler(async (req, res) => {});

const deleteComment = asyncHandler(async (req, res) => {});

export { getVideoComments, addComment, updateComment, deleteComment };
