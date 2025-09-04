// Tony's Doubles Tracker JavaScript (Rewritten v5.1 - Bug Fixes & Match History)

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let allMatches = [];
let currentView = 'match-info';
let currentResultsView = 0;
const totalResultsViews = 7;

// A clean slate for a new match, preserving structure
const initialMatchData = {
    id: null,
    players: { player1: 'Player 1', player2: 'Player 2', player3: 'Player 3', player4: 'Player 4' },
    teams: { team1: ['player1', 'player2'], team2: ['player3', 'player4'] },
    location: 'Local Court',
    surface: 'Hard',
    date: new Date().toISOString().split('T')[0],
    scores: { team1: [0], team2: [0] },
    pointHistory: [],
    returnerHistory: { team1: { deuce: 'player1', ad: 'player2' }, team2: { deuce: 'player3', ad: 'player4' } }
};

function initializeTracker() {
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
    loadAllMatches();
    startNewMatch();
    initializeSwipeHandlers();
}

function startNewMatch() {
    matchData = JSON.parse(JSON.stringify(initialMatchData));
    matchData.id = Date.now();
    
    // Reset input fields to defaults
    document.getElementById('player1').value = "Player 1";
    document.getElementById('player2').value = "Player 2";
    document.getElementById('player3').value = "Player 3";
    document.getElementById('player4').value = "Player 4";
    document.getElementById('location').value = "Local Court";
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];

    showSection('match-info');
}

function showSection(sectionId) {
    // If we are about to track, collect the info from the form first
    if (sectionId === 'match-tracker' && currentView === 'match-info') {
        collectMatchInfo();
    }
    currentView = sectionId;

    document.querySelectorAll('.tennis-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.tennis-nav-btn').forEach(b => b.classList.remove('active'));
    const activeButton = document.querySelector(`.tennis-nav-btn[onclick="showSection('${sectionId}')"]`);
    if (activeButton) activeButton.classList.add('active');
    
    // After showing the section, run appropriate render/update functions
    if (sectionId === 'match-tracker') updateAllDisplays();
    if (sectionId === 'results') renderResults();
    if (sectionId === 'saved-matches') renderSavedMatchesList();
}

function collectMatchInfo() {
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        matchData.players[pKey] = document.getElementById(pKey).value.trim() || `P${pKey.slice(-1)}`;
    });
    matchData.location = document.getElementById('location').value.trim() || 'Local Court';
    matchData.surface = document.getElementById('surface').value;
    matchData.date = document.getElementById('matchDate').value;
    
    matchData.returnerHistory = {
        team1: { deuce: 'player1', ad: 'player2' },
        team2: { deuce: 'player3', ad: 'player4' }
    };
    matchData.currentServer = 'player1';
    matchData.returners = { ...matchData.returnerHistory.team2 };
}

function updateAllDisplays() {
    if (currentView !== 'match-tracker') return;
    updateServerDropdown();
    updateScoreDisplay();
    updateReturnerDisplay();
    updateSecondShotDisplay();
    updateReturnStringsDisplay();
}

// --- SCORE & SET ---
function adjustGames(team, change) {
    const setIndex = matchData.scores.team1.length - 1;
    matchData.scores[team][setIndex] = Math.max(0, (matchData.scores[team][setIndex] || 0) + change);
    updateScoreDisplay();
}

function adjustSet(change) {
    const newSetCount = matchData.scores.team1.length + change;
    if (newSetCount > 0) {
        if (change > 0) {
            matchData.scores.team1.push(0);
            matchData.scores.team2.push(0);
        } else if (matchData.scores.team1.length > 1) {
            matchData.scores.team1.pop();
            matchData.scores.team2.pop();
        }
    }
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const setIndex = matchData.scores.team1.length - 1;
    document.getElementById('team1NameScore').textContent = `${getAbbrev('player1')}/${getAbbrev('player2')}`;
    document.getElementById('team2NameScore').textContent = `${getAbbrev('player3')}/${getAbbrev('player4')}`;
    document.getElementById('team1Score').textContent = matchData.scores.team1[setIndex] || 0;
    document.getElementById('team2Score').textContent = matchData.scores.team2[setIndex] || 0;
    document.getElementById('currentSet').textContent = matchData.scores.team1.length;
}

