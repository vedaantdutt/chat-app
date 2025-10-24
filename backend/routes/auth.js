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

// helper: safely remove a file from uploads folder
const fs = require("fs");
const uploadsDir = path.resolve(__dirname, "..", "uploads");
async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    const absolute = path.resolve(filePath);
    // ensure we only delete files inside the uploads folder
    if (!absolute.startsWith(uploadsDir)) {
      console.warn("Refusing to delete file outside uploads:", absolute);
      return;
    }
    if (fs.existsSync(absolute)) {
      await fs.promises.unlink(absolute);
      console.log("Deleted file:", absolute);
    }
  } catch (err) {
    console.error("Failed to delete file:", filePath, err);
  }
}


// ...existing code...

// return user profile (including public image URL if present)
router.get("/user/:userId", async (req, res) => {
  try {
    console.log("Fetching profile for userId:", req.params.userId);
    const user = await User.findById(req.params.userId).select("username email profilePic");
    if (!user) return res.status(404).json({ error: "User not found" });

    let profilePicUrl = null;
    if (user.profilePic) {
      // if DB stores a filesystem path like "uploads/..." convert to a full URL
      if (String(user.profilePic).startsWith("http")) {
        profilePicUrl = user.profilePic;
      } else {
        profilePicUrl = `${req.protocol}://${req.get("host")}/${String(user.profilePic).replace(/\\/g, "/")}`;
      }
    }

    res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      profilePic: profilePicUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ...existing code...




// Upload profile photo
router.post("/user/:userId/photo", upload.single("photo"), async (req, res) => {
  try {
    const photoPath = req.file.path; // relative path
    // remove previous photo if present
    const user = await User.findById(req.params.userId);
    if (user && user.profilePic) {
      await safeUnlink(user.profilePic);
    }

    // store the relative path in DB so safeUnlink can delete it later
    await User.findByIdAndUpdate(req.params.userId, { profilePic: photoPath });

    // return a full URL to the client so it can use it as <img src="...">
    const fullUrl = `${req.protocol}://${req.get("host")}/${photoPath.replace(/\\/g, "/")}`;
    res.json({ profilePic: fullUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove profile photo
router.delete("/user/:userId/photo", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (user && user.profilePic) {
      await safeUnlink(user.profilePic);
    }
    await User.findByIdAndUpdate(req.params.userId, { profilePic: null });
    res.json({ message: "Profile photo removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// mark delivered
router.post("/messages/:id/delivered", async (req, res) => {
  const msg = await Message.findByIdAndUpdate(
    req.params.id,
    { status: "delivered" },
    { new: true }
  );
  res.json(msg);
});

// mark read
router.post("/messages/:id/read", async (req, res) => {
  const msg = await Message.findByIdAndUpdate(
    req.params.id,
    { status: "read" },
    { new: true }
  );
  res.json(msg);
});


module.exports = router;
