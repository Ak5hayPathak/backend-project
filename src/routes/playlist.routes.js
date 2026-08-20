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
import { verifyPlaylistEditor } from "../middlewares/authPlaylist.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist);

router
  .route("/:playlistId")
  .get(getPlaylistById)
  .patch(verifyPlaylistEditor, updatePlaylist)
  .delete(deletePlaylist);

router
  .route("/add/:videoId/:playlistId")
  .patch(verifyPlaylistEditor, addVideoToPlaylist);
router
  .route("/remove/:videoId/:playlistId")
  .patch(verifyPlaylistEditor, removeVideoFromPlaylist);

router.route("/user/:userId").get(getUserPlaylists);
router.route("/:playlistId/visibility").patch(toggleVisibility);

export default router;
