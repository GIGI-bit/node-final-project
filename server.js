import { User } from "./models/user.model.js";
import { PrivateMessage } from "./models/privateMessage.model.js";
import { RoomMessage } from "./models/roomMessage.model.js";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const users = {};
const rooms = {};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongo connected");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("auth", async ({ username, password }) => {
    try {
      let user = await User.findOne({ username });
      users[socket.id] = username;
      // console.log("auth: " + user);
      console.log(username + " " + password);
      console.log(`inside auth`);
      if (!user) {
        console.log("!user");
        const hashedPassword = await bcryptjs.hash(password, 10);
        console.log("password hashed");
        user = new User({ username, password: hashedPassword });
        await user.save();
        console.log(`Auto-registered new user: ${username}`);
      } else {
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
          console.log("password not matching");
          return socket.emit("auth_error", "Invalid password");
        }
      }

      socket.emit("auth_success", { username: user.username });
      console.log(`${username} authenticated successfully`);
    } catch (err) {
      console.log("inside catch");
      console.error("Authentication error:", err.message);
      socket.emit("auth_error", "Authentication failed");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
  socket.on("send_private_message", async ({ to, message }) => {
    const from = users[socket.id];
    const targetSocketId = Object.keys(users).find((key) => users[key] === to);

    if (targetSocketId) {
      io.to(targetSocketId).emit("receive_private_message", {
        from,
        message,
      });
    }

    try {
      await PrivateMessage.create({
        from: from,
        to: to,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to save private message:", error);
    }
  });

  socket.on("find_user", async (username, callback) => {
    try {
      const targetUser = await User.findOne({ username });

      if (targetUser) {
        callback({ success: true, message: "User found." });
      } else {
        callback({ success: false, message: "User not found." });
      }
    } catch (err) {
      console.error("Error finding user:", err);
      callback({ success: false, message: "Server error." });
    }
  });

  socket.on("get_private_messages", async ({ withUser }) => {
    const currentUser = users[socket.id];
    console.log("in get_private_messages");
    console.log(currentUser);
    console.log(withUser);
    try {
      const messages = await PrivateMessage.find({
        $or: [
          { from: currentUser, to: withUser },
          { from: withUser, to: currentUser },
        ],
      }).sort({ createdAt: 1 });
      socket.emit("private_messages_history", messages);
    } catch (err) {
      console.error("Failed to fetch messages:", err.message);
      socket.emit("private_messages_error", "Could not load messages");
    }
  });

  socket.on("find_room", async (room, callback) => {
    try {
      const targetRoom = await RoomMessage.findOne({ room: room });

      callback({ success: true, message: "Room found." });
    } catch (err) {
      console.error("Error finding room:", err);
      callback({ success: false, message: "Server error." });
    }
  });

  socket.on("join_room", (room) => {
    socket.join(room);
    rooms[room] = rooms[room] || [];
    rooms[room].push(socket.id);
    console.log(`${users[socket.id]} joined room ${room}`);
  });

  socket.on("send_room_message", async ({ room, message }) => {
    const from = users[socket.id];
    try {
      await RoomMessage.create({
        room: room,
        from: from,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to save private message:", error);
    }

    io.to(room).emit("receive_room_message", {
      from: users[socket.id],
      message,
    });
  });
  socket.on("get_room_messages", async ({ room }) => {
    console.log(room);
    try {
      const messages = await RoomMessage.find({ room: room });
      console.log(messages);
      socket.emit("room_messages_history", messages);
    } catch (err) {
      console.error("Failed to fetch messages:", err.message);
      socket.emit("private_messages_error", "Could not load messages");
    }
  });
});

app.get("/users", (req, res) => {
  res.json(Object.values(users));
});

app.get("/rooms", (req, res) => {
  res.json(Object.keys(rooms));
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
  connectDB();
});
