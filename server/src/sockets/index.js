import { Server } from "socket.io";

const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://127.0.0.1:5500",
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected: ", socket.id);

    socket.on("msg", (data) => {
      console.log("Message recieved from client: ", data);

      socket.emit("reply", {
        message: "Hello from server!",
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected: ", socket.id);
    });
  });
  return io;
};

export { initializeSocketIO };
