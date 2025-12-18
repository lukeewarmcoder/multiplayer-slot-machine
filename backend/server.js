import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const SYMBOLS = ["A","B","B","C","C","C","D","D","D","D"];
const VALUES = { A:10, B:6, C:4, D:2 };

let GLOBAL_JACKPOT = 5000;
const leaderboard = {};
const ADMIN_KEY = "super-secret-admin-key";

function rng(seed) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  let idx = 0;
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      const num = parseInt(hash.slice(idx, idx+8), 16);
      row.push(SYMBOLS[num % SYMBOLS.length]);
      idx += 8;
    }
    rows.push(row);
  }
  return rows;
}

app.post("/spin", (req, res) => {
  const { userId, bet, lines, nonce } = req.body;
  const rows = rng(userId + nonce);

  let win = 0;
  for (let i = 0; i < lines; i++) {
    if (rows[i][0] === rows[i][1] && rows[i][1] === rows[i][2]) {
      win += bet * VALUES[rows[i][0]];
    }
  }

  GLOBAL_JACKPOT += Math.floor(bet * lines * 0.1);

  if (!leaderboard[userId])
    leaderboard[userId] = { userId, totalWon: 0 };

  leaderboard[userId].totalWon += win;

  broadcast({ type: "jackpot", value: GLOBAL_JACKPOT });

  res.json({ rows, win, jackpot: GLOBAL_JACKPOT });
});

app.get("/leaderboard", (req, res) => {
  res.json(
    Object.values(leaderboard)
      .sort((a,b)=>b.totalWon-a.totalWon)
      .slice(0,10)
  );
});

app.post("/admin/reset-jackpot", (req,res)=>{
  if (req.headers["x-admin-key"] !== ADMIN_KEY)
    return res.sendStatus(403);
  GLOBAL_JACKPOT = 5000;
  broadcast({ type: "jackpot", value: GLOBAL_JACKPOT });
  res.json({ ok:true });
});

const server = app.listen(3000, () =>
  console.log("Backend running on 3000")
);

const wss = new WebSocketServer({ server });
function broadcast(data) {
  wss.clients.forEach(c => c.readyState === 1 && c.send(JSON.stringify(data)));
}
