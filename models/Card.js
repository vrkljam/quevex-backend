const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "List",
      required: true,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    order: {
      type: Number,
      default: 0, // Used to sort cards within the same column
    },
    // NEW CODE HERE: Stores an array of colors chosen for this card (e.g., ["#eb5a46", "#61bd4f"])
    tags: {
      type: [String],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Card", cardSchema);
