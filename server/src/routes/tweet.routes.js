import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isEmailVerified } from "../middlewares/emailVerification.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(isEmailVerified, createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(isEmailVerified, updateTweet).delete(isEmailVerified, deleteTweet);

export default router;
