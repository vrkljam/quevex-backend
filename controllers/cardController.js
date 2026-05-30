const Card = require("../models/Card");
const List = require("../models/List");
const Board = require("../models/Board");

// @desc    Create a new card inside a list
// @route   POST /api/cards
// @access  Private
const createCard = async (req, res) => {
  try {
    const { title, description, listId, boardId } = req.body;

    if (!title || !listId || !boardId) {
      return res
        .status(400)
        .json({ message: "Title, List ID, and Board ID are all required" });
    }

    // 1. Find the parent board
    const targetBoard = await Board.findById(boardId);

    // 2. FIXED SECURITY CHECK: Safely compare string versions of the ObjectIds
    const boardOwnerId = targetBoard?.userId
      ? targetBoard.userId.toString()
      : "";
    const currentUserId = req.user?._id ? req.user._id.toString() : "";

    if (!targetBoard || boardOwnerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Unauthorized action on this board." });
    }

    const parentList = await List.findById(listId);
    if (!parentList) {
      return res.status(404).json({ message: "Target list not found" });
    }

    const orderPosition = parentList.cards.length;

    const newCard = new Card({
      title,
      description,
      listId,
      boardId,
      order: orderPosition,
    });

    const savedCard = await newCard.save();

    parentList.cards.push(savedCard._id);
    await parentList.save();

    res.status(201).json(savedCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update card properties (e.g. description, title)
// @route   PUT /api/cards/:id
// @access  Private
const updateCard = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the card first and populate its parent board details
    const card = await Card.findById(id).populate("boardId");

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // 2. SECURITY CHECK: Compare the board owner's ID to the logged-in user's ID
    const boardOwnerId = card.boardId?.userId
      ? card.boardId.userId.toString()
      : "";
    const currentUserId = req.user?._id ? req.user._id.toString() : "";

    if (boardOwnerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Unauthorized action on this card." });
    }

    // 3. If security passes, perform the update
    const updatedCard = await Card.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    res.json(updatedCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Handle card re-ordering within a list or between different lists
// @route   POST /api/cards/reorder
// @access  Private
const reorderCards = async (req, res) => {
  try {
    const {
      cardId,
      sourceListId,
      destinationListId,
      sourceIndex,
      destinationIndex,
    } = req.body;

    if (!cardId || !sourceListId || !destinationListId) {
      return res
        .status(400)
        .json({ message: "Missing required reorder data parameters" });
    }
    // SECURITY CHECK: Verify the card being moved actually belongs to a board owned by this user
    const targetCard = await Card.findById(cardId).populate("boardId");
    const boardOwnerId = targetCard?.boardId?.userId
      ? targetCard.boardId.userId.toString()
      : "";
    const currentUserId = req.user?._id ? req.user._id.toString() : "";

    if (!targetCard || boardOwnerId !== currentUserId) {
      return res.status(403).json({ message: "Unauthorized reorder action." });
    }

    // SCENARIO A: Moving a card within the SAME column
    if (sourceListId === destinationListId) {
      const list = await List.findById(sourceListId);
      if (!list) return res.status(404).json({ message: "List not found" });

      // Rearrange the IDs inside the array locally
      // 1. Remove the card ID from its original position
      const [movedCardId] = list.cards.splice(sourceIndex, 1);
      // 2. Insert it back into its new drop position index
      list.cards.splice(destinationIndex, 0, movedCardId);

      await list.save();

      // 3. Optional: Bulk update the 'order' field on the actual Card documents
      // This keeps our database fields synchronized with the list array
      const updatePromises = list.cards.map((id, index) => {
        return Card.findByIdAndUpdate(id, { order: index });
      });
      await Promise.all(updatePromises);

      return res.json({
        message: "Card reordered within list successfully",
        list,
      });
    }

    // SCENARIO B: Moving a card to a DIFFERENT column
    // 1. Pull the card out of the source list's array
    const sourceList = await List.findById(sourceListId);
    if (!sourceList)
      return res.status(404).json({ message: "Source list not found" });
    sourceList.cards.splice(sourceIndex, 1);
    await sourceList.save();

    // 2. Push the card into the destination list's array at the exact dropped index
    const destList = await List.findById(destinationListId);
    if (!destList)
      return res.status(404).json({ message: "Destination list not found" });
    destList.cards.splice(destinationIndex, 0, cardId);
    await destList.save();

    // 3. Update the listId pointer on the moved Card document itself
    await Card.findByIdAndUpdate(cardId, { listId: destinationListId });

    // 4. Clean up order indexes across both modified columns
    const sourcePromises = sourceList.cards.map((id, index) =>
      Card.findByIdAndUpdate(id, { order: index }),
    );
    const destPromises = destList.cards.map((id, index) =>
      Card.findByIdAndUpdate(id, { order: index }),
    );
    await Promise.all([...sourcePromises, ...destPromises]);

    res.json({ message: "Card moved between lists successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Private
const deleteCard = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the card and populate its parent board details
    const card = await Card.findById(id).populate("boardId");

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // 2. SECURITY CHECK: Verify the logged-in user owns the board this card lives on
    const boardOwnerId = card.boardId?.userId
      ? card.boardId.userId.toString()
      : "";
    const currentUserId = req.user?._id ? req.user._id.toString() : "";

    if (boardOwnerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Unauthorized action on this card." });
    }

    // 3. Remove its reference from the parent List array
    await List.findByIdAndUpdate(card.listId, { $pull: { cards: id } });

    // 4. Delete the card document itself
    await Card.findByIdAndDelete(id);

    res.json({
      message: "Card deleted successfully",
      cardId: id,
      listId: card.listId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Archive an individual card (Soft Delete)
// @route   PATCH /api/cards/:id/archive
// @access  Private
const archiveCard = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the card and populate its parent board details
    const card = await Card.findById(id).populate("boardId");

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // 2. SECURITY CHECK: Ensure the logged-in user owns this board workspace
    const boardOwnerId = card.boardId?.userId
      ? card.boardId.userId.toString()
      : "";
    const currentUserId = req.user?._id ? req.user._id.toString() : "";

    if (boardOwnerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Unauthorized action on this card." });
    }

    // 3. Set archive flag to true
    card.isArchived = true;
    await card.save();

    res.json({
      message: "Card archived successfully",
      cardId: id,
      listId: card.listId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all archived cards for a specific board (The Archive View Safety Net)
// @route   GET /api/cards/board/:boardId/archived
// @access  Private
const getArchivedCardsByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;

    // 1. Double check board ownership first before fetching cards
    const targetBoard = await Board.findById(boardId);

    if (!targetBoard) {
      return res.status(404).json({ message: "Workspace board not found." });
    }

    const boardOwnerId = targetBoard.userId
      ? targetBoard.userId.toString()
      : "";
    const currentUserId = req.user?._id ? req.user._id.toString() : "";

    if (boardOwnerId !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Unauthorized access to these archives." });
    }

    // 2. Query all cards matching this board ID that are explicitly flagged as archived
    // Populating 'listId' is useful so the frontend can display which list column it used to live in!
    const archivedCards = await Card.find({ boardId, isArchived: true })
      .populate("listId", "title")
      .sort({ updatedAt: -1 }); // Show recently archived first

    res.json(archivedCards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add to your module.exports at the bottom

module.exports = {
  createCard,
  updateCard,
  reorderCards,
  deleteCard,
  archiveCard,
  getArchivedCardsByBoard,
};