// --- SERVER & RETURNER ---
function updateServer() {
    const previousServer = matchData.currentServer;
    matchData.currentServer = document.getElementById('currentServer').value;
    if (matchData.teams.team1.includes(previousServer) !== matchData.teams.team1.includes(matchData.currentServer)) {
        const returningTeam = matchData.teams.team1.includes(matchData.currentServer) ? 'team2' : 'team1';
        matchData.returners = { ...matchData.returnerHistory[returningTeam] };
    }
    updateAllDisplays();
}

function changeReturners() {
    [matchData.returners.deuce, matchData.returners.ad] = [matchData.returners.ad, matchData.returners.deuce];
    const returningTeamKey = matchData.teams.team1.includes(matchData.currentServer) ? 'team2' : 'team1';
    matchData.returnerHistory[returningTeamKey] = { ...matchData.returners };
    updateAllDisplays();
}

function getAbbrev(playerKey) {
    if (matchData && matchData.players[playerKey]) {
        return matchData.players[playerKey].substring(0, 3);
    }
    return '';
}

function getInitial(playerKey) {
    if (matchData && matchData.players[playerKey]) {
        return matchData.players[playerKey].charAt(0).toUpperCase();
    }
    return '';
}

function updateServerDropdown() {
    const select = document.getElementById('currentServer');
    select.innerHTML = '';
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const option = document.createElement('option');
        option.value = pKey;
        option.textContent = matchData.players[pKey];
        select.appendChild(option);
    });
    select.value = matchData.currentServer;
}

function updateReturnerDisplay() {
    document.getElementById('deuceReturnerName').textContent = matchData.players[matchData.returners.deuce];
    document.getElementById('adReturnerName').textContent = matchData.players[matchData.returners.ad];
}

// --- POINT TRACKING ---
function recordReturn(court, serveType, won) {
    matchData.pointHistory.push({
        setIndex: matchData.scores.team1.length - 1,
        server: matchData.currentServer,
        returner: matchData.returners[court],
        serve: serveType,
        side: court,
        outcome: won ? '1' : '0',
        type: 'return',
        returnerHistory: JSON.parse(JSON.stringify(matchData.returnerHistory))
    });
    updateReturnStringsDisplay();
}

function recordSecondShotMiss(playerKey) {
    matchData.pointHistory.push({
        setIndex: matchData.scores.team1.length - 1,
        playerKey: playerKey,
        position: getPlayerPosition(playerKey),
        type: 'secondShotMiss'
    });
    updateSecondShotDisplay();
}

function undoLastPoint() {
    if (matchData.pointHistory.length === 0) return;
    matchData.pointHistory.pop();
    updateAllDisplays();
}

function gameComplete() {
    matchData.pointHistory.push({ setIndex: matchData.scores.team1.length - 1, type: 'gameComplete' });
    updateReturnStringsDisplay();
}

function updateReturnStringsDisplay() {
    if (currentView !== 'match-tracker') return;
    let lastGameBreak = -1;
    for (let i = matchData.pointHistory.length - 1; i >= 0; i--) {
        if (matchData.pointHistory[i].type === 'gameComplete') {
            lastGameBreak = i;
            break;
        }
    }
    const currentGamePoints = matchData.pointHistory.slice(lastGameBreak + 1);
    const strings = { deuce: { first: '', second: '' }, ad: { first: '', second: '' } };
    currentGamePoints.forEach(p => {
        if (p.type === 'return') strings[p.side][p.serve] += p.outcome;
    });
    document.getElementById('deuce_first_return_str').textContent = strings.deuce.first || "-";
    document.getElementById('deuce_second_return_str').textContent = strings.deuce.second || "-";
    document.getElementById('ad_first_return_str').textContent = strings.ad.first || "-";
    document.getElementById('ad_second_return_str').textContent = strings.ad.second || "-";
}

