import { Router } from "express";
import {
  getSubscribedChannels,
  getChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isEmailVerified } from "../middlewares/emailVerification.middleware.js";

const router = Router();
router.use(verifyJWT, isEmailVerified); // Apply verifyJWT middleware to all routes in this file

router.route("/c/:channelId").post(toggleSubscription);
router.route("/s/:channelId").get(getChannelSubscribers);
router.route("/u/:userId").get(getSubscribedChannels);

export default router;
