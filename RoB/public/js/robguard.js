/**
 * RøBguard — FSA API Hook
 * Intercepts File System Access API calls to detect and block ransomware encryption.
 * Must be loaded BEFORE fsa.js.
 */
(function () {
  "use strict";

  // Shannon entropy (bits/byte)
  function robguardEntropy(bytes) {
    if (!bytes.length) return 0;
    const freq = new Uint32Array(256);
    for (let i = 0; i < bytes.length; i++) freq[bytes[i]]++;
    let entropy = 0;
    const n = bytes.length;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / n;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  // Stores entropy/size of the most recently read original file
  let _robOrigEntropy = 0;
  let _robOrigSize = 0;
  let _robOrigName = "";

  // Fetch model name once on load for the blocked page display
  let _robModelName = "best_model";
  fetch("/api/model-name")
    .then((r) => r.json())
    .then((d) => { _robModelName = d.name; })
    .catch(() => {});

  const origGetFile = FileSystemFileHandle.prototype.getFile;
  const origCreateWritable = FileSystemFileHandle.prototype.createWritable;
  const origWrite = FileSystemWritableFileStream.prototype.write;
  const origClose = FileSystemWritableFileStream.prototype.close;

  // 1. Hook getFile — capture original file's entropy and size
  FileSystemFileHandle.prototype.getFile = async function () {
    const file = await origGetFile.call(this);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      _robOrigEntropy = robguardEntropy(bytes);
      _robOrigSize = bytes.length;
      _robOrigName = file.name;
    } catch (e) {
      // fail silently
    }
    return file;
  };

  // 2. Hook createWritable — snapshot original file stats onto the stream
  FileSystemFileHandle.prototype.createWritable = async function (options) {
    if (window._robBlocked) throw new Error("RøBguard: attack blocked");
    const writable = await origCreateWritable.call(this, options);
    writable._robSnapOrigEntropy = _robOrigEntropy;
    writable._robSnapOrigSize = _robOrigSize;
    writable._robSnapOrigName = _robOrigName;
    return writable;
  };

  // 3. Hook write — THE KEY INTERCEPTION POINT
  // Classifies content BEFORE calling originalWrite.
  // If malicious: redirect immediately — no encrypted bytes ever reach disk.
  FileSystemWritableFileStream.prototype.write = async function (data) {
    if (window._robBlocked) throw new Error("RøBguard: attack blocked");

    // Extract bytes from whatever write() form was used
    let bytes = null;
    try {
      if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
      } else if (ArrayBuffer.isView(data)) {
        bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      } else if (data && typeof data === "object" && data.type === "write") {
        const d = data.data;
        if (d instanceof ArrayBuffer) bytes = new Uint8Array(d);
        else if (ArrayBuffer.isView(d))
          bytes = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
      }
    } catch (e) {
      // extraction failed — fall through to allow write
    }

    if (bytes && bytes.length > 0) {
      try {
        const origEnt = this._robSnapOrigEntropy ?? 0;
        const origSz  = this._robSnapOrigSize ?? 0;
        const newEnt  = robguardEntropy(bytes);

        const entropy_diff = newEnt - origEnt;
        const size_diff    = bytes.length - origSz;
        const filename     = this._robSnapOrigName ?? "unknown";

        const resp = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entropy_diff, size_diff, original_entropy: origEnt }),
        });
        const result = await resp.json();

        if (result.label === 1) {
          window._robBlocked = true;
          const params = new URLSearchParams({
            file: filename,
            ent: entropy_diff.toFixed(4),
            size: size_diff,
            orig: origEnt.toFixed(4),
            model: _robModelName,
          });
          window.location.href = "/robguard_blocked.html?" + params.toString();
          return; // origWrite is NOT called — data never hits disk
        }
      } catch (e) {
        // fail-open on classify error so legitimate apps aren't broken
        console.warn("[RøBguard] classify error:", e);
      }
    }

    return origWrite.call(this, data);
  };

  // 4. Hook close — guard only (classification already happened in write)
  FileSystemWritableFileStream.prototype.close = async function () {
    if (window._robBlocked) throw new Error("RøBguard: attack blocked");
    return origClose.call(this);
  };

  console.log("[RøBguard] FSA API hooks active — ransomware protection enabled");
})();