// --- SECOND SHOT DISPLAY ---
function getPlayerPosition(playerKey) {
    if (!matchData || !matchData.currentServer) return '';
    if (playerKey === matchData.currentServer) return 'S';
    if (playerKey === matchData.returners.deuce) return 'D';
    if (playerKey === matchData.returners.ad) return 'A';
    const serverTeam = matchData.teams.team1.includes(matchData.currentServer) ? 'team1' : 'team2';
    const serverPartner = matchData.teams[serverTeam].find(p => p !== matchData.currentServer);
    if (playerKey === serverPartner) return 'N';
    return '?';
}

function updateSecondShotDisplay() {
    if (currentView !== 'match-tracker') return;
    let tally = { player1:0, player2:0, player3:0, player4:0 };
    matchData.pointHistory.filter(p => p.type === 'secondShotMiss').forEach(p => tally[p.playerKey]++);
    
    let tallyHTML = '';
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        if (tally[pKey] > 0) tallyHTML += `<span>${getAbbrev(pKey)}: ${tally[pKey]}</span>`;
    });
    document.getElementById('ssMissTally').innerHTML = tallyHTML || '<span>No misses yet</span>';
    
    const positions = ['player1', 'player2', 'player3', 'player4'].map(pKey => `${getAbbrev(pKey)}(${getPlayerPosition(pKey)})`).join(' | ');
    document.getElementById('currentPositions').textContent = positions;
}

// --- LOCAL STORAGE & MATCH MANAGEMENT ---
function saveCurrentMatch() {
    const existingIndex = allMatches.findIndex(m => m.id === matchData.id);
    if (existingIndex > -1) {
        allMatches[existingIndex] = JSON.parse(JSON.stringify(matchData));
    } else {
        allMatches.push(JSON.parse(JSON.stringify(matchData)));
    }
    localStorage.setItem('doublesMatches', JSON.stringify(allMatches));
    alert(`Match "${matchData.date}" saved!`);
}

function loadAllMatches() {
    const saved = localStorage.getItem('doublesMatches');
    if (saved) allMatches = JSON.parse(saved);
}

function activateMatch(id) {
    const matchToLoad = allMatches.find(m => m.id === id);
    if (matchToLoad) {
        matchData = JSON.parse(JSON.stringify(matchToLoad));
        
        ['player1', 'player2', 'player3', 'player4', 'location', 'surface'].forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = matchData.players[key] || matchData[key];
        });
        document.getElementById('matchDate').value = matchData.date;

        showSection('match-tracker');
    }
}

function deleteMatch(id) {
    if (confirm('Are you sure you want to delete this match?')) {
        allMatches = allMatches.filter(m => m.id !== id);
        localStorage.setItem('doublesMatches', JSON.stringify(allMatches));
        renderSavedMatchesList();
    }
}

