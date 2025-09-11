import React from "react";

export default function MessageList({ messages }) {
  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>
          <b>{m.senderId}:</b> {m.text}
        </div>
      ))}
    </div>
  );
}
