import mongoose, { Schema } from "mongoose";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    // Video content
    videoFile: {
      type: String, // Backblaze URL
    },

    thumbnail: {
      type: String, // Cloudinary URL
    },

    // Video metadata
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    tags: {
      type: [String],
      default: [],
    },

    duration: {
      type: Number,
    },

    qualities: {
      type: [String],
    },

    // Video statistics
    views: {
      type: Number,
      default: 0,
    },

    // Publishing
    isPublished: {
      type: Boolean,
      default: true,
    },

    // Ownership
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Processing
    processingStatus: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.index(
  {
    title: "text",
    description: "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      tags: 7,
      description: 3,
    },
    name: "video_search_index",
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
