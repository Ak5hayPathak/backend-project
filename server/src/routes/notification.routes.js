import { Router } from "express";

import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotifications,
} from "../controllers/notification.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isEmailVerified } from "../middlewares/emailVerification.middleware.js";

const router = Router();

// Protected routes
router.use(verifyJWT);

router.route("/").get(isEmailVerified, getUserNotifications);
router.route("/unread").get(isEmailVerified, getUnreadNotifications);
router.route("/read-all").patch(isEmailVerified, markAllNotificationsAsRead);
router.route("/:notificationId/read").patch(isEmailVerified, markNotificationAsRead);

export default router;
