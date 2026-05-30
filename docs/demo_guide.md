# Demo Guide — Ransomware on Browser Defense

## Before You Start

### Step 0 — Run the Colab Notebook First

**Before anything else**, run `notebooks/ransomware_detection.ipynb` in Google Colab.
Complete all 8 stages. Stage 7 selects the best model from the actual CV results.
Stage 8 downloads `best_model.pkl` and `scaler.pkl`.

Place both downloaded files into the `models/` folder:
```
models/
  best_model.pkl
  scaler.pkl
```

### Other Prerequisites
- **Node.js** v18+ installed
- **Demo victim files** generated in `test_victim/`:
  ```
  cd test_victim
  python generate.py
  ```
  This creates 6 realistic-looking documents (`.txt`, `.xlsx`, `.docx`).
  Re-run the same command to restore files after each attack demo — no backup needed.

### Start the Server (do this once, after placing models)
```
cd "RoB\backend"
node server.js
```
Expected output:
```
Server running at https://localhost:3000
  Demo 1 (Attack):  https://localhost:3000/
  Demo 2 (Defense): https://localhost:3000/protected
```

Open **Chrome** or **Edge**. When the browser shows a security warning (self-signed
cert), click **Advanced → Proceed to localhost**.

---

## Section 1 — Colab Notebook: ML Training & Model Selection

**Objective**: Show the full ML pipeline and let the results determine which model
is used. The audience sees the selection happen based on data — not a prior decision.

### Steps

1. Open `notebooks/ransomware_detection.ipynb` in Google Colab
2. **Stage 1** — Install dependencies
3. **Stage 2** — Generate 50 sample files per type (txt, docx, xlsx, pdf, pptx)
4. **Stage 3** — Generate the dataset
   - **[Say]**: *"For each file, we create 100 benign variants (small edits) and
     100 malicious variants (AES-256 encrypted). We extract two features: entropy
     change and file size change."*
5. **Stage 4** — EDA: show the scatter plot
   - **[Say]**: *"Benign edits cluster near entropy_diff = 0. Encrypted files
     shift far to the right — +3 to +4 bits/byte. The two classes are visually
     well-separated."*
6. **Stage 5** — Train all 4 models with 10-fold cross-validation
7. **Stage 6** — Show the results comparison table
8. **Stage 7** — Model selection
   - **[Say]**: *"In security, Recall is the most important metric. A False
     Negative means ransomware goes undetected — the user's files are permanently
     lost. A False Positive just causes an unnecessary warning."*
   - **[Say]**: *"Stage 7 sorts the models by Recall first, then Precision as
     tiebreaker, and picks the winner automatically from the actual results."*
   - Point to the output cell showing `Best model: <name>` and the full ranking
9. **Stage 8** — Download `best_model.pkl` + `scaler.pkl` → place in `models/`

---

## Section 2 — Demo 1: The RøB Attack

**Objective**: Show how RøB ransomware works entirely inside the browser,
with no software installation required.

### Steps

1. Navigate to `https://localhost:3000/`
2. **[Say]**: *"This is AFSAM — a fake financial document management platform.
   It looks legitimate. The user has no reason to suspect it."*
3. Click **Select Your File**
4. Select the `test_victim/` folder → click **Allow** on both permission dialogs
5. **[Say]**: *"The site just asked for folder access — a standard browser
   permission. But under the hood, it's using the File System Access API
   to read every file and encrypt it with AES-256-GCM."*
6. Wait for processing → ransom page appears
7. **[Say]**: *"All files are now encrypted. The ransom page demands 0.05 BTC
   with a 72-hour countdown. The user's data is gone."*
8. Open `test_victim/` to show the original files are still there by name but
   now contain unreadable binary content — they cannot be opened

### Restore Before Demo 2
```
cd test_victim
python generate.py
```
This recreates all 6 files fresh. No manual backup needed.

---

## Section 3 — Demo 2: RøBguard Defense

**Objective**: Show RøBguard intercepting the same attack and blocking it
before any encrypted data is written to disk.

### Steps

1. Navigate to `https://localhost:3000/protected`
2. **[Say]**: *"This is the same AFSAM website — same URL, same UI. But this
   time, RøBguard is active. It has injected hooks into the browser's File
   System Access API before the page loaded."*
3. Click **Select Your File**
4. Select the `test_victim/` folder → click **Allow**
5. **[Say]**: *"The attack starts. RøBguard intercepts each file write
   at the API level — before any encrypted bytes are sent to disk."*
6. The page redirects to `robguard_blocked.html`
7. **[Explain the details on screen]**:
   - **File targeted**: the first file the attack tried to encrypt
   - **Entropy change**: a large positive value (e.g., +3.5 bits/byte) —
     normal edits are near 0; encryption jumps to +2–4
   - **File size change**: a small positive value (+16–32 bytes from IV/padding)
   - **ML Model**: shows the selected model (from `best_model_name.txt`) and `label = 1`
8. Open `test_victim/` to show **all original files are intact, no EncryptedFiles folder created**
9. **[Say]**: *"RøBguard stopped the attack before the first write completed.
   No encrypted data ever reached the disk."*

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser shows "Your connection is not private" | Click Advanced → Proceed to localhost (unsafe) |
| `node server.js` fails with cert error | Check that `localhost.key` and `localhost.crt` exist in `RoB/` |
| `python` not found in server | Check the `.venv/Scripts/python.exe` path in `server.js` PYTHON constant |
| RøBguard page shows `ent=0.0000` | Re-run `python generate.py` in `test_victim/` to ensure files are non-empty |
| `classify.py` fails | Run `.venv/Scripts/python classify.py 3.5 20` — should print `1`; check `models/` has `.pkl` files |
| Demo 2 doesn't block | Open browser DevTools → Console — look for `[RøBguard] FSA API hooks active`; if missing, hard-refresh |

---

## Recommended Demo Order

1. Theory slides (RøB model, FSA API, RøBguard components) — ~5 min
2. **Section 1**: Colab notebook — training, results, model selection — ~5 min
3. **Section 2**: Live attack demo — ~3 min
4. **Section 3**: Live defense demo — ~3 min
