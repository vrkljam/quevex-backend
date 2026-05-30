const Board = require("../models/Board");
const List = require("../models/List");

// @desc    Get all boards for the logged-in user
// @route   GET /api/boards
// @access  Private
const getBoards = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Query using the direct Mongoose _id property
    const boards = await Board.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new project board
// @route   POST /api/boards
// @access  Private

const createBoard = async (req, res) => {
  try {
    const { title, background } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Board title is required" });
    }

    // 1. SAFETY CHECK: Ensure the middleware actually found a logged-in user
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User profile not found." });
    }

    // 2. Safely extract the database ID string format
    // Since req.user is a Mongoose document, ._id is guaranteed to exist.
    const cleanUserId = req.user._id;

    const newBoard = new Board({
      title,
      background,
      userId: cleanUserId, // Pass the clean database ID directly
    });

    const savedBoard = await newBoard.save();
    res.status(201).json(savedBoard);
  } catch (error) {
    console.error("Error creating board:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a specific board with all its nested lists and cards populated
// @route   GET /api/boards/:id
// @access  Private
const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the board
    const board = await Board.findById(id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 2. SECURITY CHECK: Cleaned up to safely use Mongoose ._id properties
    const boardOwnerId = board.userId ? board.userId.toString() : "";
    const currentUserId = req.user?._id ? req.user._id.toString() : "";

    if (boardOwnerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Access denied. This is not your board." });
    }

    // 3. Fetch all lists belonging to this board
    const lists = await List.find({ boardId: id }).populate({
      path: "cards",
      match: { isArchived: false },
      options: { sort: { order: 1 } },
    });

    res.json({
      board,
      lists,
    });
  } catch (error) {
    console.error("Error fetching board by ID:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBoards,
  createBoard,
  getBoardById,
};
