const BACKEND_URL = "http://localhost:3000"; // change after deploy
const $ = id => document.getElementById(id);

let currentUser = null;
let soundEnabled = true;
let isSpinning = false;

const rowEls = [$("row0"), $("row1"), $("row2")];
const jackpotSpan = $("jackpot");
const balanceSpan = $("balance");

const socket = new WebSocket("ws://localhost:3000");

socket.onmessage = e => {
  const data = JSON.parse(e.data);
  if (data.type === "jackpot") jackpotSpan.textContent = data.value;
};

function signup() {
  localStorage.setItem("user", $("email").value);
  alert("Signup done");
}

function login() {
  currentUser = $("email").value;
  $("authBox").classList.add("hidden");
  $("gameControls").classList.remove("hidden");
  $("slotArea").classList.remove("hidden");
  $("balanceBox").classList.remove("hidden");
  $("userBar").classList.remove("hidden");
  $("result").textContent = "Welcome!";
}

function logout() {
  location.reload();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
}

async function play() {
  if (isSpinning) return;
  isSpinning = true;

  const bet = +$("bet").value;
  const lines = +$("lines").value;

  const res = await fetch(`${BACKEND_URL}/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: currentUser,
      bet,
      lines,
      nonce: Date.now()
    })
  });

  const data = await res.json();

  data.rows.forEach((row, i) => {
    rowEls[i].textContent = row.join(" | ");
  });

  balanceSpan.textContent =
    (+balanceSpan.textContent || 0) + data.win;

  $("result").textContent =
    data.win > 0 ? `🎉 Won ${data.win}` : "😢 No win";

  isSpinning = false;
}

async function loadLeaderboard() {
  const res = await fetch(`${BACKEND_URL}/leaderboard`);
  const data = await res.json();
  const list = $("leaderboard");
  list.innerHTML = "";
  data.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.userId} — $${p.totalWon}`;
    list.appendChild(li);
  });
}

setInterval(loadLeaderboard, 5000);

function resetJackpot() {
  fetch(`${BACKEND_URL}/admin/reset-jackpot`, {
    method: "POST",
    headers: { "x-admin-key": "super-secret-admin-key" }
  });
}
