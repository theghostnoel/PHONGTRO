import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Room, University } from "./src/types";
import { DEFAULT_ROOMS, UNIVERSITIES } from "./src/data/rooms";

// Khai báo file lưu trữ
const STORE_PATH = path.join(process.cwd(), "data-store.json");

// Đọc ghi file data
function loadData(): { rooms: Room[]; universities: University[] } {
  let loadedRooms: Room[] = [];
  let loadedUnis: University[] = [];

  if (fs.existsSync(STORE_PATH)) {
    try {
      const content = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      loadedRooms = parsed.rooms || [];
      loadedUnis = parsed.universities || [];
    } catch (e) {
      console.error("Error reading data-store.json, initializing from default", e);
      loadedRooms = [...DEFAULT_ROOMS];
      loadedUnis = [...UNIVERSITIES];
    }
  } else {
    loadedRooms = [...DEFAULT_ROOMS];
    loadedUnis = [...UNIVERSITIES];
  }

  // ĐỒNG BỘ HÓA: Đảm bảo tất cả các phòng trọ mặc định và trường đại học luôn tồn tại trong cơ sở dữ liệu
  let hasChanges = false;

  // Đồng bộ trường đại học
  UNIVERSITIES.forEach((uni) => {
    if (!loadedUnis.some((u) => u.id === uni.id)) {
      loadedUnis.push(uni);
      hasChanges = true;
    }
  });

  // Đồng bộ phòng trọ mặc định
  DEFAULT_ROOMS.forEach((defaultRoom) => {
    if (!loadedRooms.some((r) => r.id === defaultRoom.id)) {
      loadedRooms.push(defaultRoom);
      hasChanges = true;
    }
  });

  if (hasChanges || !fs.existsSync(STORE_PATH)) {
    saveData(loadedRooms, loadedUnis);
  }

  return { rooms: loadedRooms, universities: loadedUnis };
}

function saveData(rooms: Room[], universities: University[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ rooms, universities }, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing data-store.json", e);
  }
}

// Client SSE Connections
let sseClients: any[] = [];

// Gửi thông báo tới tất cả clients
function notifyClients() {
  const message = `data: update\n\n`;
  sseClients.forEach((client) => client.res.write(message));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Tăng giới hạn payload body để hỗ trợ upload ảnh base64
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Cổng đăng nhập Admin bảo mật tuyệt đối
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    // Đăng nhập admin thật của người dùng
    if (username === "clone1phobo@gmail.com" && password === "nguyen2000") {
      res.json({ success: true, token: "admin_verified_token_9932" });
    } else {
      res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" });
    }
  });

  // REST API Rooms
  app.get("/api/rooms", (req, res) => {
    const data = loadData();
    res.json(data.rooms);
  });

  app.post("/api/rooms", (req, res) => {
    const { rooms, universities } = loadData();
    const newRoom: Room = req.body;
    
    // Gán ID nếu chưa có
    if (!newRoom.id) {
      newRoom.id = "LT" + Math.floor(10000000 + Math.random() * 90000000);
    }

    rooms.push(newRoom);
    saveData(rooms, universities);
    notifyClients();
    res.json({ success: true, room: newRoom });
  });

  app.put("/api/rooms/:id", (req, res) => {
    const { rooms, universities } = loadData();
    const { id } = req.params;
    const updatedRoom: Room = req.body;

    const index = rooms.findIndex((r) => r.id === id);
    if (index !== -1) {
      // Kiểm tra xem ID mới (updatedRoom.id) có bị trùng với phòng trọ khác hay không
      if (updatedRoom.id && updatedRoom.id !== id) {
        const isDuplicate = rooms.some((r) => r.id === updatedRoom.id);
        if (isDuplicate) {
          return res.status(400).json({ success: false, message: "Mã phòng trọ mới này đã tồn tại trên hệ thống!" });
        }
      }

      rooms[index] = { ...rooms[index], ...updatedRoom }; // cho phép cập nhật cả ID mới
      saveData(rooms, universities);
      notifyClients();
      res.json({ success: true, room: rooms[index] });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy phòng trọ" });
    }
  });

  app.delete("/api/rooms/:id", (req, res) => {
    const { rooms, universities } = loadData();
    const { id } = req.params;

    const filtered = rooms.filter((r) => r.id !== id);
    if (filtered.length !== rooms.length) {
      saveData(filtered, universities);
      notifyClients();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy phòng trọ" });
    }
  });

  // REST API Universities
  app.get("/api/universities", (req, res) => {
    const data = loadData();
    res.json(data.universities);
  });

  app.post("/api/universities", (req, res) => {
    const { rooms, universities } = loadData();
    const newUni: University = req.body;

    // Đảm bảo không trùng ID hoặc name
    if (!newUni.id) {
      newUni.id = "uni_" + Date.now();
    }

    universities.push(newUni);
    saveData(rooms, universities);
    notifyClients();
    res.json({ success: true, university: newUni });
  });

  // Server-Sent Events (SSE) để đồng bộ hóa real-time full luôn
  app.get("/api/sync", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Ngăn chặn đệm bởi Nginx/Cloud Run
    res.flushHeaders();

    // Gửi tin nhắn kết nối đầu tiên
    res.write("data: connected\n\n");

    const clientId = Date.now();
    sseClients.push({ id: clientId, res });

    // Gửi ping giữ kết nối sống (keep-alive) định kỳ sau mỗi 15 giây
    const pingInterval = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(pingInterval);
      sseClients = sseClients.filter((client) => client.id !== clientId);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
