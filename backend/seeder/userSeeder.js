const mongoose = require("mongoose");
const User = require("../models/User");

async function seedUsers() {
  await mongoose.connect("mongodb://localhost:27017/users");

  const users = [
    {
      _id: new mongoose.Types.ObjectId("66aea3adc8819b162ce5e001"),
      username: "vedaant",
      email: "vedaantdutt@gmail.com",
      password: "password"
    },
    {
      _id: new mongoose.Types.ObjectId("66aea3adc8819b162ce5e002"),
      username: "user1",
      email: "user1@gmail.com",
      password: "password1"
    },
    {
      _id: new mongoose.Types.ObjectId("66aea3adc8819b162ce5e003"),
      username: "user2",
      email: "user2@gmail.com",
      password: "password2"
    }
  ];

  await User.deleteMany({});
  await User.insertMany(users);
  console.log("✅ Users seeded with fixed IDs");

  mongoose.connection.close();
}

seedUsers().catch(err => console.error(err));
