import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const SYMBOLS = ["A", "B", "B", "C", "C", "C", "D", "D", "D", "D"];
const VALUES = { A: 10, B: 6, C: 4, D: 2 };

let GLOBAL_JACKPOT = 5000;
const leaderboard = {};
const balances = {};

const INITIAL_BALANCE = 1000;

// Secure RNG - ignores all client input
function generateRows() {
  const bytes = crypto.randomBytes(9);
  const rows = [];
  let idx = 0;
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      row.push(SYMBOLS[bytes[idx] % SYMBOLS.length]);
      idx++;
    }
    rows.push(row);
  }
  return rows;
}

app.post("/spin", (req, res) => {
  const { userId, bet, lines } = req.body;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid userId" });
  }
  if (typeof bet !== "number" || !Number.isFinite(bet) || bet <= 0) {
    return res.status(400).json({ error: "Bet must be a positive number" });
  }
  if (![1, 2, 3].includes(lines)) {
    return res.status(400).json({ error: "Lines must be 1, 2, or 3" });
  }

  if (balances[userId] === undefined) {
    balances[userId] = INITIAL_BALANCE;
  }

  const totalCost = bet * lines;
  if (balances[userId] < totalCost) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  balances[userId] -= totalCost;

  const rows = generateRows();

  let win = 0;
  let jackpotWon = false;

  for (let i = 0; i < lines; i++) {
    if (rows[i][0] === rows[i][1] && rows[i][1] === rows[i][2]) {
      if (rows[i][0] === "A") {
        win += GLOBAL_JACKPOT;
        jackpotWon = true;
      } else {
        win += bet * VALUES[rows[i][0]];
      }
    }
  }

  GLOBAL_JACKPOT += Math.floor(totalCost * 0.1);

  if (jackpotWon) {
    GLOBAL_JACKPOT = 5000;
  }

  balances[userId] += win;

  if (!leaderboard[userId]) {
    leaderboard[userId] = { userId, totalWon: 0 };
  }
  leaderboard[userId].totalWon += win;

  broadcast({ type: "jackpot", value: GLOBAL_JACKPOT });

  res.json({
    rows,
    win,
    jackpot: GLOBAL_JACKPOT,
    balance: balances[userId],
    jackpotWon,
  });
});

// Deposit endpoint
app.post("/deposit", (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid userId" });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }

  if (balances[userId] === undefined) {
    balances[userId] = INITIAL_BALANCE;
  }

  balances[userId] += amount;

  res.json({ balance: balances[userId] });
});

app.get("/leaderboard", (req, res) => {
  res.json(
    Object.values(leaderboard)
      .sort((a, b) => b.totalWon - a.totalWon)
      .slice(0, 10)
  );
});

const server = app.listen(3000, () =>
  console.log("Backend running on 3000")
);

const wss = new WebSocketServer({ server });
function broadcast(data) {
  wss.clients.forEach(
    (c) => c.readyState === 1 && c.send(JSON.stringify(data))
  );
}
