const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const { createList, deleteList } = require("../controllers/listController");

// CREATE NEW LIST (COLUMN)
router.post("/", protect, createList);

// DELETE A LIST
router.delete("/:id", protect, deleteList);

module.exports = router;
