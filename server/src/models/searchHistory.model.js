import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    query: {
      type: String,
      required: true,
      trim: true,
    },

    searchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// A user should have only one entry for the same search query.
searchHistorySchema.index(
  { user: 1, query: 1 },
  { unique: true }
);

// Useful when retrieving recent searches.
searchHistorySchema.index({
  user: 1,
  searchedAt: -1,
});

export const SearchHistory = mongoose.model(
  "SearchHistory",
  searchHistorySchema
);