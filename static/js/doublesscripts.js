// Tony's Doubles Tracker JavaScript - CLEAN VERSION
console.log('🎾 doublesscripts.js loading...');

let doublesMatch = {
    players: { player1: 'P1', player2: 'P2', player3: 'P3', player4: 'P4' },
    location: '', surface: 'Hard', date: '', currentSet: 1, currentServer: 'player1',
    scores: { team1: [0], team2: [0] },
    returners: { deuce: 'player3', ad: 'player4' },
    stats: {
        player1: { firstServe: '', secondServe: '', firstServeWins: 0, firstServeLosses: 0, secondServeWins: 0, secondServeLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player2: { firstServe: '', secondServe: '', firstServeWins: 0, firstServeLosses: 0, secondServeWins: 0, secondServeLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player3: { firstServe: '', secondServe: '', firstServeWins: 0, firstServeLosses: 0, secondServeWins: 0, secondServeLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player4: { firstServe: '', secondServe: '', firstServeWins: 0, firstServeLosses: 0, secondServeWins: 0, secondServeLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } }
    },
    secondShotHistory: []
};

function showSection(sectionId) {
    console.log('showSection called with:', sectionId);
    document.querySelectorAll('.tennis-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.tennis-nav-btn').forEach(btn => btn.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');
    const activeButton = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeButton) activeButton.classList.add('active');
    if (sectionId === 'match-tracker') startMatch();
    else if (sectionId === 'results') { currentResultsPage = 1; updateResultsDisplay(); }
}

function startMatch() {
    doublesMatch.players.player1 = document.getElementById('player1').value.trim() || 'P1';
    doublesMatch.players.player2 = document.getElementById('player2').value.trim() || 'P2';
    doublesMatch.players.player3 = document.getElementById('player3').value.trim() || 'P3';
    doublesMatch.players.player4 = document.getElementById('player4').value.trim() || 'P4';
    doublesMatch.location = document.getElementById('location').value.trim() || 'Local Court';
    doublesMatch.surface = document.getElementById('surface').value;
    doublesMatch.date = document.getElementById('matchDate').value;
    updateServerDropdown();
    updateAllDisplays();
}

function updateServerDropdown() {
    const serverSelect = document.getElementById('currentServer');
    if (serverSelect) {
        serverSelect.innerHTML = `
            <option value="player1">${doublesMatch.players.player1}</option>
            <option value="player2">${doublesMatch.players.player2}</option>
            <option value="player3">${doublesMatch.players.player3}</option>
            <option value="player4">${doublesMatch.players.player4}</option>
        `;
        serverSelect.value = doublesMatch.currentServer;
    }
}

function getPlayerAbbrev(playerKey) {
    const name = doublesMatch.players[playerKey];
    return name.substring(0, Math.min(3, name.length)).toUpperCase();
}

function getPlayerPosition(playerKey) {
    const currentServer = doublesMatch.currentServer;
    const deuceReturner = doublesMatch.returners.deuce;
    const adReturner = doublesMatch.returners.ad;
    
    if (playerKey === currentServer) return 'S';
    
    let serverPartner;
    if (currentServer === 'player1' || currentServer === 'player2') {
        serverPartner = (currentServer === 'player1') ? 'player2' : 'player1';
    } else {
        serverPartner = (currentServer === 'player3') ? 'player4' : 'player3';
    }
    
    if (playerKey === serverPartner) return 'N';
    if (playerKey === deuceReturner) return 'DC';
    if (playerKey === adReturner) return 'AC';
    return '?';
}

function updateAllDisplays() {
    updateScores();
    updateCurrentPositions();
    updateSecondShotButtons();
    updateServeStats();
    updateSecondShotTotals();
    updateReturnerDisplay();
}

function updateScores() {
    const currentSetIndex = doublesMatch.currentSet - 1;
    const team1ScoreEl = document.getElementById('team1Score');
    const team2ScoreEl = document.getElementById('team2Score');
    const currentSetEl = document.getElementById('currentSet');
    if (team1ScoreEl) team1ScoreEl.textContent = doublesMatch.scores.team1[currentSetIndex] || 0;
    if (team2ScoreEl) team2ScoreEl.textContent = doublesMatch.scores.team2[currentSetIndex] || 0;
    if (currentSetEl) currentSetEl.textContent = doublesMatch.currentSet;
}

function updateCurrentPositions() {
    const positionsEl = document.getElementById('currentPositions');
    if (!positionsEl) return;
    const p1Abbrev = getPlayerAbbrev('player1');
    const p2Abbrev = getPlayerAbbrev('player2');
    const p3Abbrev = getPlayerAbbrev('player3');
    const p4Abbrev = getPlayerAbbrev('player4');
    const p1Pos = getPlayerPosition('player1');
    const p2Pos = getPlayerPosition('player2');
    const p3Pos = getPlayerPosition('player3');
    const p4Pos = getPlayerPosition('player4');
    const positionsText = `🔵 ${p1Abbrev}(${p1Pos}) ${p2Abbrev}(${p2Pos}) vs 🔴 ${p3Abbrev}(${p3Pos}) ${p4Abbrev}(${p4Pos})`;
    positionsEl.textContent = positionsText;
}

function updateSecondShotButtons() {
    ['player1', 'player2', 'player3', 'player4'].forEach(playerKey => {
        const abbrev = getPlayerAbbrev(playerKey);
        const position = getPlayerPosition(playerKey);
        const buttonText = `${abbrev}-${position}`;
        const button = document.getElementById(`${playerKey}SecondShotBtn`);
        if (button) button.textContent = buttonText;
    });
}

function updateReturnerDisplay() {
    const deuceEl = document.getElementById('deuceReturner');
    const adEl = document.getElementById('adReturner');
    if (deuceEl) deuceEl.textContent = doublesMatch.players[doublesMatch.returners.deuce];
    if (adEl) adEl.textContent = doublesMatch.players[doublesMatch.returners.ad];
}

function adjustGames(team, change) {
    const currentSetIndex = doublesMatch.currentSet - 1;
    while (doublesMatch.scores.team1.length <= currentSetIndex) {
        doublesMatch.scores.team1.push(0);
        doublesMatch.scores.team2.push(0);
    }
    if (team === 'team1') {
        doublesMatch.scores.team1[currentSetIndex] = Math.max(0, doublesMatch.scores.team1[currentSetIndex] + change);
    } else {
        doublesMatch.scores.team2[currentSetIndex] = Math.max(0, doublesMatch.scores.team2[currentSetIndex] + change);
    }
    updateScores();
}

function adjustSet(change) {
    doublesMatch.currentSet = Math.max(1, Math.min(3, doublesMatch.currentSet + change));
    const currentSetIndex = doublesMatch.currentSet - 1;
    while (doublesMatch.scores.team1.length <= currentSetIndex) {
        doublesMatch.scores.team1.push(0);
        doublesMatch.scores.team2.push(0);
    }
    updateAllDisplays();
}

function updateServer() {
    doublesMatch.currentServer = document.getElementById('currentServer').value;
    updateAllDisplays();
}

function changeReturners() {
    const currentDeuce = doublesMatch.returners.deuce;
    const currentAd = doublesMatch.returners.ad;
    doublesMatch.returners.deuce = currentAd;
    doublesMatch.returners.ad = currentDeuce;
    updateAllDisplays();
}

function recordFirstServe(won) {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    stats.firstServe += won ? '1' : '0';
    if (won) stats.firstServeWins++; else stats.firstServeLosses++;
    updateServeStats();
}

function recordSecondServe(won) {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    stats.secondServe += won ? '1' : '0';
    if (won) stats.secondServeWins++; else stats.secondServeLosses++;
    updateServeStats();
}

function undoLastServe(serveType) {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    if (serveType === 'first') {
        const lastServe = stats.firstServe.slice(-1);
        if (lastServe) {
            stats.firstServe = stats.firstServe.slice(0, -1);
            if (lastServe === '1') stats.firstServeWins = Math.max(0, stats.firstServeWins - 1);
            else stats.firstServeLosses = Math.max(0, stats.firstServeLosses - 1);
        }
    } else {
        const lastServe = stats.secondServe.slice(-1);
        if (lastServe) {
            stats.secondServe = stats.secondServe.slice(0, -1);
            if (lastServe === '1') stats.secondServeWins = Math.max(0, stats.secondServeWins - 1);
            else stats.secondServeLosses = Math.max(0, stats.secondServeLosses - 1);
        }
    }
    updateServeStats();
}

function updateServeStats() {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    const firstServeEl = document.getElementById('firstServeDisplay');
    const secondServeEl = document.getElementById('secondServeDisplay');
    if (firstServeEl) firstServeEl.textContent = stats.firstServe || '-';
    if (secondServeEl) secondServeEl.textContent = stats.secondServe || '-';
    const firstTotal = stats.firstServeWins + stats.firstServeLosses;
    const secondTotal = stats.secondServeWins + stats.secondServeLosses;
    const firstPerc = firstTotal > 0 ? ((stats.firstServeWins / firstTotal) * 100).toFixed(1) : '0.0';
    const secondPerc = secondTotal > 0 ? ((stats.secondServeWins / secondTotal) * 100).toFixed(1) : '0.0';
    const firstPercEl = document.getElementById('firstServePercentage');
    const secondPercEl = document.getElementById('secondServePercentage');
    if (firstPercEl) firstPercEl.textContent = `${firstPerc}%`;
    if (secondPercEl) secondPercEl.textContent = `${secondPerc}%`;
}

function recordSecondShotMiss(playerKey) {
    const position = getPlayerPosition(playerKey);
    const stats = doublesMatch.stats[playerKey];
    console.log(`Recording second shot miss for ${playerKey} in position ${position}`);
    switch(position) {
        case 'S': stats.secondShotMisses.serving++; break;
        case 'N': stats.secondShotMisses.atNet++; break;
        case 'DC': stats.secondShotMisses.deuceCourt++; break;
        case 'AC': stats.secondShotMisses.adCourt++; break;
    }
    doublesMatch.secondShotHistory.push({ player: playerKey, position: position, timestamp: Date.now() });
    updateSecondShotTotals();
}

function undoSecondShotMiss() {
    if (doublesMatch.secondShotHistory.length === 0) return;
    const lastMiss = doublesMatch.secondShotHistory.pop();
    const stats = doublesMatch.stats[lastMiss.player];
    switch(lastMiss.position) {
        case 'S': stats.secondShotMisses.serving = Math.max(0, stats.secondShotMisses.serving - 1); break;
        case 'N': stats.secondShotMisses.atNet = Math.max(0, stats.secondShotMisses.atNet - 1); break;
        case 'DC': stats.secondShotMisses.deuceCourt = Math.max(0, stats.secondShotMisses.deuceCourt - 1); break;
        case 'AC': stats.secondShotMisses.adCourt = Math.max(0, stats.secondShotMisses.adCourt - 1); break;
    }
    updateSecondShotTotals();
}

function updateSecondShotTotals() {
    const team1Total = Object.values(doublesMatch.stats.player1.secondShotMisses).reduce((a, b) => a + b, 0) + Object.values(doublesMatch.stats.player2.secondShotMisses).reduce((a, b) => a + b, 0);
    const team2Total = Object.values(doublesMatch.stats.player3.secondShotMisses).reduce((a, b) => a + b, 0) + Object.values(doublesMatch.stats.player4.secondShotMisses).reduce((a, b) => a + b, 0);
    const team1El = document.getElementById('team1Misses');
    const team2El = document.getElementById('team2Misses');
    if (team1El) team1El.textContent = team1Total;
    if (team2El) team2El.textContent = team2Total;
}

function completeGame() {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    stats.firstServe += ',';
    stats.secondServe += ',';
    updateServeStats();
}

// Basic functions to get navigation working first
function initDoublesTracker() {
    const dateInput = document.getElementById('matchDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    updateAllDisplays();
}

function updateAllDisplays() {
    updateScores();
    updateCurrentPositions();
    updateSecondShotButtons();
    updateReturnerDisplay();
}

function updateScores() {
    const currentSetIndex = doublesMatch.currentSet - 1;
    const team1ScoreEl = document.getElementById('team1Score');
    const team2ScoreEl = document.getElementById('team2Score');
    const currentSetEl = document.getElementById('currentSet');
    if (team1ScoreEl) team1ScoreEl.textContent = doublesMatch.scores.team1[currentSetIndex] || 0;
    if (team2ScoreEl) team2ScoreEl.textContent = doublesMatch.scores.team2[currentSetIndex] || 0;
    if (currentSetEl) currentSetEl.textContent = doublesMatch.currentSet;
}

function getPlayerAbbrev(playerKey) {
    const name = doublesMatch.players[playerKey];
    return name.substring(0, Math.min(3, name.length)).toUpperCase();
}

function getPlayerPosition(playerKey) {
    const currentServer = doublesMatch.currentServer;
    const deuceReturner = doublesMatch.returners.deuce;
    const adReturner = doublesMatch.returners.ad;
    if (playerKey === currentServer) return 'S';
    let serverPartner;
    if (currentServer === 'player1' || currentServer === 'player2') {
        serverPartner = (currentServer === 'player1') ? 'player2' : 'player1';
    } else {
        serverPartner = (currentServer === 'player3') ? 'player4' : 'player3';
    }
    if (playerKey === serverPartner) return 'N';
    if (playerKey === deuceReturner) return 'DC';
    if (playerKey === adReturner) return 'AC';
    return '?';
}

function updateCurrentPositions() {
    const positionsEl = document.getElementById('currentPositions');
    if (!positionsEl) return;
    const p1Abbrev = getPlayerAbbrev('player1');
    const p2Abbrev = getPlayerAbbrev('player2');
    const p3Abbrev = getPlayerAbbrev('player3');
    const p4Abbrev = getPlayerAbbrev('player4');
    const p1Pos = getPlayerPosition('player1');
    const p2Pos = getPlayerPosition('player2');
    const p3Pos = getPlayerPosition('player3');
    const p4Pos = getPlayerPosition('player4');
    const positionsText = `🔵 ${p1Abbrev}(${p1Pos}) ${p2Abbrev}(${p2Pos}) vs 🔴 ${p3Abbrev}(${p3Pos}) ${p4Abbrev}(${p4Pos})`;
    positionsEl.textContent = positionsText;
}

function updateSecondShotButtons() {
    ['player1', 'player2', 'player3', 'player4'].forEach(playerKey => {
        const abbrev = getPlayerAbbrev(playerKey);
        const position = getPlayerPosition(playerKey);
        const buttonText = `${abbrev}-${position}`;
        const button = document.getElementById(`${playerKey}SecondShotBtn`);
        if (button) button.textContent = buttonText;
    });
}

function updateReturnerDisplay() {
    const deuceEl = document.getElementById('deuceReturner');
    const adEl = document.getElementById('adReturner');
    if (deuceEl) deuceEl.textContent = doublesMatch.players[doublesMatch.returners.deuce];
    if (adEl) adEl.textContent = doublesMatch.players[doublesMatch.returners.ad];
}

// Placeholder result functions for now
let currentResultsPage = 1;
function updateResultsDisplay() {
    const resultsEl = document.getElementById('resultsContent');
    if (resultsEl) resultsEl.innerHTML = '<h3>Results will show here</h3>';
}
function nextResultsPage() { console.log('Next page'); }
function previousResultsPage() { console.log('Previous page'); }
function takeScreenshot() { window.print(); }

document.addEventListener('DOMContentLoaded', initDoublesTracker);
window.doublesMatch = doublesMatch;
console.log('🎾 doublesscripts.js loaded successfully!');
