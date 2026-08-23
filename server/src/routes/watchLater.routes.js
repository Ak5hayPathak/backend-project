import { Router } from "express";
import {
  addToWatchLater,
  removeFromWatchLater,
  getWatchLaterVideos,
} from "../controllers/watchLater.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/").get(getWatchLaterVideos);
router.route("/add/:videoId").patch(addToWatchLater);
router.route("/remove/:videoId").patch(removeFromWatchLater);

export default router;
