// Tạo khóa AES-GCM 256 để mã hóa và giải mã dữ liệu
export async function generateAESKey() {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}
// Đây là hàm mã hóa một buffer dữ liệu bằng AES-GCM.
export async function encryptFileBuffer(buffer, aesKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    buffer
  );

  // Nối IV + ciphertext để lưu chung
  const encryptedBuffer = new Uint8Array(iv.length + encrypted.byteLength);
  encryptedBuffer.set(iv, 0);
  encryptedBuffer.set(new Uint8Array(encrypted), iv.length);
  return encryptedBuffer;
}

// Đây là hàm sẽ gọi từ fsa.js
export async function simulateEncryption(fileContent, fileName) {
  const aesKey = await generateAESKey();
  const encoder = new TextEncoder();
  const buffer = encoder.encode(fileContent);
  const encrypted = await encryptFileBuffer(buffer, aesKey);
  return encrypted;
}
