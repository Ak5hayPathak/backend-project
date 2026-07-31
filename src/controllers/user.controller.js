import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";
import { APIError } from "../utils/APIError.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const options = {
  httpOnly: true,
  secure: true,
};

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new APIError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new APIError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, phone, password } = req.body;

  //console.log("email: ", email);

  if (
    [fullName, email, username, phone, password].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new APIError(400, "All fields are required!");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new APIError(409, "User with email or username already exists");
  }

  //console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is required!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new APIError(400, "Avatar file is required!");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new APIError(500, "Something went wrong while registring the user");
  }

  return res
    .status(201)
    .json(new APIResponse(201, createdUser, "User Registered Successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new APIError(400, "Username or email is required!");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new APIError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new APIError(404, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APIResponse(
        200,
        {
          user: loggedinUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new APIError(401, "Unauthorized request");
  }

  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new APIError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new APIError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user?._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new APIResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid Refresh Token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new APIError(400, "All fields are mandatory!");
  }

  if (oldPassword === newPassword) {
    throw new APIError(400, "New password cannot be same as the old password");
  }

  if (confirmPassword !== newPassword) {
    throw new APIError(
      400,
      "Confirm password must be same as the new passoword"
    );
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new APIError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new APIError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new APIResponse(200, req.user, "User fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { username, email, fullName } = req.body;

  if (!username && !email && !fullName) {
    throw new APIError(400, "At least one field is required!");
  }

  const updateFields = {};

  if (fullName) updateFields.fullName = fullName.trim();

  if (email) {
    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingUser) {
      throw new APIError(400, "Email already exists");
    }

    updateFields.email = email.trim().toLowerCase();
  }

  if (username) {
    const existingUser = await User.findOne({
      username: username.trim().toLowerCase(),
    });

    if (existingUser) {
      throw new APIError(400, "Username already exists");
    }

    updateFields.username = username.trim().toLowerCase();
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: updateFields,
    },

    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new APIResponse(200, user, "Account details updated successfully"));
});

const updateFiles = asyncHandler(async (req, res) => {
  if (!req.files) throw new APIError(400, "Files are missing");

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!(avatarLocalPath || coverImageLocalPath)) {
    throw new APIError(400, "At least one file is required!");
  }

  const updateFields = {};

  if (avatarLocalPath) {
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
      // !avatar?.url because if uploadOnCloudinary() returns null, then avatar.url throws:
      // "Cannot read properties of null"

      throw new APIError(400, "Error while uploading on avatar");
    }

    updateFields.avatar = avatar.url;
  }

  if (coverImageLocalPath) {
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage?.url) {
      throw new APIError(400, "Error while uploading on cover image");
    }

    updateFields.coverImage = coverImage.url;
  }

  let user = await User.findById(req.user._id);

  if(!user){
    throw new APIError(404, "User not found");
  }

  const oldAvatar = user.avatar;
  const oldcoverImg = user.coverImage;
  
  user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: updateFields,
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new APIError(404, "User not found");
  }

  
  return res
    .status(200)
    .json(new APIResponse(200, user, "File(s) updated successfully!"));
});

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new APIResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new APIResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  updateUserDetails,
  getCurrentUser,
  updateFiles,
  getUserChannelProfile,
  getWatchHistory
};