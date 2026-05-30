const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getBoards,
  createBoard,
  getBoardById,
} = require("../controllers/boardController");

// GET ALL BOARDS
router.get("/", protect, getBoards);

// CREATE NEW BOARD
router.post("/", protect, createBoard);

// GET SPECIFIC BOARD BY ID (Matches /api/boards/123456...)
router.get("/:id", protect, getBoardById);

module.exports = router;
