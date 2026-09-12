import { Router } from "express";

import {
  addSearchHistory,
  getSearchHistory,
  deleteSearchHistory,
  clearSearchHistory,
} from "../controllers/searchHistory.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(addSearchHistory).get(getSearchHistory);

router.route("/clear").delete(clearSearchHistory);

router
  .route("/:searchHistoryId")
  .delete(deleteSearchHistory);


export default router;