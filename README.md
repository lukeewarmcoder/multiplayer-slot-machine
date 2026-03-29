# 🎰 Multiplayer Slot Machine

A real-time multiplayer slot machine game with a Node.js/Express backend, WebSocket-powered live jackpot sync, and a vanilla JS frontend.

---

## 🚀 Features

- **Secure RNG** — Server-side spin using `crypto.randomBytes`; client has zero influence over outcomes
- **Live Jackpot** — Global jackpot synced across all connected clients via WebSocket
- **Multi-line Betting** — Bet on 1–3 lines per spin
- **Leaderboard** — Top 10 players ranked by total winnings, auto-refreshed every 5s
- **Deposit System** — Add balance via `/deposit` endpoint
- **Session Stats** — Tracks spins, total won, and biggest win per session
- **Sound Effects** — Lever pull, spinning reels, win, and jackpot audio
- **Symbol Payout Table:**

| Symbol | Frequency | Multiplier     |
|--------|-----------|----------------|
| A      | 1/10      | 🏆 Full Jackpot |
| B      | 2/10      | 6× bet         |
| C      | 3/10      | 4× bet         |
| D      | 4/10      | 2× bet         |

---

## 🗂 Project Structure

```
slot-machine/
├── backend/
│   ├── server.js          # Express API + WebSocket server
│   └── package.json
├── sounds/
│   ├── spin.mp3
│   ├── win.mp3
│   ├── jackpot.mp3
│   └── lever.mp3
├── index.html             # Game UI
├── game.js                # Frontend logic
├── style.css              # Styles
├── .gitignore
└── README.md
```

---

## ⚙️ Setup & Run

### Prerequisites
- Node.js ≥ 18

### Backend

```bash
cd backend
npm install
node server.js
# → Running on http://localhost:3000
```

### Frontend

Open `index.html` directly in a browser, or serve it with any static file server:

```bash
# e.g. using Python
python -m http.server 8080
# → http://localhost:8080
```

> Make sure `BACKEND_URL` in `game.js` matches your backend address.

---

## 🔌 API Reference

### `POST /spin`
```json
{ "userId": "alice", "bet": 10, "lines": 3 }
```
**Response:**
```json
{
  "rows": [["A","A","A"],["B","C","D"],["D","D","D"]],
  "win": 5000,
  "jackpot": 5000,
  "balance": 6500,
  "jackpotWon": true
}
```

### `POST /deposit`
```json
{ "userId": "alice", "amount": 500 }
```
**Response:** `{ "balance": 1500 }`

### `GET /leaderboard`
Returns top 10 players sorted by `totalWon`.

### WebSocket `ws://localhost:3000`
Broadcasts on every spin:
```json
{ "type": "jackpot", "value": 5230 }
```

---

## 🎮 How to Play

1. Enter a username and click **LOGIN**
2. Optionally **DEPOSIT** funds (default balance: $1000)
3. Set **Lines** (1–3) and **Bet per Line**
4. Hit **SPIN** — results and balance update instantly
5. Match all 3 symbols on an active line to win

---

## ⚠️ Known Limitations / Security Notes

- **No authentication** — `userId` is a plain string; anyone can impersonate another user
- **In-memory state** — All balances and leaderboard data reset on server restart; no persistence layer
- **No rate limiting** — `/spin` can be called in rapid succession; consider adding express-rate-limit
- **No deposit cap** — The `/deposit` endpoint accepts arbitrary amounts with no validation ceiling

---

## 📄 License

MIT © 2025 Ayushman Dixit
