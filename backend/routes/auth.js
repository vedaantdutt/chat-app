const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  // const hash = await bcrypt.hash(password, 10);
  try {
    // const user = new User({ username, email, password: hash });
    const user = new User({ username, email, password });
    await user.save();
    res.send({ message: "User registered" });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  console.log("looking for a user with email:", email);
  console.log(user);

  const users = await User.find();
  console.log("All users in DB:", users);

  if (!user) return res.status(400).send({ error: "User not found" });

  const valid = password === user.password;
  if (!valid) return res.status(400).send({ error: "Invalid password" });

  const token = jwt.sign({ id: user._id }, "secretkey");
  res.send({ token, username: user.username, userId: user._id });
});

router.get("/users", async (req, res) => {
  const { userId } = req.query;
  try {
    const users = await User.find(userId ? { _id: { $ne: userId } } : {});
    res.json(users);
    console.log("All users in DB:", users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/messages/:senderId/:receiverId", async (req, res) => {
  const { senderId, receiverId } = req.params;

  console.log(`Fetching messages between ${senderId} and ${receiverId}`);

  try {
    // Find all messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.json({ messages });
    console.log("Messages between users:", messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${req.params.userId}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});
const upload = multer({ storage });

// Upload profile photo
router.post("/user/:userId/photo", upload.single("photo"), async (req, res) => {
  try {
    const photoPath = req.file.path; // relative path
    await User.findByIdAndUpdate(req.params.userId, { profilePic: photoPath });
    res.json({ profilePic: photoPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove profile photo
router.delete("/user/:userId/photo", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (user.profilePic) {
      const fs = require("fs");
      fs.unlinkSync(user.profilePic);
    }
    await User.findByIdAndUpdate(req.params.userId, { profilePic: null });
    res.json({ message: "Profile photo removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// mark delivered
// router.post("/messages/:id/delivered", async (req, res) => {
//   const msg = await Message.findByIdAndUpdate(
//     req.params.id,
//     { status: "delivered" },
//     { new: true }
//   );
//   res.json(msg);
// });

// // mark read
// router.post("/messages/:id/read", async (req, res) => {
//   const msg = await Message.findByIdAndUpdate(
//     req.params.id,
//     { status: "read" },
//     { new: true }
//   );
//   res.json(msg);
// });


module.exports = router;
