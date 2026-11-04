const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e6
});

const PORT = process.env.PORT || 3000;
const MAX_STROKES = 12000;
const strokes = [];
let nextStrokeId = 1;

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", connectedUsers: io.engine.clientsCount });
});

function validPoint(point) {
  return point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 1 &&
    point.y >= 0 && point.y <= 1;
}

function validColor(color) {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);
}

function validWidth(width) {
  return Number.isFinite(width) && width >= 1 && width <= 40;
}

io.on("connection", (socket) => {
  socket.emit("board:history", strokes);
  io.emit("users:count", io.engine.clientsCount);

  socket.on("stroke:add", (stroke) => {
    if (!stroke || !Array.isArray(stroke.points) ||
        stroke.points.length < 1 || stroke.points.length > 2500 ||
        !validColor(stroke.color) || !validWidth(stroke.width) ||
        !stroke.points.every(validPoint)) {
      return;
    }

    const savedStroke = {
      id: nextStrokeId++,
      color: stroke.color,
      width: stroke.width,
      points: stroke.points
    };

    strokes.push(savedStroke);
    if (strokes.length > MAX_STROKES) {
      strokes.splice(0, strokes.length - MAX_STROKES);
    }

    socket.broadcast.emit("stroke:add", savedStroke);
  });

  socket.on("board:clear", () => {
    strokes.length = 0;
    io.emit("board:clear");
  });

  socket.on("disconnect", () => {
    io.emit("users:count", io.engine.clientsCount);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Live Shared Drawing Board listening on port ${PORT}`);
});