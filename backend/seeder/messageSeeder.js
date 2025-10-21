// seeders/seedMessages.js
const mongoose = require("mongoose");
const Message = require("../models/Message");

async function seedMessages() {
  await mongoose.connect("mongodb://localhost:27017/users");

  const messages = [
    {
      senderId: "66aea3adc8819b162ce5e001",
      receiverId: "66aea3adc8819b162ce5e002",
      text: "Hey! How are you?",
      status: "read"
    },
    {
      senderId: "66aea3adc8819b162ce5e002",
      receiverId: "66aea3adc8819b162ce5e001",
      text: "I’m good, thanks! How about you?",
      status: "read"
    },
    {
      senderId: "66aea3adc8819b162ce5e001",
      receiverId: "66aea3adc8819b162ce5e002",
      text: "Doing well! Want to catch up later?",
    },
    {
      senderId: "66aea3adc8819b162ce5e002",
      receiverId: "66aea3adc8819b162ce5e001",
      text: "Sure, let’s do it!",
    },
    {
      senderId: "66aea3adc8819b162ce5e003",
      receiverId: "66aea3adc8819b162ce5e001",
      text: "Hello! This is user2.",
    }
  ];

  await Message.deleteMany({});
  await Message.insertMany(messages);
  console.log("✅ Messages seeded");

  mongoose.connection.close();
}

seedMessages().catch(err => console.error(err));
