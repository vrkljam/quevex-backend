const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createCard,
  updateCard,
  reorderCards,
  deleteCard,
  archiveCard,
  getArchivedCardsByBoard,
} = require("../controllers/cardController");

// CREATE NEW CARD
router.post("/", protect, createCard);

// UPDATE CARD DETAILS
router.put("/:id", protect, updateCard);

// REORDER OR TRANSFER CARDS (Matches /api/cards/reorder)
router.post("/reorder", protect, reorderCards);

router.delete("/:id", protect, deleteCard);

// NEW ARCHIVAL PATHS
// Flipped to PATCH for partial document property updates
router.patch("/:id/archive", protect, archiveCard);

// Target fetch for viewing the repository panel inside a board canvas
router.get("/board/:boardId/archived", protect, getArchivedCardsByBoard);
module.exports = router;
