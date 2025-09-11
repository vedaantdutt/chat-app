import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useRef } from "react";

export default function Chat({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const socket = useRef(io("http://localhost:5000")).current;

  // Fetch all users except self
  useEffect(() => {
    fetch("http://localhost:5000/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        // console.log("All users in DB:", data);
        setUsers(data.filter((u) => u._id !== user.userId));
      });
  }, [user.userId]);

  // Load chat history with selected user
  useEffect(() => {
    console.log("check1");
    if (!selectedUser) return;
    console.log("check2");

    fetch(
      `http://localhost:5000/api/auth/messages/${user.userId}/${selectedUser._id}`
    )
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        console.log("The messages are", data.messages);
      })
      .catch((err) => console.error(err));
  }, [selectedUser, user.userId]);

  useEffect(() => {
    socket.on("updateOnlineUsers", (online) => {
      setOnlineUsers(online);
    });

    return () => {
      socket.off("updateOnlineUsers");
    };
  }, []);

  // Listen for new messages
  useEffect(() => {
    socket.emit("login", user.userId);

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("onlineUsers", (onlineIds) => {
      setOnlineUsers(new Set(onlineIds)); // store in Set for easy lookup
    });

    socket.on("messageEdited", (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    });

    socket.on("messageDeleted", (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    });

    socket.on("messageDeletedForMe", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    return () => {
      socket.disconnect();
    };
  }, [user.userId]);

  const sendMessage = () => {
    if (!input || !selectedUser) return;

    socket.emit("sendMessage", {
      senderId: user.userId,
      receiverId: selectedUser._id,
      text: input,
    });

    setMessages((prev) => [
      ...prev,
      { senderId: user.userId, receiverId: selectedUser._id, text: input },
    ]);
    setInput("");
  };

  const goToProfile = () => {
    // Redirect to profile page
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
              background:
                selectedUser && selectedUser._id === u._id ? "#eee" : "",
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
                background: onlineUsers.includes(u._id) ? "green" : "gray",
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
              key={i}
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
                <b>
                  {m.senderId === user.userId ? "You" : selectedUser.username}:
                </b>{" "}
                {m.deleted ? <i>{m.text}</i> : m.text}
                {m.edited && !m.deleted && (
                  <span style={{ fontSize: "10px", color: "gray" }}>
                    {" "}
                    (edited)
                  </span>
                )}
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
                  {m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
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
                  <button
                    onClick={() => {
                      const newText = prompt("Edit message:", m.text);
                      if (newText) {
                        socket.emit("editMessage", {
                          messageId: m._id,
                          newText,
                        });
                      }
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      socket.emit("deleteMessage", { messageId: m._id });
                    }}
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => {
                      socket.emit("deleteMessageForMe", {
                        messageId: m._id,
                        userId: user.userId,
                      });
                    }}
                  >
                    🚫
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!selectedUser}
        />
        <button onClick={sendMessage} disabled={!selectedUser}>
          Send
        </button>
      </div>
    </div>
  );
}
