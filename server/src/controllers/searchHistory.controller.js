import { SearchHistory } from "../models/searchHistory.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";

const addSearchHistory = asyncHandler(async (req, res) => {
  let { query } = req.body;

  if (!query?.trim()) {
    throw new APIError(400, "Search query is required!");
  }

  query = query.trim();

  const searchHistory = await SearchHistory.findOneAndUpdate(
    {
      user: req.user._id,
      query: query.toLowerCase(),
    },
    {
      $set: {
        searchedAt: new Date(),
      },
      $setOnInsert: {
        user: req.user._id,
        query: query.toLowerCase(),
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        searchHistory,
        "Search history saved successfully!"
      )
    );
});

const getSearchHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await SearchHistory.aggregatePaginate(
    SearchHistory.aggregate([
      {
        $match: {
          user: req.user._id,
        },
      },
      {
        $sort: {
          searchedAt: -1,
        },
      },
      {
        $project: {
          query: 1,
          searchedAt: 1,
        },
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
        result,
        "Search history fetched successfully!"
      )
    );
});

const deleteSearchHistory = asyncHandler(async (req, res) => {
  const { searchHistoryId } = req.params;

  const deletedSearch = await SearchHistory.findOneAndDelete({
    _id: searchHistoryId,
    user: req.user._id,
  });

  if (!deletedSearch) {
    throw new APIError(404, "Search history not found!");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        deletedSearch,
        "Search history deleted successfully!"
      )
    );
});

const clearSearchHistory = asyncHandler(async (req, res) => {
  await SearchHistory.deleteMany({
    user: req.user._id,
  });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        {},
        "Search history cleared successfully!"
      )
    );
});

export {
  addSearchHistory,
  getSearchHistory,
  deleteSearchHistory,
  clearSearchHistory,
};