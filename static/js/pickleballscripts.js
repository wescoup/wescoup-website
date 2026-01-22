// Tony's Pickleball Singles Tracker JavaScript
// Dynamic scoring + automatic server tracking for singles
// Supports: side-out scoring and rally scoring
//
// Public functions referenced by HTML (do not rename):
// initializeTracker, startNewMatch, updateScoringType, showSection, collectMatchInfo,
// updateAllDisplays, updateReturnerDisplay, adjustGame, updateScoreDisplay, toggleServer,
// updateServerButton, recordReturn, recordUnforcedError, recordThirdShotMiss, undoLastPoint,
// saveCurrentMatch, loadAllMatches, activateMatch, deleteMatch, renderSavedMatchesList,
// renderResults, showResultsView, generatePdf

(() => {
  "use strict";

  const STORAGE_KEY = "singlesPickleballMatches";

  // Views
  let currentView = "match-info";
  let currentResultsView = 0;
  const totalResultsViews = 3; // Summary, P1, P2

  // In-memory state
  let matchData = null;
  let allMatches = [];

  // ---------- State helpers ----------
  function todayISO() {
    return new Date().toISOString().split("T")[0];
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

    function newMatchTemplate() {
    return {
      id: null,
      players: { player1: "P1", player2: "P2" },
      location: "Local Court",
      date: todayISO(),
      scoringType: "rally", // 'rally' | 'sideout'
      // scores are per-game arrays, always append/pop the last game
      scores: { player1: [0], player2: [0] },
      currentServer: "player1",
      pointHistory: [], // chronological events
      // Event-based UI flag: true only immediately after a side-out rally (side-out scoring + returner won)
      lastWasSideOut: false
    };
  }

  function currentGameIndex() {
    return matchData.scores.player1.length - 1;
  }

  function otherPlayer(pKey) {
    return pKey === "player1" ? "player2" : "player1";
  }

  // Singles court-side is determined by the *server's* score parity for that game:
  // even => deuce (right), odd => ad (left)
  function getServerSideForCurrentGame() {
    const g = currentGameIndex();
    const s = matchData.currentServer;
    const serverScore = matchData.scores[s][g] || 0;
    return (serverScore % 2 === 0) ? "deuce" : "ad";
  }

  // Internal "expected next server" is the same as currentServer after applying rules.
  function applySinglesRulesAfterRally({ returnWon }) {
    const g = currentGameIndex();
    const server = matchData.currentServer;
    const returner = otherPlayer(server);

    if (matchData.scoringType === "rally") {
      const winner = returnWon ? returner : server;
      matchData.scores[winner][g] = (matchData.scores[winner][g] || 0) + 1;
      matchData.currentServer = winner; // winner serves next (standard rally convention)
      return;
    }

    // side-out (traditional)
    if (returnWon) {
      // side-out, no point
      matchData.currentServer = returner;
      return;
    }

    // server won => point for server, keep serve
    matchData.scores[server][g] = (matchData.scores[server][g] || 0) + 1;
    // currentServer unchanged
  }

    function takeStateSnapshot() {
    const g = currentGameIndex();
    return {
      gameIndex: g,
      scores: {
        player1: matchData.scores.player1[g],
        player2: matchData.scores.player2[g]
      },
      currentServer: matchData.currentServer,
      lastWasSideOut: !!matchData.lastWasSideOut
    };
  }

    function restoreStateSnapshot(snap) {
    if (!snap || typeof snap.gameIndex !== "number") return;

    const g = snap.gameIndex;
    // Ensure arrays are long enough (defensive)
    while (matchData.scores.player1.length <= g) matchData.scores.player1.push(0);
    while (matchData.scores.player2.length <= g) matchData.scores.player2.push(0);

    matchData.scores.player1[g] = snap.scores.player1 ?? 0;
    matchData.scores.player2[g] = snap.scores.player2 ?? 0;
    matchData.currentServer = snap.currentServer || "player1";
    matchData.lastWasSideOut = !!snap.lastWasSideOut;
  }

  // ---------- DOM helpers ----------
  function $(id) {
    return document.getElementById(id);
  }

  function safeText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function getAbbrev(playerKey) {
    const name = matchData.players[playerKey] || (playerKey === "player1" ? "P1" : "P2");
    return (name.trim()[0] || (playerKey === "player1" ? "P" : "P")).toUpperCase();
  }

  // ---------- Initialization ----------
  document.addEventListener("DOMContentLoaded", initializeTracker);

  function initializeTracker() {
    loadAllMatches();
    startNewMatch();

    // Prefill match info inputs
    $("player1").value = matchData.players.player1;
    $("player2").value = matchData.players.player2;
    $("location").value = matchData.location;
    $("matchDate").value = matchData.date;
    $("scoringType").value = matchData.scoringType;

    renderSavedMatchesList();
    showSection("match-info");
    initializeSwipeHandlers();
  }

  // ---------- Navigation / Views ----------
  function showSection(sectionId) {
    // collect info when entering tracker
    if (sectionId === "match-tracker") collectMatchInfo();

    ["match-info", "match-tracker", "results", "saved-matches"].forEach(id => {
      const el = $(id);
      if (el) el.style.display = (id === sectionId ? "block" : "none");
    });

    currentView = sectionId;

    if (sectionId === "match-tracker") {
      updateAllDisplays();
    } else if (sectionId === "results") {
      renderResults();
    } else if (sectionId === "saved-matches") {
      renderSavedMatchesList();
    }
  }

  function updateScoringType() {
    if (!matchData) return;
    matchData.scoringType = $("scoringType").value;
  }

  function collectMatchInfo() {
    if (!matchData) return;

    matchData.players.player1 = $("player1").value.trim() || "P1";
    matchData.players.player2 = $("player2").value.trim() || "P2";
    matchData.location = $("location").value.trim() || "Local Court";
    matchData.date = $("matchDate").value || todayISO();
    matchData.scoringType = $("scoringType").value;

    // If server was never set (new match), default to P1
    if (!matchData.currentServer) matchData.currentServer = "player1";
  }

  // ---------- Display updates ----------
  function updateAllDisplays() {
    if (currentView !== "match-tracker" || !matchData) return;

    updateServerButton();
    updateScoreDisplay();
    updateReturnerDisplay();
    updateReturnStringsDisplay();
    updateUnforcedErrorDisplay();
    updateThirdShotDisplay();
  }

  function updateScoreDisplay() {
    if (!matchData) return;
    const g = currentGameIndex();
    safeText("player1NameScore", matchData.players.player1);
    safeText("player2NameScore", matchData.players.player2);
    safeText("player1Score", String(matchData.scores.player1[g] ?? 0));
    safeText("player2Score", String(matchData.scores.player2[g] ?? 0));
    safeText("currentGame", String(g + 1));
  }

    function updateServerButton() {
    const btn = $("server-toggle-btn");
    if (!btn || !matchData) return;

    const serverKey = matchData.currentServer;
    const serverName = matchData.players[serverKey];
    const side = getServerSideForCurrentGame();

    const sideOutSuffix = matchData.lastWasSideOut ? " - Side Out" : "";
    btn.textContent = `Serving: ${serverName} (${side === "deuce" ? "Deuce" : "Ad"})${sideOutSuffix}`;
  }

  function updateReturnerDisplay() {
    if (!matchData) return;
    const returnerKey = otherPlayer(matchData.currentServer);
    const returnerName = matchData.players[returnerKey];
    safeText("currentReturner", `Current Returner: ${returnerName}`);
  }

  // ---------- Match actions ----------
  function startNewMatch() {
    matchData = newMatchTemplate();
  }

    function adjustGame(change) {
    const newGameCount = matchData.scores.player1.length + change;
    if (newGameCount <= 0) return;

    if (change > 0) {
      matchData.scores.player1.push(0);
      matchData.scores.player2.push(0);
    } else if (matchData.scores.player1.length > 1) {
      // Pop last game's score and remove any pointHistory entries tied to that game
      const removedIndex = matchData.scores.player1.length - 1;
      matchData.scores.player1.pop();
      matchData.scores.player2.pop();
      matchData.pointHistory = matchData.pointHistory.filter(p => p.gameIndex !== removedIndex);
    }

    // Reset server to P1 when changing games (simple, consistent default)
    matchData.currentServer = matchData.currentServer || "player1";
    matchData.lastWasSideOut = false;
    updateAllDisplays();
  }

    function toggleServer() {
    // Manual override: user can set server at any time
    matchData.currentServer = otherPlayer(matchData.currentServer);
    // Side-out label reflects the last rally outcome; manual changes should clear it.
    matchData.lastWasSideOut = false;
    updateAllDisplays();
  }

  // ---------- Event recording ----------
  // court: 'deuce' | 'ad' (receiver side that made the return)
  // won: true if returner won the rally, false if server won
    // court: 'deuce' | 'ad' (receiver side that made the return)
  // won: true if returner won the rally, false if server won
  function recordReturn(court, won) {
    if (!matchData) return;

    const g = currentGameIndex();
    const server = matchData.currentServer;
    const returner = otherPlayer(server);

    const prev = takeStateSnapshot();

    // Side-out label is event-based: only true immediately after a side-out rally.
    matchData.lastWasSideOut = (matchData.scoringType === "sideout" && !!won);

    // Apply scoring + server rules
    applySinglesRulesAfterRally({ returnWon: !!won });

    // Store event for analytics + undo
    matchData.pointHistory.push({
      type: "return",
      gameIndex: g,
      server,
      returner,
      side: court,              // receiver side that hit the return
      outcome: won ? "R" : "S",  // rally winner relative to the return (R=returner won, S=server won)
      prevState: prev
    });

    updateAllDisplays();
  }

  function recordUnforcedError(playerKey) {
    if (!matchData) return;
    matchData.pointHistory.push({
      type: "unforcedError",
      gameIndex: currentGameIndex(),
      playerKey
    });
    updateUnforcedErrorDisplay();
  }

  function recordThirdShotMiss(playerKey) {
    if (!matchData) return;
    matchData.pointHistory.push({
      type: "thirdShotMiss",
      gameIndex: currentGameIndex(),
      playerKey,
      position: playerKey === matchData.currentServer ? "S" : "R"
    });
    updateThirdShotDisplay();
  }

  function undoLastPoint() {
    if (!matchData || matchData.pointHistory.length === 0) return;

    const last = matchData.pointHistory.pop();
    if (last && last.prevState) {
      restoreStateSnapshot(last.prevState);
    }

    updateAllDisplays();
  }

  // ---------- Displays: return strings ----------
  function updateReturnStringsDisplay() {
    if (!matchData) return;

    const g = currentGameIndex();
    const serverKey = matchData.currentServer;
    const returnerKey = otherPlayer(serverKey);

    // Build strings for the *current returner* (so the UI aligns with "Current Returner")
    const events = matchData.pointHistory.filter(p => p.type === "return" && p.gameIndex === g && p.returner === returnerKey);

    const strings = { deuce: "", ad: "" };
    for (const e of events) {
      const symbol = (e.outcome === "R") ? "W" : "L"; // W/L from returner's perspective
      if (e.side === "deuce") strings.deuce += symbol;
      if (e.side === "ad") strings.ad += symbol;
    }

    safeText("deuce_return_str", strings.deuce || "-");
    safeText("ad_return_str", strings.ad || "-");
  }

  // ---------- Displays: Unforced errors ----------
  function updateUnforcedErrorDisplay() {
    if (currentView !== "match-tracker" || !matchData) return;

    const g = currentGameIndex();
    const tally = { player1: 0, player2: 0 };

    matchData.pointHistory
      .filter(p => p.type === "unforcedError" && p.gameIndex === g)
      .forEach(p => { if (tally[p.playerKey] != null) tally[p.playerKey] += 1; });

    const p1 = `${getAbbrev("player1")}`;
    const p2 = `${getAbbrev("player2")}`;
    $("p1_ue").textContent = p1;
    $("p2_ue").textContent = p2;

    $("ueTally").innerHTML = `
      <div style="display:flex;justify-content:space-between;">
        <span>${matchData.players.player1}: <b>${tally.player1}</b></span>
        <span>${matchData.players.player2}: <b>${tally.player2}</b></span>
      </div>`;
  }

  // ---------- Displays: Third shot misses ----------
  function updateThirdShotDisplay() {
    if (currentView !== "match-tracker" || !matchData) return;

    const serverKey = matchData.currentServer;

    $("p1_3rd").textContent = `${getAbbrev("player1")}-${("player1" === serverKey) ? "S" : "R"}`;
    $("p2_3rd").textContent = `${getAbbrev("player2")}-${("player2" === serverKey) ? "R" : "S"}`;

    const g = currentGameIndex();
    const tally = { player1: 0, player2: 0 };
    matchData.pointHistory
      .filter(p => p.type === "thirdShotMiss" && p.gameIndex === g)
      .forEach(p => { if (tally[p.playerKey] != null) tally[p.playerKey] += 1; });

    $("3rdShotMissTally").innerHTML = `
      <div style="display:flex;justify-content:space-between;">
        <span>${matchData.players.player1}: <b>${tally.player1}</b></span>
        <span>${matchData.players.player2}: <b>${tally.player2}</b></span>
      </div>`;
  }

  // ---------- Persistence ----------
  function loadAllMatches() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      allMatches = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(allMatches)) allMatches = [];
    } catch {
      allMatches = [];
    }
  }

  function saveAllMatches() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allMatches));
  }

  function saveCurrentMatch() {
    if (!matchData) return;

    // Ensure match info is current
    collectMatchInfo();

    if (!matchData.id) {
      matchData.id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      allMatches.unshift(deepClone(matchData));
    } else {
      const idx = allMatches.findIndex(m => m.id === matchData.id);
      if (idx >= 0) allMatches[idx] = deepClone(matchData);
      else allMatches.unshift(deepClone(matchData));
    }

    saveAllMatches();
    renderSavedMatchesList();
    showSection("saved-matches");
  }

  function activateMatch(matchId) {
    const found = allMatches.find(m => m.id === matchId);
    if (!found) return;
    matchData = deepClone(found);

    // Sync inputs
    $("player1").value = matchData.players.player1;
    $("player2").value = matchData.players.player2;
    $("location").value = matchData.location;
    $("matchDate").value = matchData.date;
    $("scoringType").value = matchData.scoringType;

    showSection("match-tracker");
  }

  function deleteMatch(matchId) {
    allMatches = allMatches.filter(m => m.id !== matchId);
    saveAllMatches();
    renderSavedMatchesList();
  }

  function renderSavedMatchesList() {
    const list = $("saved-matches-list");
    if (!list) return;

    loadAllMatches();

    if (allMatches.length === 0) {
      list.innerHTML = `<div style="opacity:.8;">No saved matches yet.</div>`;
      return;
    }

    list.innerHTML = allMatches.map(m => {
      const p1 = m.players?.player1 ?? "P1";
      const p2 = m.players?.player2 ?? "P2";
      const loc = m.location ?? "";
      const date = m.date ?? "";
      const st = m.scoringType ?? "rally";
      return `
        <div class="saved-match-card" style="margin:10px 0; padding:10px; border:1px solid #ccc; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
            <div>
              <div style="font-weight:700;">${p1} vs ${p2}</div>
              <div style="font-size:.9em; opacity:.85;">${date} • ${loc} • ${st}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button onclick="activateMatch('${m.id}')">Open</button>
              <button onclick="deleteMatch('${m.id}')" style="opacity:.8;">Delete</button>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  // ---------- Results ----------
  function renderResults() {
    const container = $("results");
    if (!container || !matchData) return;

    container.innerHTML = generateAllResultsViewsHTML();
    populateAllResultsViews();
    showResultsView(currentResultsView);
  }

  function showResultsView(viewIndex) {
    currentResultsView = Math.max(0, Math.min(totalResultsViews - 1, viewIndex));

    for (let i = 0; i < totalResultsViews; i++) {
      const el = $(`results-view-${i}`);
      if (el) el.style.display = (i === currentResultsView ? "block" : "none");
    }
  }

  function generateAllResultsViewsHTML() {
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px;">
        <button onclick="showResultsView(${Math.max(0, currentResultsView - 1)})">◀</button>
        <div style="font-weight:700;">Results</div>
        <button onclick="showResultsView(${Math.min(totalResultsViews - 1, currentResultsView + 1)})">▶</button>
      </div>

      <div id="results-view-0"></div>
      <div id="results-view-1" style="display:none;"></div>
      <div id="results-view-2" style="display:none;"></div>

      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
        <button onclick="saveCurrentMatch()">💾 Save Match</button>
        <button onclick="generatePdf()">📄 Export PDF</button>
      </div>
    `;
  }

  function calculateAllStats() {
    const gCount = matchData.scores.player1.length;
    const perGame = [];
    for (let i = 0; i < gCount; i++) {
      perGame.push({
        game: i + 1,
        p1: matchData.scores.player1[i] ?? 0,
        p2: matchData.scores.player2[i] ?? 0
      });
    }

    const totals = perGame.reduce((acc, r) => {
      acc.p1 += r.p1;
      acc.p2 += r.p2;
      return acc;
    }, { p1: 0, p2: 0 });

    const g = currentGameIndex();
    const ue = { player1: 0, player2: 0 };
    const tsm = { player1: 0, player2: 0 };

    matchData.pointHistory.filter(p => p.type === "unforcedError").forEach(p => ue[p.playerKey]++);
    matchData.pointHistory.filter(p => p.type === "thirdShotMiss").forEach(p => tsm[p.playerKey]++);

    // Return win rate per player (as returner)
    const returns = matchData.pointHistory.filter(p => p.type === "return");
    const rw = { player1: { w: 0, t: 0 }, player2: { w: 0, t: 0 } };
    for (const r of returns) {
      rw[r.returner].t += 1;
      if (r.outcome === "R") rw[r.returner].w += 1;
    }

    return { perGame, totals, ue, tsm, rw };
  }

  function populateAllResultsViews() {
    const stats = calculateAllStats();
    const p1 = matchData.players.player1;
    const p2 = matchData.players.player2;

    const summaryEl = $("results-view-0");
    const p1El = $("results-view-1");
    const p2El = $("results-view-2");

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="padding:10px; border:1px solid #ddd; border-radius:12px;">
          <div style="font-size:1.05em; font-weight:800; margin-bottom:6px;">${p1} vs ${p2}</div>
          <div style="opacity:.85; margin-bottom:10px;">${matchData.date} • ${matchData.location} • ${matchData.scoringType}</div>

          <div style="margin-bottom:10px;">
            <div style="font-weight:700; margin-bottom:6px;">Scores by Game</div>
            ${stats.perGame.map(r => `<div>Game ${r.game}: <b>${r.p1}</b> - <b>${r.p2}</b></div>`).join("")}
            <div style="margin-top:8px;">Total: <b>${stats.totals.p1}</b> - <b>${stats.totals.p2}</b></div>
          </div>

          <div style="display:flex; gap:16px; flex-wrap:wrap;">
            <div><b>Unforced Errors</b><br>${p1}: ${stats.ue.player1}<br>${p2}: ${stats.ue.player2}</div>
            <div><b>3rd Shot Misses</b><br>${p1}: ${stats.tsm.player1}<br>${p2}: ${stats.tsm.player2}</div>
          </div>
        </div>
      `;
    }

    function playerView(playerKey) {
      const name = matchData.players[playerKey];
      const asReturner = stats.rw[playerKey];
      const pct = asReturner.t ? Math.round((asReturner.w / asReturner.t) * 100) : 0;
      return `
        <div style="padding:10px; border:1px solid #ddd; border-radius:12px;">
          <div style="font-size:1.05em; font-weight:800; margin-bottom:8px;">${name}</div>
          <div style="margin-bottom:10px;">
            <div><b>Return Wins</b>: ${asReturner.w} / ${asReturner.t} (${pct}%)</div>
            <div><b>Unforced Errors</b>: ${stats.ue[playerKey]}</div>
            <div><b>3rd Shot Misses</b>: ${stats.tsm[playerKey]}</div>
          </div>
          <div style="opacity:.85; font-size:.95em;">
            Note: Return wins are logged when this player was the returner and won the rally.
          </div>
        </div>
      `;
    }

    if (p1El) p1El.innerHTML = playerView("player1");
    if (p2El) p2El.innerHTML = playerView("player2");
  }

  // ---------- PDF export ----------
  function generatePdf() {
    if (!matchData || typeof window.jspdf === "undefined") {
      alert("PDF library not loaded.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const stats = calculateAllStats();
    const p1 = matchData.players.player1;
    const p2 = matchData.players.player2;

    doc.setFontSize(14);
    doc.text(`Pickleball Singles Match`, 14, 16);
    doc.setFontSize(11);
    doc.text(`${p1} vs ${p2}`, 14, 24);
    doc.text(`${matchData.date} • ${matchData.location} • ${matchData.scoringType}`, 14, 30);

    // Scores table
    const scoreRows = stats.perGame.map(r => [`Game ${r.game}`, String(r.p1), String(r.p2)]);
    if (doc.autoTable) {
      doc.autoTable({
        startY: 36,
        head: [["Game", p1, p2]],
        body: scoreRows,
      });

      const y = doc.lastAutoTable.finalY + 8;
      doc.text(`Totals: ${stats.totals.p1} - ${stats.totals.p2}`, 14, y);

      const y2 = y + 8;
      doc.text(`Unforced Errors: ${p1} ${stats.ue.player1}, ${p2} ${stats.ue.player2}`, 14, y2);
      doc.text(`3rd Shot Misses: ${p1} ${stats.tsm.player1}, ${p2} ${stats.tsm.player2}`, 14, y2 + 6);
    } else {
      // Fallback if autoTable isn't available
      let y = 40;
      doc.text("Scores by Game:", 14, y); y += 6;
      for (const r of stats.perGame) {
        doc.text(`Game ${r.game}: ${r.p1} - ${r.p2}`, 14, y); y += 6;
      }
      y += 4;
      doc.text(`Totals: ${stats.totals.p1} - ${stats.totals.p2}`, 14, y); y += 6;
      doc.text(`Unforced Errors: ${p1} ${stats.ue.player1}, ${p2} ${stats.ue.player2}`, 14, y); y += 6;
      doc.text(`3rd Shot Misses: ${p1} ${stats.tsm.player1}, ${p2} ${stats.tsm.player2}`, 14, y);
    }

    const filename = `pickleball_singles_${matchData.date}_${p1}_vs_${p2}.pdf`.replace(/\s+/g, "_");
    doc.save(filename);
  }

  // ---------- Swipe handlers (mobile results paging) ----------
  function initializeSwipeHandlers() {
    let startX = null;

    document.addEventListener("touchstart", (e) => {
      if (currentView !== "results") return;
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
      if (currentView !== "results") return;
      if (startX == null) return;

      const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null;
      if (endX == null) return;

      const dx = endX - startX;
      startX = null;

      if (Math.abs(dx) < 40) return;
      if (dx < 0) showResultsView(currentResultsView + 1);
      else showResultsView(currentResultsView - 1);
    }, { passive: true });
  }

  // ---------- Expose functions for inline onclick handlers ----------
  window.initializeTracker = initializeTracker;
  window.startNewMatch = startNewMatch;
  window.updateScoringType = updateScoringType;
  window.showSection = showSection;
  window.collectMatchInfo = collectMatchInfo;
  window.updateAllDisplays = updateAllDisplays;
  window.updateReturnerDisplay = updateReturnerDisplay;
  window.adjustGame = adjustGame;
  window.updateScoreDisplay = updateScoreDisplay;
  window.toggleServer = toggleServer;
  window.updateServerButton = updateServerButton;
  window.recordReturn = recordReturn;
  window.recordUnforcedError = recordUnforcedError;
  window.recordThirdShotMiss = recordThirdShotMiss;
  window.undoLastPoint = undoLastPoint;
  window.updateReturnStringsDisplay = updateReturnStringsDisplay;
  window.updateUnforcedErrorDisplay = updateUnforcedErrorDisplay;
  window.updateThirdShotDisplay = updateThirdShotDisplay;
  window.saveCurrentMatch = saveCurrentMatch;
  window.loadAllMatches = loadAllMatches;
  window.activateMatch = activateMatch;
  window.deleteMatch = deleteMatch;
  window.renderSavedMatchesList = renderSavedMatchesList;
  window.renderResults = renderResults;
  window.showResultsView = showResultsView;
  window.initializeSwipeHandlers = initializeSwipeHandlers;
  window.generateAllResultsViewsHTML = generateAllResultsViewsHTML;
  window.calculateAllStats = calculateAllStats;
  window.populateAllResultsViews = populateAllResultsViews;
  window.generatePdf = generatePdf;
})();
