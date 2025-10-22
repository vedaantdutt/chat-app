const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

// serve uploaded files from /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect("mongodb://localhost:27017/users", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Socket.IO
require("./socket")(server);

server.listen(5000, () => console.log("Server running on port 5000"));
