const express = require("express");
const fsPromises = require("fs").promises;
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFile } = require("child_process");

const app = express();
const PORT = 3000;
const LOG_FILE = path.join(__dirname, "logs.json");

// Tải chứng chỉ SSL
// Sử dụng 'fs' truyền thống cho các hàm đồng bộ như readFileSync
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "../localhost.key")),
  cert: fs.readFileSync(path.join(__dirname, "../localhost.crt")),
};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Hàm ghi log
async function logAction(action) {
  try {
    let logs = [];
    try {
      const data = await fsPromises.readFile(LOG_FILE, "utf8"); // Sử dụng fsPromises
      logs = JSON.parse(data);
    } catch (err) {
      // Nếu file không tồn tại, bỏ qua lỗi và bắt đầu với logs rỗng
      if (err.code !== "ENOENT") {
        throw err; // Ném lại lỗi nếu đó là lỗi khác
      }
    }
    logs.push({ action, timestamp: new Date().toISOString() });
    await fsPromises.writeFile(LOG_FILE, JSON.stringify(logs, null, 2)); // Sử dụng fsPromises
  } catch (err) {
    console.error("Logging failed:", err);
  }
}

// Route gốc: Phục vụ main.html
app.get("/", async (req, res) => {
  try {
    // package.py (Selenium social engineering) disabled for demo
    res.sendFile(path.join(__dirname, "../public/main.html"));
  } catch (err) {
    await logAction(`Error in / route: ${err.message}`);
    console.error("Error in / route:", err);
    res.status(500).send("Server error");
  }
});

// API: Lưu log hành động
app.post("/api/log", async (req, res) => {
  try {
    const { action, timestamp } = req.body;
    let logs = [];
    try {
      const data = await fsPromises.readFile(LOG_FILE, "utf8"); // Sử dụng fsPromises
      logs = JSON.parse(data);
    } catch (err) {
      // Nếu file không tồn tại, bỏ qua lỗi
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
    logs.push({ action, timestamp });
    await fsPromises.writeFile(LOG_FILE, JSON.stringify(logs, null, 2)); // Sử dụng fsPromises
    res.status(200).json({ message: "Log saved" });
  } catch (err) {
    console.error("API log save error:", err); // Thêm log lỗi để dễ debug
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy danh sách log
app.get("/api/logs", async (req, res) => {
  try {
    const data = await fsPromises.readFile(LOG_FILE, "utf8"); // Sử dụng fsPromises
    const logs = JSON.parse(data);
    res.status(200).json(logs);
  } catch (err) {
    // Nếu file không tồn tại, trả về mảng rỗng
    if (err.code === "ENOENT") {
      res.status(200).json([]);
    } else {
      console.error("API get logs error:", err); // Thêm log lỗi để dễ debug
      res.status(500).json({ error: err.message });
    }
  }
});

// Demo 2: RøBguard-protected version of the AFSAM page
app.get("/protected", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/main_protected.html"));
});

// Expose the selected model name so robguard.js can show it on the blocked page
app.get("/api/model-name", (req, res) => {
  const namePath = path.join(__dirname, "../../models/best_model_name.txt");
  try {
    const name = fs.existsSync(namePath)
      ? fs.readFileSync(namePath, "utf8").trim()
      : "KNN";
    res.json({ name });
  } catch {
    res.json({ name: "KNN" });
  }
});

// RøBguard: ML classifier endpoint
// Called by robguard.js with { entropy_diff, size_diff, original_entropy }
// Spawns classify.py which loads the best model and returns 0 or 1
const PYTHON = path.join(__dirname, "../../.venv/Scripts/python.exe");
app.post("/api/classify", (req, res) => {
  const { entropy_diff, size_diff, original_entropy } = req.body;
  execFile(
    PYTHON,
    [
      path.join(__dirname, "classify.py"),
      String(entropy_diff),
      String(size_diff),
      String(original_entropy ?? 0),
    ],
    (err, stdout) => {
      if (err) {
        console.error("classify.py error:", err.message);
        return res.status(500).json({ label: 0 });
      }
      const label = parseInt(stdout.trim(), 10);
      res.json({ label });
    }
  );
});

// Tạo server HTTPS
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}`);
  console.log(`  Demo 1 (Attack):  https://localhost:${PORT}/`);
  console.log(`  Demo 2 (Defense): https://localhost:${PORT}/protected`);
});
