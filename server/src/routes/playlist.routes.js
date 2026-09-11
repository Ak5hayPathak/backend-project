import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  toggleVisibility,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isEmailVerified } from "../middlewares/emailVerification.middleware.js";
import { verifyPlaylistEditor } from "../middlewares/authPlaylist.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(isEmailVerified, createPlaylist);

router
  .route("/:playlistId")
  .get(getPlaylistById)
  .patch(isEmailVerified, verifyPlaylistEditor, updatePlaylist)
  .delete(isEmailVerified, deletePlaylist);

router
  .route("/add/:videoId/:playlistId")
  .patch(isEmailVerified, verifyPlaylistEditor, addVideoToPlaylist);
router
  .route("/remove/:videoId/:playlistId")
  .patch(isEmailVerified, verifyPlaylistEditor, removeVideoFromPlaylist);

router.route("/user/:userId").get(getUserPlaylists);
router.route("/:playlistId/visibility").patch(isEmailVerified, toggleVisibility);

export default router;
