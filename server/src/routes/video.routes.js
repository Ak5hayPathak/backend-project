import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  streamVideo,
  streamHLSFile,
  createStreamToken,
} from "../controllers/video.controller.js";
import {
  verifyJWT,
  verifyStreamToken,
} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { isEmailVerified } from "../middlewares/emailVerification.middleware.js";

const router = Router();
// router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
  .route("/")
  .get(verifyJWT, getAllVideos)
  .post(
    verifyJWT,
    isEmailVerified,
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishAVideo
  );

router
  .route("/:videoId")
  .get(verifyJWT, getVideoById)
  .delete(verifyJWT, isEmailVerified, deleteVideo)
  .patch(verifyJWT, isEmailVerified, upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(verifyJWT,isEmailVerified, togglePublishStatus);

router.route("/:videoId/stream-token").post(verifyJWT, createStreamToken);

router.route("/:videoId/stream").get(verifyJWT, streamVideo);
router.route("/stream/{*hlsPath}").get(verifyStreamToken, streamHLSFile);

export default router;
