import { Router } from "express";

import {
  sendInvitation,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  getInvitationById,
  removeCollaborator,
  getAllInvitations,
  getAllPendingInvitations,
  getAllAcceptedInvitations,
  getAllSentInvitations,
  getAllSentPendingInvitations,
  getAllSentAcceptedInvitations,
  getAllCollaborators,
} from "../controllers/playlistCollaborator.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.use(verifyJWT);

// Get all collaborators
router.route("/playlist/:playlistId/collaborators").get(getAllCollaborators);


// Invitation actions
router.route("/playlist/:playlistId/invite/:userId").post(sendInvitation);
router.route("/invitation/:invitationId/accept").patch(acceptInvitation);
router.route("/invitation/:invitationId/reject").delete(rejectInvitation);
router.route("/invitation/:invitationId/cancel").delete(cancelInvitation);
router.route("/invitation/:invitationId").get(getInvitationById);

// Collaborator actions
router
  .route("/playlist/:playlistId/collaborator/:userId")
  .delete(removeCollaborator);

// Received invitations
router.route("/invitations").get(getAllInvitations);
router.route("/invitations/pending").get(getAllPendingInvitations);
router.route("/invitations/accepted").get(getAllAcceptedInvitations);

// Sent invitations
router.route("/invitations/sent").get(getAllSentInvitations);
router.route("/invitations/sent/pending").get(getAllSentPendingInvitations);
router.route("/invitations/sent/accepted").get(getAllSentAcceptedInvitations);

export default router;
