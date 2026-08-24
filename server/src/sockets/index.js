import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { setSocketIO } from "./socket.manager.js";

const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://127.0.0.1:5500",
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );

      socket.user = decodedToken;
      console.log("User authenticated!");

      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    console.log("Authenticated user:", socket.user);

    const userId = socket.user._id.toString();

    socket.join(`userId:${userId}`);

    console.log(`User ${userId} joined notification room`);
  });

  setSocketIO(io);

  return io;
};

export { initializeSocketIO };