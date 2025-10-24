const { Server } = require("socket.io");
const Message = require("./models/Message");

module.exports = (server) => {
  const io = new Server(server, { cors: { origin: "*" } });
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    socket.on("login", (userId) => {
      try {
        onlineUsers.set(userId, socket.id);
        io.emit("updateOnlineUsers", [...onlineUsers.keys()]);
      } catch (err) {
        console.error("Error tracking online user:", err);
      }
    });

    // ✅ Correct sendMessage handler
    //not working, not sure of the reason
    socket.on("sendMessage", async (payload, ack) => {
      try {
        console.log("sendMessage received on server:", payload);
        const { localId, senderId, receiverId, text } = payload || {};
        if (!senderId || !receiverId || !text) {
          if (typeof ack === "function") ack({ error: "Invalid payload" });
          return;
        }

        // Save message to DB
        const msg = await Message.create({
          senderId,
          receiverId,
          text,
          status: "sent",
        });

        console.log("Message saved to DB:", msg);

        // Emit to receiver if online
        const receiverSocketId = onlineUsers.get(String(receiverId));
        if (receiverSocketId) {
          console.log("Emitting message to receiver:", receiverSocketId);
          io.to(receiverSocketId).emit("receiveMessage", msg);
        }

        // Acknowledge sender
        if (typeof ack === "function") ack({ message: msg, localId });
        socket.emit("messageSent", { ...msg.toObject(), localId });
      } catch (err) {
        console.error("Error in sendMessage handler:", err);
        if (typeof ack === "function")
          ack({ error: err.message || "save failed" });
      }
    });

    socket.on("messageDelivered", async ({ messageId }) => {
      try {
        console.log("Marking message as delivered:", messageId);
        const updated = await Message.findByIdAndUpdate(
          messageId,
          { status: "delivered" },
          { new: true }
        );
        if (!updated) return;
        const senderSocket = onlineUsers.get(String(updated.senderId));
        if (senderSocket)
          io.to(senderSocket).emit("messageStatus", {
            messageId: updated._id,
            status: "delivered",
          });
      } catch (err) {
        console.error("messageDelivered handler error:", err);
      }
    });

    socket.on("messageRead", async ({ messageId }) => {
      try {
        const updated = await Message.findByIdAndUpdate(
          messageId,
          { status: "read" },
          { new: true }
        );
        if (!updated) return;
        const senderSocket = onlineUsers.get(String(updated.senderId));
        if (senderSocket)
          io.to(senderSocket).emit("messageStatus", {
            messageId: updated._id,
            status: "read",
          });
      } catch (err) {
        console.error("messageRead handler error:", err);
      }
    });

    socket.on("editMessage", ({ messageId, newText }) => {
      console.log("Editing message:", messageId, newText);
      Message.findByIdAndUpdate(
        messageId,
        { text: newText },
        { new: true }
      ).then((updated) => {
        io.to(updated.receiverId.toString()).emit("messageEdited", updated);
        io.to(updated.senderId.toString()).emit("messageEdited", updated);
      });
    });

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
          io.emit("updateOnlineUsers", [...onlineUsers.keys()]);
          break;
        }
      }
    });
  });
};
