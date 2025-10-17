const { Server } = require("socket.io"); // import Server class
const Message = require("./models/Message");

module.exports = (server) => {
  // Create a new Socket.IO server attached to the HTTP server

  console.log("Hello");
  const io = new Server(server, { cors: { origin: "*" } });

  const onlineUsers = new Map(); // userId => socket.id

  io.on("connection", (socket) => {
    // console.log("A user connected", socket.id);

    // Track online user
    socket.on("login", (userId) => {
      try {
        onlineUsers.set(userId, socket.id);
        // console.log("Online users:", [...onlineUsers.keys()]);

        // 🔴 Broadcast online users list to everyone
        io.emit("updateOnlineUsers", [...onlineUsers.keys()]);
      } catch (err) {
        console.error("Error tracking online user:", err);
      }
    });

    // Handle sending message
    socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
      try {
        // Save to DB
        // console.log("creating msg", { senderId, receiverId, text });

        console.log("Creating message:", { senderId, receiverId, text });
        const msg = await Message.create({ senderId, receiverId, text });

        // Send to receiver if online
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket).emit("receiveMessage", msg);
        }

        // Confirm to sender
        socket.emit("messageSent", msg);
      } catch (err) {
        console.error("Error saving message:", err);
      }
    });

    socket.on("editMessage", ({ messageId, newText }) => {
      // update in DB
      Message.findByIdAndUpdate(
        messageId,
        { text: newText },
        { new: true }
      ).then((updated) => {
        io.to(updated.receiverId.toString()).emit("messageEdited", updated);
        io.to(updated.senderId.toString()).emit("messageEdited", updated);
      });
    });

    // Delete message
    socket.on("deleteMessage", ({ messageId }) => {
      Message.findByIdAndDelete(messageId).then((deleted) => {
        if (deleted) {
          io.to(deleted.receiverId.toString()).emit(
            "messageDeleted",
            deleted._id
          );
          io.to(deleted.senderId.toString()).emit(
            "messageDeleted",
            deleted._id
          );
        }
      });
    });

    // Unsend (same as delete but both sides)
    socket.on("unsendMessage", ({ messageId }) => {
      Message.findByIdAndDelete(messageId).then((deleted) => {
        if (deleted) {
          io.to(deleted.receiverId.toString()).emit(
            "messageUnsent",
            deleted._id
          );
          io.to(deleted.senderId.toString()).emit("messageUnsent", deleted._id);
        }
      });
    });

    socket.on("disconnect", () => {
      for (let [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          // console.log(`User ${userId} disconnected`);

          // 🔴 Broadcast updated list after removal
          io.emit("updateOnlineUsers", [...onlineUsers.keys()]);
          break;
        }
      }
    });
  });
};
