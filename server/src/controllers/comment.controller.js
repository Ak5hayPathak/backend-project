import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Notification } from "../models/notification.model.js";
import { getSocketIO } from "../sockets/socket.manager.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new APIError(400, "Video id is required!");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new APIError(404, "Video not found or access denied!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const comments = await Comment.aggregatePaginate(
    Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
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
                _id: 1,
                username: 1,
                avatar: 1,
                fullName: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$ownerDetails",
      },

      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "comment",
          as: "likes",
        },
      },

      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
          isLiked: {
            $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"],
          },
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (comments.docs.length === 0) {
    // comments.docs.length because aggregatePaginate() normally returns
    // a pagination object, not a plain array
    throw new APIError(404, "No comments found on this video");
  }

  return res
    .status(200)
    .json(new APIResponse(200, comments, "Comments fetched successfully!"));
});

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

  const notification = await Notification.create({
    recipient: videoExists.owner,
    sender: userId,
    type: "video_comment",
    message: `${req.user.username} commented on your video`,
    resource: comment._id,
  });

  const io = getSocketIO();

  io.to(`userId:${videoExists.owner}`).emit("notification", notification);

  return res
    .status(201)
    .json(
      new APIResponse(201, populatedComment, "Comment created successfully!")
    );
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) {
    throw new APIError(400, "Comment or reply id is required!");
  }

  if (!mongoose.isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment or reply id!");
  }

  if (!content?.trim()) {
    throw new APIError(400, "Content is required!");
  }

  // Works for both top-level comments and replies
  const comment = await Comment.findOne({
    _id: commentId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new APIError(404, "Comment or reply not found or access denied!");
  }

  comment.content = content.trim();
  comment.isEdited = true;

  await comment.save();

  return res
    .status(200)
    .json(
      new APIResponse(200, comment, "Comment or reply updated successfully!")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new APIError(400, "Comment id is required!");
  }

  if (!mongoose.isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment id!");
  }

  const comment = await Comment.findOne({
    _id: commentId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new APIError(404, "Comment or reply not found or access denied!");
  }

  const [commentWithReplies] = await Comment.aggregate([
    {
      $match: {
        _id: comment._id,
      },
    },
    {
      $graphLookup: {
        from: "comments",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentComment",
        as: "replies",
      },
    },
  ]);

  const commentIdsToDelete = [
    comment._id,
    ...commentWithReplies.replies.map((reply) => reply._id), //returns an array of reply ids that is destructured
  ];

  await Comment.deleteMany({
    _id: {
      $in: commentIdsToDelete,
    },
  });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        null,
        "Comment and all its replies deleted successfully!"
      )
    );
});

const addReply = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;

  if (!content?.trim()) {
    throw new APIError(400, "Content is required!");
  }

  if (!commentId) {
    throw new APIError(400, "Comment id is required!");
  }

  if (!mongoose.isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment id!");
  }

  // Find the comment/reply being replied to
  const parentComment = await Comment.findById(commentId);

  if (!parentComment) {
    throw new APIError(404, "Comment not found!");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new APIError(401, "Unauthorized request!");
  }

  // A reply is simply another Comment with a parentComment
  const reply = await Comment.create({
    content: content.trim(),
    video: parentComment.video,
    owner: userId,
    parentComment: parentComment._id,
  });

  if (!reply) {
    throw new APIError(500, "Reply can't be created!");
  }

  const populatedReply = await reply.populate(
    "owner",
    "username avatar fullName"
  );

  // Don't send a notification when replying to yourself
  if (parentComment.owner.toString() !== userId.toString()) {
    const notification = await Notification.create({
      recipient: parentComment.owner,
      sender: userId,
      type: "comment_reply",
      message: `${req.user.username} replied to your comment`,
      resource: reply._id,
    });

    const io = getSocketIO();

    io.to(`userId:${parentComment.owner.toString()}`).emit(
      "notification",
      notification
    );
  }

  return res
    .status(201)
    .json(new APIResponse(201, populatedReply, "Reply created successfully!"));
});

const getReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new APIError(400, "Comment id is required!");
  }

  if (!mongoose.isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment id!");
  }

  // This can be either a top-level comment or a reply
  const parentComment = await Comment.findById(commentId);

  if (!parentComment) {
    throw new APIError(404, "Comment not found!");
  }

  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  const replies = await Comment.aggregatePaginate(
    Comment.aggregate([
      {
        $match: {
          parentComment: new mongoose.Types.ObjectId(commentId),
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
                _id: 1,
                username: 1,
                avatar: 1,
                fullName: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: "$ownerDetails",
      },

      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "comment",
          as: "likes",
        },
      },

      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
          isLiked: {
            $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"],
          },
        },
      },

      {
        $sort: {
          createdAt: sortType === "asc" ? 1 : -1,
        },
      },
    ]),
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  if (replies.docs.length === 0) {
    throw new APIError(404, "No replies found!");
  }

  return res
    .status(200)
    .json(new APIResponse(200, replies, "Replies fetched successfully!"));
});

export { getVideoComments, addComment, updateComment, deleteComment, addReply, getReplies };
