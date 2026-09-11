import { Router } from "express";
import {
  getLikedVideos,
  getLikedTweets,
  toggleCommentLike,
  toggleVideoLike,
  toggleTweetLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isEmailVerified } from "../middlewares/emailVerification.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/v/:videoId").post(isEmailVerified, toggleVideoLike);
router.route("/toggle/c/:commentId").post(isEmailVerified, toggleCommentLike);
router.route("/toggle/t/:tweetId").post(isEmailVerified, toggleTweetLike);
router.route("/videos").get(isEmailVerified, getLikedVideos);
router.route("/tweets").get(isEmailVerified, getLikedTweets);

export default router;
