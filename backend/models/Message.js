// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // reference to User collection
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    // Optional fields
    status: {
      type: String,
      enum: ["sent", "delivered", "read"], // ✅ 3 states
      default: "sent",
    },
    attachments: [
      {
        type: String, // could be file/image URLs
      },
    ],
    edited: { type: Boolean, default: false }, // if message was edited
    deletedFor: [String], // list of userIds who deleted for self
    unsent: { type: Boolean, default: false }, // if message was unsent for everyone
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

module.exports = mongoose.model("Message", messageSchema);
