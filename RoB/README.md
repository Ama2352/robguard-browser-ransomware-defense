# RoB — Server & Frontend

This folder contains the Node.js HTTPS server and both demo frontends.

## Structure

```
RoB/
├── localhost.key          ← SSL private key  (git-ignored, generate once)
├── localhost.crt          ← SSL certificate  (git-ignored, generate once)
├── backend/
│   ├── server.js          ← HTTPS server on port 3000
│   ├── classify.py        ← ML classifier called by /api/classify
│   ├── package.json
│   └── node_modules/      ← (git-ignored, restore with npm install)
└── public/
    ├── main.html               ← Demo 1: unprotected AFSAM page
    ├── main_protected.html     ← Demo 2: RøBguard-protected page
    ├── extortion.html          ← Ransom note (end of Demo 1)
    ├── robguard_blocked.html   ← Attack blocked page (end of Demo 2)
    ├── css/extortion.css
    └── js/
        ├── fsa.js          ← Attack: FSA API encryption loop
        ├── encryption.js   ← AES-256-GCM
        ├── extortion.js    ← Ransom page logic
        └── robguard.js     ← Defense: FSA API hooks + entropy + ML call
```

## Setup (first time)

**1. Install Node dependencies**
```
cd backend
npm install
```

**2. Generate SSL certificate** (required for HTTPS + File System Access API)
```
cd ..
"C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout localhost.key -out localhost.crt -subj "/CN=localhost"
```

**3. Place model files** in `../models/` (download from Colab notebook):
```
../models/best_model.pkl
../models/scaler.pkl
```

## Running the Server

```
cd backend
node server.js
```

Expected output:
```
Server running at https://localhost:3000
  Demo 1 (Attack):  https://localhost:3000/
  Demo 2 (Defense): https://localhost:3000/protected
```

Open Chrome or Edge → accept the self-signed certificate warning (Advanced → Proceed).

## Routes

| Route | Purpose |
|-------|---------|
| `GET /` | Demo 1 — unprotected AFSAM page |
| `GET /protected` | Demo 2 — RøBguard-protected page |
| `POST /api/log` | Log attack events |
| `GET /api/logs` | Retrieve event log |
| `POST /api/classify` | `{entropy_diff, size_diff}` → `{label: 0\|1}` |

## Demo 1 — Attack

1. Go to `https://localhost:3000/`
2. Click **Select Your File** → select a folder → grant access
3. Each file is read, AES-256-GCM encrypted, then overwritten in-place — original
   files remain by name but their content becomes unreadable ciphertext
4. Ransom page appears with countdown and BTC address

## Demo 2 — Defense (RøBguard)

1. Go to `https://localhost:3000/protected`
2. Click **Select Your File** → select the same folder → grant access
3. `robguard.js` hooks intercept the encrypted write at `write()` — before any
   ciphertext reaches disk
4. `/api/classify` calls `classify.py` with the computed `entropy_diff` and `size_diff`
5. KNN model returns `label=1` → `write()` is abandoned → blocked page is shown
6. All original files remain untouched and readable

See `../demo_guide.md` for the full presenter script.
