var BACKEND_URL = "http://localhost:3000"; // change after deploy

function _el(id) {
  return document.getElementById(id);
}

var currentUser = null;
var soundEnabled = true;
var isSpinning = false;

// Stats tracking
var totalSpins = 0;
var totalWinnings = 0;
var biggestWin = 0;

// Audio objects
var spinSound = new Audio("sounds/spin.mp3");
var winSound = new Audio("sounds/win.mp3");
var jackpotSound = new Audio("sounds/jackpot.mp3");
var leverSound = new Audio("sounds/lever.mp3");

spinSound.loop = true;

var rowEls = [_el("row0"), _el("row1"), _el("row2")];
var jackpotSpan = _el("jackpot");
var balanceSpan = _el("balance");

var socket = new WebSocket("ws://localhost:3000");

socket.onmessage = function (e) {
  var data = JSON.parse(e.data);
  if (data.type === "jackpot") jackpotSpan.textContent = data.value;
};

function login() {
  var username = _el("email").value.trim();
  if (!username) {
    alert("Please enter a username");
    return;
  }
  currentUser = username;
  _el("authBox").classList.add("hidden");
  _el("gameControls").classList.remove("hidden");
  _el("slotArea").classList.remove("hidden");
  _el("balanceBox").classList.remove("hidden");
  _el("userBar").classList.remove("hidden");
  _el("jackpotBox").classList.remove("hidden");
  _el("statsBox").classList.remove("hidden");
  _el("result").textContent = "Welcome, " + currentUser + "!";
}

function logout() {
  location.reload();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
}

function playAudio(audio) {
  if (soundEnabled) {
    audio.currentTime = 0;
    audio.play().catch(function () {});
  }
}

function stopAudio(audio) {
  audio.pause();
  audio.currentTime = 0;
}

function updateStats(win) {
  totalSpins++;
  totalWinnings += win;
  if (win > biggestWin) biggestWin = win;
  _el("stat-spins").textContent = totalSpins;
  _el("stat-winnings").textContent = totalWinnings;
  _el("stat-biggest").textContent = biggestWin;
}

function renderRow(rowEl, symbols) {
  rowEl.innerHTML = "";
  symbols.forEach(function (sym) {
    var span = document.createElement("span");
    span.textContent = sym;
    span.className = "symbol symbol-" + sym;
    rowEl.appendChild(span);
  });
}

async function deposit() {
  var amount = +_el("deposit").value;
  if (amount <= 0 || !currentUser) {
    _el("result").textContent = "Enter a valid deposit amount";
    return;
  }

  try {
    var res = await fetch(BACKEND_URL + "/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser, amount: amount }),
    });

    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      _el("result").textContent = err.error || "Deposit failed";
      return;
    }

    var data = await res.json();
    balanceSpan.textContent = data.balance;
    _el("result").textContent = "Deposited $" + amount + "!";
    _el("deposit").value = "";
  } catch (err) {
    _el("result").textContent = "Network error, try again.";
  }
}

async function play() {
  if (isSpinning || !currentUser) return;
  isSpinning = true;

  var bet = +_el("bet").value;
  var lines = +_el("lines").value;

  if (bet <= 0 || ![1, 2, 3].includes(lines)) {
    _el("result").textContent = "Invalid bet or lines";
    isSpinning = false;
    return;
  }

  // Start spinning animation and audio
  playAudio(leverSound);
  rowEls.forEach(function (el) {
    el.classList.add("spinning");
  });
  playAudio(spinSound);

  try {
    var res = await fetch(BACKEND_URL + "/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser, bet: bet, lines: lines }),
    });

    // Wait for the spinning animation to play
    await new Promise(function (r) { setTimeout(r, 1000); });

    // Stop spinning
    stopAudio(spinSound);
    rowEls.forEach(function (el) {
      el.classList.remove("spinning");
    });

    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      _el("result").textContent = err.error || "Server error";
      isSpinning = false;
      return;
    }

    var data = await res.json();

    // Render symbols as individual spans
    data.rows.forEach(function (row, i) {
      renderRow(rowEls[i], row);
    });

    balanceSpan.textContent = data.balance;
    updateStats(data.win);

    if (data.jackpotWon) {
      playAudio(jackpotSound);
      _el("result").textContent = "JACKPOT! You won $" + data.win + "!";
    } else if (data.win > 0) {
      playAudio(winSound);
      _el("result").textContent = "Won $" + data.win;
    } else {
      _el("result").textContent = "No win";
    }
  } catch (err) {
    stopAudio(spinSound);
    rowEls.forEach(function (el) {
      el.classList.remove("spinning");
    });
    _el("result").textContent = "Network error, try again.";
  } finally {
    isSpinning = false;
  }
}

async function loadLeaderboard() {
  try {
    var res = await fetch(BACKEND_URL + "/leaderboard");
    var data = await res.json();
    var list = _el("leaderboard");
    list.innerHTML = "";
    data.forEach(function (p) {
      var li = document.createElement("li");
      li.textContent = p.userId + " - $" + p.totalWon;
      list.appendChild(li);
    });
  } catch (e) {
    // silently ignore leaderboard fetch errors
  }
}

setInterval(loadLeaderboard, 5000);
