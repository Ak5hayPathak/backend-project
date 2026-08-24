import { Router } from "express";

import {
  getUserNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.use(verifyJWT);

router.route("/").get(getUserNotifications);
router.route("/:notificationId/read").patch(markNotificationAsRead);

export default router;