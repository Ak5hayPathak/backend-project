import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateFiles,
  updateUserDetails,
  clearWatchHistory,
  removeVideoFromWatchHistory,
} from "../controllers/user.controller.js";
import {
  validateLoginUser,
  validateRegisterUser,
} from "../middlewares/validation.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },

    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  validateRegisterUser,
  registerUser
);

router.route("/login").post(validateLoginUser, loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateUserDetails);
router.route("/update-files").patch(
  verifyJWT,

  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },

    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),

  updateFiles
);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);
router.route("/history/clear").get(verifyJWT, clearWatchHistory);
router.route("/history/clear/:videoId").get(verifyJWT, removeVideoFromWatchHistory);

export default router;
