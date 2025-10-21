import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

export default function Chat({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  // initialize socket once
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    const sock = socketRef.current;

    // send login when connected
    sock.on("connect", () => {
      if (user && user.userId) sock.emit("login", user.userId);
    });

    // online users list
    sock.on("updateOnlineUsers", (online) => {
      setOnlineUsers(online || []);
    });

    // server confirms saved message -> replace local placeholder (if any)
    sock.on("messageSent", (serverMsg) => {
      setMessages((prev) =>
        prev.map((m) =>
          // match by text + sender + receiver + createdAt if available, otherwise fall back to keep as-is
          (!m._id &&
            m.text === serverMsg.text &&
            m.senderId === serverMsg.senderId &&
            m.receiverId === serverMsg.receiverId)
            ? serverMsg
            : m
        )
      );
    });

    sock.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    sock.on("messageEdited", (payload) => {
      const updated = payload && payload._id ? payload : null;
      if (updated) {
        setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      }
    });

    sock.on("messageDeleted", (payload) => {
      const id = typeof payload === "string" ? payload : payload && (payload._id || payload.messageId || payload.id);
      if (!id) return;
      setMessages((prev) => prev.filter((m) => m._id !== id));
    });

    sock.on("messageDeletedForMe", ({ messageId }) => {
      if (!messageId) return;
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    return () => {
      sock.off("connect");
      sock.off("updateOnlineUsers");
      sock.off("messageSent");
      sock.off("receiveMessage");
      sock.off("messageEdited");
      sock.off("messageDeleted");
      sock.off("messageDeletedForMe");
      sock.disconnect();
    };
  }, [user?.userId]);

  // Fetch all users except self
  useEffect(() => {
    fetch("http://localhost:5000/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers((data || []).filter((u) => u._id !== user.userId));
      })
      .catch(console.error);
  }, [user.userId]);

  // Load chat history with selected user and normalize _id
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    fetch(
      `http://localhost:5000/api/auth/messages/${user.userId}/${selectedUser._id}`
    )
      .then((res) => res.json())
      .then((data) => {
        const msgs = (data.messages || []).map((m) => ({ ...m, _id: m._id || m.id }));
        setMessages(msgs);
      })
      .catch(console.error);
  }, [selectedUser, user.userId]);

  const sendMessage = () => {
    if (!input || !selectedUser) return;

    // optimistic local message (no _id) so the UI shows it instantly
    const placeholder = {
      _id: `local-${Date.now()}`,
      senderId: user.userId,
      receiverId: selectedUser._id,
      text: input,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, placeholder]);

    socketRef.current?.emit("sendMessage", {
      senderId: user.userId,
      receiverId: selectedUser._id,
      text: input,
    });

    setInput("");
  };

  const handleEdit = (m) => {
    const newText = prompt("Edit message:", m.text);
    if (!newText || newText === m.text) return;
    // optimistic update locally
    setMessages((prev) => prev.map((msg) => (msg._id === m._id ? { ...msg, text: newText, edited: true } : msg)));
    socketRef.current?.emit("editMessage", { messageId: m._id, newText });
  };

  const handleDelete = (m) => {
    // optimistic remove from UI immediately
    setMessages((prev) => prev.filter((msg) => msg._id !== m._id));
    socketRef.current?.emit("deleteMessage", { messageId: m._id });
  };

  const handleDeleteForMe = (m) => {
    // remove locally and inform server
    setMessages((prev) => prev.filter((msg) => msg._id !== m._id));
    socketRef.current?.emit("deleteMessageForMe", { messageId: m._id, userId: user.userId });
  };

  const goToProfile = () => {
    window.location.href = "/profile";
  };

  return (
    <div style={{ display: "flex", flex: 1 }}>
      {/* User List */}
      <div style={{ width: 200, borderRight: "1px solid gray" }}>
        <h3>Users</h3>
        {users.map((u) => (
          <div
            key={u._id}
            style={{
              cursor: "pointer",
              padding: 5,
              background: selectedUser && selectedUser._id === u._id ? "#eee" : "",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onClick={() => setSelectedUser(u)}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: Array.isArray(onlineUsers) ? (onlineUsers.includes(u._id) ? "green" : "gray") : "gray",
                display: "inline-block",
              }}
            />
            {u.username}
          </div>
        ))}
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, padding: 10 }}>
        <h2>{selectedUser ? selectedUser.username : "..."}</h2>
        <div
          style={{
            height: 300,
            overflowY: "scroll",
            border: "1px solid gray",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={m._id || `local-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
                padding: "4px 6px",
                borderRadius: "6px",
                background: m.senderId === user.userId ? "#e7f3ff" : "#f1f1f1",
              }}
            >
              {/* Message text */}
              <div>
                <b>{m.senderId === user.userId ? "You" : selectedUser.username}:</b>{" "}
                {m.deleted ? <i>{m.text}</i> : m.text}
                {m.edited && !m.deleted && <span style={{ fontSize: "10px", color: "gray" }}> (edited)</span>}
                {m.pending && <span style={{ fontSize: "10px", color: "gray" }}> (sending...)</span>}
              </div>

              {/* Timestamp + status */}
              <div
                style={{
                  fontSize: "12px",
                  color: "gray",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                {m.senderId === user.userId && (
                  <span>
                    {m.status === "sent" && "✓"}
                    {m.status === "delivered" && "✓✓"}
                    {m.status === "read" && "✓✓ (blue)"}
                  </span>
                )}
              </div>

              {/* Action menu (only your messages, not deleted) */}
              {m.senderId === user.userId && !m.deleted && (
                <div style={{ marginLeft: "10px" }}>
                  <button onClick={() => handleEdit(m)}>✏️</button>
                  <button onClick={() => handleDelete(m)}>🗑️</button>
                  <button onClick={() => handleDeleteForMe(m)}>🚫</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={!selectedUser} />
        <button onClick={sendMessage} disabled={!selectedUser}>Send</button>
      </div>
    </div>
  );
}