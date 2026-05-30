// Tạo ID duy nhất
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
// Gán ID cho victim để show
function setVictimID() {
  let victimID = localStorage.getItem("victimID");
  if (!victimID) {
    victimID = generateUUID();
    localStorage.setItem("victimID", victimID);
  }
  document.getElementById("victim-id").textContent = victimID;
}
// Lấy địa chỉ IP public
async function fetchIPAddress() {
  const ipElement = document.getElementById("ip-address");
  const apis = ["https://ipapi.co/json/", "https://api.ipify.org?format=json"]; // dùng curl -4 ifconfig.me để kiểm tra IP public

  for (const api of apis) {
    try {
      const response = await fetch(api, { mode: "cors" });
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const ipAddress = data.ip || "Unknown";
      if (ipAddress !== "Unknown") {
        ipElement.textContent = ipAddress;
        return;
      }
    } catch (error) {
      console.error(`Error fetching IP from ${api}:`, error);
    }
  }
  ipElement.textContent = "Unable to retrieve IP";
}
// Khởi tạo và hiển thị bộ đếm ngược
function startCountdown(id, hours) {
  const countdownElement = document.getElementById(id);
  const endTimeKey = "countdownEndTime";
  let endTime = localStorage.getItem(endTimeKey);

  if (!endTime) {
    endTime = Date.now() + hours * 3600 * 1000;
    localStorage.setItem(endTimeKey, endTime);
  } else {
    endTime = parseInt(endTime, 10);
  }
  // Cập nhật bộ đếm ngược mỗi giây
  function updateTimer() {
    const now = Date.now();
    const timeLeft = Math.max(0, endTime - now);
    const seconds = Math.floor(timeLeft / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    countdownElement.textContent = `${String(h).padStart(2, "0")}:${String(
      m
    ).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    if (timeLeft <= 0) {
      countdownElement.textContent = "00:00:00";
      clearInterval(timerInterval);
      localStorage.removeItem(endTimeKey);
    }
  }

  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  setVictimID();
  fetchIPAddress();
  startCountdown("countdown", 72); // 72 hours
});
