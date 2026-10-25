const socket = io();

const canvas = document.getElementById("drawing-canvas");
const context = canvas.getContext("2d");
const canvasWrap = document.getElementById("canvas-wrap");
const emptyState = document.getElementById("empty-state");
const colorPicker = document.getElementById("color-picker");
const brushSize = document.getElementById("brush-size");
const brushSizeValue = document.getElementById("brush-size-value");
const clearButton = document.getElementById("clear-button");
const userCount = document.getElementById("user-count");
const userLabel = document.getElementById("user-label");
const connectionDot = document.getElementById("connection-dot");
const connectionText = document.getElementById("connection-text");
const toast = document.getElementById("toast");

let strokes = [];
let isDrawing = false;
let currentPoints = [];
let currentStroke = null;
let toastTimeout = null;
let pixelRatio = Math.max(1, window.devicePixelRatio || 1);

function resizeCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  const oldImage = oldWidth && oldHeight ? context.getImageData(0, 0, oldWidth, oldHeight) : null;

  pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * pixelRatio);
  canvas.height = Math.round(rect.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (oldImage && oldWidth && oldHeight && strokes.length === 0) {
    const temp = document.createElement("canvas");
    temp.width = oldWidth;
    temp.height = oldHeight;
    temp.getContext("2d").putImageData(oldImage, 0, 0);
    context.drawImage(temp, 0, 0, oldWidth / pixelRatio, oldHeight / pixelRatio);
  } else {
    redrawAll();
  }
}

function drawStroke(stroke) {
  if (!stroke || !stroke.points || stroke.points.length === 0) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  context.save();
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.beginPath();
    context.arc(point.x * width, point.y * height, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (let i = 1; i < stroke.points.length; i++) {
      context.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
    }
    context.stroke();
  }
  context.restore();
}

function redrawAll() {
  context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  for (const stroke of strokes) drawStroke(stroke);
  emptyState.classList.toggle("hidden", strokes.length > 0 || Boolean(currentStroke));
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  };
}

function drawLocalSegment(points, color, width) {
  if (points.length === 1) {
    drawStroke({ points, color, width });
    return;
  }
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const previous = points[points.length - 2];
  const next = points[points.length - 1];
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(previous.x * w, previous.y * h);
  context.lineTo(next.x * w, next.y * h);
  context.stroke();
  context.restore();
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  isDrawing = true;
  currentPoints = [pointFromEvent(event)];
  currentStroke = {
    color: colorPicker.value,
    width: Number(brushSize.value),
    points: currentPoints
  };
  drawLocalSegment(currentPoints, currentStroke.color, currentStroke.width);
  emptyState.classList.add("hidden");
});

canvas.addEventListener("pointermove", (event) => {
  if (!isDrawing || !currentStroke) return;
  event.preventDefault();
  const point = pointFromEvent(event);
  const previous = currentPoints[currentPoints.length - 1];
  if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.001) return;
  currentPoints.push(point);
  drawLocalSegment(currentPoints, currentStroke.color, currentStroke.width);
});

function finishDrawing() {
  if (!isDrawing || !currentStroke) return;
  isDrawing = false;
  const completedStroke = {
    color: currentStroke.color,
    width: currentStroke.width,
    points: currentPoints.slice()
  };
  strokes.push(completedStroke);
  socket.emit("stroke:add", completedStroke);
  currentPoints = [];
  currentStroke = null;
  emptyState.classList.toggle("hidden", strokes.length > 0);
}

canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", finishDrawing);
canvas.addEventListener("lostpointercapture", finishDrawing);

colorPicker.addEventListener("input", () => {
  document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.classList.toggle("selected", swatch.dataset.color.toLowerCase() === colorPicker.value.toLowerCase());
  });
});

document.querySelectorAll(".swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    colorPicker.value = swatch.dataset.color;
    document.querySelectorAll(".swatch").forEach((item) => item.classList.toggle("selected", item === swatch));
  });
});

brushSize.addEventListener("input", () => {
  brushSizeValue.textContent = brushSize.value;
});

clearButton.addEventListener("click", () => {
  if (strokes.length === 0 && !currentStroke) {
    showToast("The board is already empty.");
    return;
  }
  socket.emit("board:clear");
});

socket.on("connect", () => {
  connectionDot.classList.add("connected");
  connectionText.textContent = "Connected live";
});

socket.on("disconnect", () => {
  connectionDot.classList.remove("connected");
  connectionText.textContent = "Reconnecting…";
  showToast("Connection lost. Trying to reconnect.");
});

socket.on("connect_error", () => {
  connectionDot.classList.remove("connected");
  connectionText.textContent = "Connection issue";
});

socket.on("board:history", (history) => {
  strokes = Array.isArray(history) ? history : [];
  redrawAll();
});

socket.on("stroke:add", (stroke) => {
  strokes.push(stroke);
  drawStroke(stroke);
  emptyState.classList.add("hidden");
});

socket.on("board:clear", () => {
  strokes = [];
  currentPoints = [];
  currentStroke = null;
  isDrawing = false;
  redrawAll();
  showToast("The shared board was cleared.");
});

socket.on("users:count", (count) => {
  userCount.textContent = count;
  userLabel.textContent = count === 1 ? "person online" : "people online";
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2400);
}

if ("ResizeObserver" in window) {
  new ResizeObserver(resizeCanvas).observe(canvasWrap);
} else {
  window.addEventListener("resize", resizeCanvas);
}
resizeCanvas();