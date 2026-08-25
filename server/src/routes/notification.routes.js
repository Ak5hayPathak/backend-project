import { Router } from "express";

import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotifications,
} from "../controllers/notification.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.use(verifyJWT);

router.route("/").get(getUserNotifications);
router.route("/unread").get(getUnreadNotifications);
router.route("/read-all").patch(markAllNotificationsAsRead);
router.route("/:notificationId/read").patch(markNotificationAsRead);

export default router;
