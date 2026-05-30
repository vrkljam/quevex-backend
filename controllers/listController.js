const List = require("../models/List");
const Board = require("../models/Board");
const Card = require("../models/Card");

// @desc    Create a new column inside a board
// @route   POST /api/lists
// @access  Private
const createList = async (req, res) => {
  try {
    const { title, boardId } = req.body;

    if (!title || !boardId) {
      return res
        .status(400)
        .json({ message: "Title and Board ID are required" });
    }

    // Optional Safety Check: Ensure the board actually exists before attaching a list to it
    const boardExists = await Board.findById(boardId);
    if (!boardExists) {
      return res.status(404).json({ message: "Parent board not found" });
    }

    const newList = new List({
      title,
      boardId,
      cards: [], // Starts completely empty
    });

    const savedList = await newList.save();
    res.status(201).json(savedList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a column
// @route   DELETE /api/lists/:id
// @access  Private
// @desc    Delete a list and all its associated cards
// @route   DELETE /api/lists/:id
// @access  Private
const deleteList = async (req, res) => {
  try {
    const { id } = req.params;

    const list = await List.findById(id);
    if (!list) return res.status(404).json({ message: "List not found" });

    // Cascade delete: Wipe out all Card documents that lived in this column
    await Card.deleteMany({ listId: id });

    // Delete the list column itself
    await List.findByIdAndDelete(id);

    res.json({
      message: "List and its tasks deleted successfully",
      listId: id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createList,
  deleteList,
};