function renderSavedMatchesList() {
    const container = document.getElementById('saved-matches-list');
    if (allMatches.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No saved matches yet. Complete a match and save it from the Results tab.</p>';
        return;
    }
    
    let html = '';
    [...allMatches].reverse().forEach(match => {
        const t1p1 = match.players.player1;
        const t1p2 = match.players.player2;
        const t2p1 = match.players.player3;
        const t2p2 = match.players.player4;
        const score = `${match.scores.team1.join('-')} | ${match.scores.team2.join('-')}`;
        html += `<div class="stat-card" style="margin-bottom: 1rem; text-align: left;">
            <p style="font-weight: bold; font-size: 1.1rem;">${match.date} at ${match.location}</p>
            <p><b>Teams:</b> ${t1p1} & ${t1p2} vs ${t2p1} & ${t2p2}</p>
            <p><b>Final Score:</b> ${score}</p>
            <div class="tennis-btn-group" style="margin-top: 1rem;">
                <button class="tennis-btn" onclick="activateMatch(${match.id})">Load & Continue Tracking</button>
                <button class="tennis-btn" onclick="deleteMatch(${match.id})">Delete</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// --- RESULTS RENDERING & CALCULATION ---
function renderResults() {
    const container = document.getElementById('results');
    container.innerHTML = `
        <div class="results-navigation">
            ${Array.from({length: totalResultsViews}, (_, i) => `<div class="nav-dot ${i === 0 ? 'active' : ''}" onclick="showResultsView(${i})"></div>`).join('')}
        </div>
        <div class="swipe-hint">← Swipe to navigate →</div>
        <div id="results-views-container" style="overflow-x: hidden;">
            ${generateAllResultsViewsHTML()}
        </div>
    `;
    populateAllResultsViews();
    showResultsView(0);
}

function showResultsView(index) {
    currentResultsView = index;
    document.querySelectorAll('.results-view').forEach(v => v.style.display = 'none');
    const view = document.getElementById(`results-view-${index}`);
    if (view) view.style.display = 'block';
    document.querySelectorAll('.nav-dot').forEach((d, i) => d.classList.toggle('active', i === index));
}

function initializeSwipeHandlers() {
    let startX = 0;
    const container = document.getElementById('results');
    container.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    container.addEventListener('touchend', e => {
        if (currentView !== 'results' || startX === 0) return;
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        if (Math.abs(diffX) > 50) {
            if (diffX > 0 && currentResultsView < totalResultsViews - 1) showResultsView(currentResultsView + 1);
            else if (diffX < 0 && currentResultsView > 0) showResultsView(currentResultsView - 1);
        }
        startX = 0;
    });
}

function generateAllResultsViewsHTML() {
    let html = `
    <div class="results-view" id="results-view-0">
        <div class="view-title">📊 Match Summary</div>
        <div class="match-summary" id="summary-content">
            </div>
        <div class="tennis-btn-group" style="margin-top:1rem;">
            <button class="tennis-btn" onclick="saveCurrentMatch()">💾 Save Match</button>
            <button class="tennis-btn" onclick="generatePdf()">📄 Save as PDF</button>
        </div>
    </div>`;

    ['team1', 'team2'].forEach((teamKey, i) => {
        html += `<div class="results-view" id="results-view-${i+1}">
            <div class="view-title" id="${teamKey}-title"></div>
            <div class="team-card team-${i+1}" id="${teamKey}-results-card"></div>
        </div>`;
    });

    ['player1', 'player2', 'player3', 'player4'].forEach((pKey, i) => {
        html += `<div class="results-view" id="results-view-${i+3}">
             <div class="view-title" id="${pKey}-title"></div>
             <div class="player-card team-${i < 2 ? 1 : 2}" id="${pKey}-results-card"></div>
        </div>`;
    });
    return html;
}

function calculateAllStats() {
    const numSets = matchData.scores.team1.length;
    const stats = {}; 

    for (let i = -1; i < numSets; i++) {
        const key = i === -1 ? 'match' : `set${i}`;
        const periodStats = stats[key] = {
            team1: {}, team2: {}, player1: {}, player2: {}, player3: {}, player4: {}
        };
        const pointsInPeriod = i === -1 ? matchData.pointHistory : matchData.pointHistory.filter(p => p.setIndex === i);
        
        ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
            const pStats = periodStats[pKey] = {
                retDeuceFirstWon: 0, retDeuceFirstTotal: 0, retDeuceSecondWon: 0, retDeuceSecondTotal: 0,
                retAdFirstWon: 0, retAdFirstTotal: 0, retAdSecondWon: 0, retAdSecondTotal: 0,
                ssMisses: { S: 0, N: 0, D: 0, A: 0 }
            };
            pointsInPeriod.filter(p => p.type === 'return' && p.returner === pKey).forEach(p => {
                if (p.side === 'deuce' && p.serve === 'first') { pStats.retDeuceFirstTotal++; if (p.outcome === '1') pStats.retDeuceFirstWon++; }
                if (p.side === 'deuce' && p.serve === 'second') { pStats.retDeuceSecondTotal++; if (p.outcome === '1') pStats.retDeuceSecondWon++; }
                if (p.side === 'ad' && p.serve === 'first') { pStats.retAdFirstTotal++; if (p.outcome === '1') pStats.retAdFirstWon++; }
                if (p.side === 'ad' && p.serve === 'second') { pStats.retAdSecondTotal++; if (p.outcome === '1') pStats.retAdSecondWon++; }
            });
            pointsInPeriod.filter(p => p.type === 'secondShotMiss' && p.playerKey === pKey).forEach(p => pStats.ssMisses[p.position]++);
        });

        ['team1', 'team2'].forEach(teamKey => {
            const tStats = periodStats[teamKey];
            tStats.ret1stWon = 0; tStats.ret1stTotal = 0; tStats.ret2ndWon = 0; tStats.ret2ndTotal = 0;
            tStats.ssServing = 0; tStats.ssReturning = 0;

            matchData.teams[teamKey].forEach(pKey => {
                const pStats = periodStats[pKey];
                tStats.ret1stWon += pStats.retDeuceFirstWon + pStats.retAdFirstWon;
                tStats.ret1stTotal += pStats.retDeuceFirstTotal + pStats.retAdFirstTotal;
                tStats.ret2ndWon += pStats.retDeuceSecondWon + pStats.retAdSecondWon;
                tStats.ret2ndTotal += pStats.retDeuceSecondTotal + pStats.retAdSecondTotal;
                tStats.ssServing += pStats.ssMisses.S + pStats.ssMisses.N;
                tStats.ssReturning += pStats.ssMisses.D + pStats.ssMisses.A;
            });
        });
        
        ['team1', 'team2'].forEach(teamKey => {
             const tStats = periodStats[teamKey];
             const oppStats = periodStats[teamKey === 'team1' ? 'team2' : 'team1'];
             tStats.serv1stTotal = oppStats.ret1stTotal;
             tStats.serv1stWon = tStats.serv1stTotal - oppStats.ret1stWon;
             tStats.serv2ndTotal = oppStats.ret2ndTotal;
             tStats.serv2ndWon = tStats.serv2ndTotal - oppStats.ret2ndWon;
             tStats.serv1stInPct = (tStats.serv1stTotal + tStats.serv2ndTotal) > 0 ? (tStats.serv1stTotal / (tStats.serv1stTotal + tStats.serv2ndTotal)) * 100 : 0;
             tStats.serv1stWonPct = tStats.serv1stTotal > 0 ? (tStats.serv1stWon / tStats.serv1stTotal) * 100 : 0;
             tStats.serv2ndWonPct = tStats.serv2ndTotal > 0 ? (tStats.serv2ndWon / tStats.serv2ndTotal) * 100 : 0;
             tStats.ret1stWonPct = tStats.ret1stTotal > 0 ? (tStats.ret1stWon / tStats.ret1stTotal) * 100 : 0;
             tStats.ret2ndWonPct = tStats.ret2ndTotal > 0 ? (tStats.ret2ndWon / tStats.ret2ndTotal) * 100 : 0;
        });
    }

    const matchStats = stats['match'];
    const totalPoints = matchStats.team1.serv1stTotal + matchStats.team1.serv2ndTotal + matchStats.team2.serv1stTotal + matchStats.team2.serv2ndTotal;
    matchStats.team1.pointsWon = matchStats.team1.serv1stWon + matchStats.team1.serv2ndWon + matchStats.team1.ret1stWon + matchStats.team1.ret2ndWon;
    matchStats.team2.pointsWon = matchStats.team2.serv1stWon + matchStats.team2.serv2ndWon + matchStats.team2.ret1stWon + matchStats.team2.ret2ndWon;
    matchStats.team1.pointsWonPct = totalPoints > 0 ? (matchStats.team1.pointsWon / totalPoints) * 100 : 0;
    matchStats.team2.pointsWonPct = totalPoints > 0 ? (matchStats.team2.pointsWon / totalPoints) * 100 : 0;
    
    return stats;
}

function populateAllResultsViews() {
    const allStats = calculateAllStats();
    const matchStats = allStats.match;

    // --- Populate Match Summary ---
    document.getElementById('summary-content').innerHTML = `
        <h3 class="results-subtitle">🏆 Final Score</h3>
        <div class="final-score">🔵 ${matchData.scores.team1.join('-')} &nbsp; | &nbsp; 🔴 ${matchData.scores.team2.join('-')}</div>
        <div class="match-details">${matchData.location} • ${matchData.surface} • ${matchData.date}</div>
        <h3 class="results-subtitle">Players</h3>
        <div class="stats-grid" style="grid-template-columns: 1fr 1fr; text-align: left; padding: 0 1rem;">
            <div><b>🔵 Team 1:</b><br>${matchData.players.player1}<br>${matchData.players.player2}</div>
            <div><b>🔴 Team 2:</b><br>${matchData.players.player3}<br>${matchData.players.player4}</div>
        </div>
        <h3 class="results-subtitle">Points Won</h3>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">${getAbbrev('player1')}/${getAbbrev('player2')}</div><div class="stat-value">${matchStats.team1.pointsWon} (${matchStats.team1.pointsWonPct.toFixed(0)}%)</div></div>
            <div class="stat-card"><div class="stat-label">${getAbbrev('player3')}/${getAbbrev('player4')}</div><div class="stat-value">${matchStats.team2.pointsWon} (${matchStats.team2.pointsWonPct.toFixed(0)}%)</div></div>
        </div>
    `;

    // --- Populate Team & Player Views ---
    const numSets = matchData.scores.team1.length;
    const periods = ['match', ...Array.from({length: numSets}, (_, i) => `set${i}`)];
    
    ['team1', 'team2'].forEach((teamKey, i) => {
        document.getElementById(`${teamKey}-title`).innerHTML = `${i===0 ? '🔵' : '🔴'} ${matchData.players[matchData.teams[teamKey][0]]} & ${matchData.players[matchData.teams[teamKey][1]]}`;
        let table = `<table class="results-table"><thead><tr><th>Serving</th><th>1st In %</th><th>1st Won %</th><th>2nd Won %</th></tr></thead><tbody>`;
        periods.forEach((p, i) => table += `<tr><td>${p === 'match' ? 'Match' : `Set ${i}`}</td><td>${allStats[p][teamKey].serv1stInPct.toFixed(0)}%</td><td>${allStats[p][teamKey].serv1stWonPct.toFixed(0)}%</td><td>${allStats[p][teamKey].serv2ndWonPct.toFixed(0)}%</td></tr>`);
        table += `</tbody><thead><tr><th>Returning</th><th>vs 1st</th><th>vs 2nd</th><th></th></tr></thead><tbody>`;
        periods.forEach((p, i) => table += `<tr><td>${p === 'match' ? 'Match' : `Set ${i}`}</td><td>${allStats[p][teamKey].ret1stWonPct.toFixed(0)}%</td><td>${allStats[p][teamKey].ret2ndWonPct.toFixed(0)}%</td><td></td></tr>`);
        table += `</tbody><thead><tr><th>2nd Shot Misses</th><th>Serving</th><th>Returning</th><th></th></tr></thead><tbody>`;
        periods.forEach((p, i) => table += `<tr><td>${p === 'match' ? 'Match' : `Set ${i}`}</td><td>${allStats[p][teamKey].ssServing}</td><td>${allStats[p][teamKey].ssReturning}</td><td></td></tr>`);
        table += `</tbody></table>`;
        document.getElementById(`${teamKey}-results-card`).innerHTML = table;
    });

    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        document.getElementById(`${pKey}-title`).innerHTML = `👤 ${matchData.players[pKey]}`;
        let table = `<h3 class="results-subtitle">📤 Serving Performance</h3><table class="results-table"><thead><tr><th>Set</th><th colspan="2">Deuce Side (1st/2nd)</th><th colspan="2">Ad Side (1st/2nd)</th></tr></thead><tbody>`;
        for(let i=0; i < numSets; i++) {
             const setStats = allStats[`set${i}`];
             const oppTeamKey = matchData.teams.team1.includes(pKey) ? 'team2' : 'team1';
             const deuceReturner = matchData.returnerHistory[oppTeamKey].deuce;
             const adReturner = matchData.returnerHistory[oppTeamKey].ad;
             const s_d1_w = setStats[deuceReturner].retDeuceFirstTotal - setStats[deuceReturner].retDeuceFirstWon;
             const s_d2_w = setStats[deuceReturner].retDeuceSecondTotal - setStats[deuceReturner].retDeuceSecondWon;
             const s_a1_w = setStats[adReturner].retAdFirstTotal - setStats[adReturner].retAdFirstWon;
             const s_a2_w = setStats[adReturner].retAdSecondTotal - setStats[adReturner].retAdSecondWon;
            table += `<tr><td>Set ${i+1}</td><td>${s_d1_w}/${setStats[deuceReturner].retDeuceFirstTotal}</td><td>${s_d2_w}/${setStats[deuceReturner].retDeuceSecondTotal}</td><td>${s_a1_w}/${setStats[adReturner].retAdFirstTotal}</td><td>${s_a2_w}/${setStats[adReturner].retAdSecondTotal}</td></tr>`;
        }
        table += `</tbody></table><h3 class="results-subtitle">📥 Returning Performance</h3><table class="results-table"><thead><tr><th>Set</th><th colspan="2">Deuce Side (1st/2nd)</th><th colspan="2">Ad Side (1st/2nd)</th></tr></thead><tbody>`;
        for(let i=0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr><td>Set ${i+1}</td><td>${s.retDeuceFirstWon}/${s.retDeuceFirstTotal}</td><td>${s.retDeuceSecondWon}/${s.retDeuceSecondTotal}</td><td>${s.retAdFirstWon}/${s.retAdFirstTotal}</td><td>${s.retAdSecondWon}/${s.retAdSecondTotal}</td></tr>`;
        }
        table += `</tbody></table><h3 class="results-subtitle">🎯 2nd Shot Misses</h3><table class="results-table"><thead><tr><th>Set</th><th>Server</th><th>Net</th><th>Deuce Ret</th><th>Ad Ret</th></tr></thead><tbody>`;
        for(let i=0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr><td>Set ${i+1}</td><td>${s.ssMisses.S}</td><td>${s.ssMisses.N}</td><td>${s.ssMisses.D}</td><td>${s.ssMisses.A}</td></tr>`;
        }
        table += `</tbody></table>`;
        document.getElementById(`${pKey}-results-card`).innerHTML = table;
    });
}

function generatePdf() {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("PDF generation library is not loaded."); return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    
    const p1 = getInitial('player1'); const p2 = getInitial('player2');
    const p3 = getInitial('player3'); const p4 = getInitial('player4');
    const filename = `${matchData.date}-D-${p1}${p2}-${p3}${p4}.pdf`;

    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Doubles Tracker", pdfWidth / 2, margin, { align: 'center' });
    pdf.setFontSize(10).setTextColor(0, 0, 255).textWithLink('https://www.wescoup.com/tonys-tennis-page', pdfWidth / 2, margin + 5, { align: 'center', url: 'https://www.wescoup.com/tonys-tennis-page' });
    
    document.body.classList.add('pdf-export-mode');

    let promise = Promise.resolve();
    const elements = document.querySelectorAll('.results-view');
    
    elements.forEach((element, index) => {
        promise = promise.then(() => html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 800 }))
        .then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            if (index > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, index === 0 ? margin + 10 : margin, pdfWidth, imgHeight);
        });
    });

    promise.then(() => {
        document.body.classList.remove('pdf-export-mode');
        pdf.save(filename);
    });
}
