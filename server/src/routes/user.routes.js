import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  verifyEmail,
  resendVerificationEmail,
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
import { isEmailVerified } from "../middlewares/emailVerification.middleware.js";

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
router.route("/change-password").post(verifyJWT, isEmailVerified, changePassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/resend-verification-email").post(verifyJWT, resendVerificationEmail);
router.route("/update-account").patch(verifyJWT, isEmailVerified, updateUserDetails);
router.route("/update-files").patch(
  verifyJWT,
  isEmailVerified,

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
router.route("/history/clear").get(verifyJWT, isEmailVerified,  clearWatchHistory);
router
  .route("/history/clear/:videoId")
  .get(verifyJWT,isEmailVerified,  removeVideoFromWatchHistory);

export default router;
