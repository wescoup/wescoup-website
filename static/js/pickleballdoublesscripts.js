// Tony's Pickleball Doubles Tracker JavaScript

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let allMatches = [];
let currentView = 'match-info';
let currentResultsView = 0;
const totalResultsViews = 7; // Summary, Team1, Team2, P1, P2, P3, P4

const initialMatchData = {
    id: null,
    players: { player1: 'P1', player2: 'P2', player3: 'P3', player4: 'P4' },
    teams: { team1: ['player1', 'player2'], team2: ['player3', 'player4'] },
    location: 'Local Court',
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
    
    document.getElementById('player1').value = "P1";
    document.getElementById('player2').value = "P2";
    document.getElementById('player3').value = "P3";
    document.getElementById('player4').value = "P4";
    document.getElementById('location').value = "Local Court";
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];

    showSection('match-info');
}

function showSection(sectionId) {
    if (sectionId === 'match-tracker' && currentView === 'match-info') {
        collectMatchInfo();
    }
    currentView = sectionId;

    document.querySelectorAll('.tennis-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.tennis-nav-btn').forEach(b => b.classList.remove('active'));
    const activeButton = document.querySelector(`.tennis-nav-btn[onclick="showSection('${sectionId}')"]`);
    if (activeButton) activeButton.classList.add('active');
    
    if (sectionId === 'match-tracker') updateAllDisplays();
    if (sectionId === 'results') {
        renderResults();
        populateAllResultsViews();
        showResultsView(0);
    }
    if (sectionId === 'saved-matches') renderSavedMatchesList();
}

function collectMatchInfo() {
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        matchData.players[pKey] = document.getElementById(pKey).value.trim() || `P${pKey.slice(-1)}`;
    });
    matchData.location = document.getElementById('location').value.trim() || 'Local Court';
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
    updateThirdFourthShotDisplay();
    updateUnforcedErrorDisplay();
    updateReturnStringsDisplay();
}

// --- SCORE & GAME ---
function adjustGame(change) {
    const newGameCount = matchData.scores.team1.length + change;
    if (newGameCount > 0) {
        if (change > 0) {
            matchData.scores.team1.push(0);
            matchData.scores.team2.push(0);
        } else if (matchData.scores.team1.length > 1) {
            matchData.scores.team1.pop();
            matchData.scores.team2.pop();
        }
    }
    updateAllDisplays();
}

function updateScoreDisplay() {
    const gameIndex = matchData.scores.team1.length - 1;
    document.getElementById('team1NameScore').textContent = `${getAbbrev('player1')}/${getAbbrev('player2')}`;
    document.getElementById('team2NameScore').textContent = `${getAbbrev('player3')}/${getAbbrev('player4')}`;
    document.getElementById('team1Score').textContent = matchData.scores.team1[gameIndex] || 0;
    document.getElementById('team2Score').textContent = matchData.scores.team2[gameIndex] || 0;
    document.getElementById('currentGame').textContent = matchData.scores.team1.length;
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
function recordReturn(court, won) {
    const returner = matchData.returners[court];
    const serverTeamKey = matchData.teams.team1.includes(matchData.currentServer) ? 'team1' : 'team2';
    const returnerTeamKey = serverTeamKey === 'team1' ? 'team2' : 'team1';

    matchData.pointHistory.push({
        gameIndex: matchData.scores.team1.length - 1,
        server: matchData.currentServer,
        returner: returner,
        side: court,
        outcome: won ? '1' : '0',
        type: 'return',
        serverTeam: serverTeamKey,
        returnerTeam: returnerTeamKey
    });

    const gameIndex = matchData.scores.team1.length - 1;
    if (won) {
        matchData.scores[returnerTeamKey][gameIndex]++;
    } else {
        matchData.scores[serverTeamKey][gameIndex]++;
    }
    updateAllDisplays();
}

function recordUnforcedError(playerKey) {
    matchData.pointHistory.push({
        gameIndex: matchData.scores.team1.length - 1,
        playerKey: playerKey,
        type: 'unforcedError'
    });
    updateUnforcedErrorDisplay();
}

function recordThirdFourthShotMiss(playerKey) {
    matchData.pointHistory.push({
        gameIndex: matchData.scores.team1.length - 1,
        playerKey: playerKey,
        position: getPlayerPosition(playerKey),
        type: 'thirdFourthShotMiss'
    });
    updateThirdFourthShotDisplay();
}

function undoLastPoint() {
    if (matchData.pointHistory.length === 0) return;
    const lastPoint = matchData.pointHistory.pop();
    if (lastPoint.type === 'return') {
        const gameIndex = matchData.scores.team1.length - 1;
        if (lastPoint.outcome === '1') {
            matchData.scores[lastPoint.returnerTeam][gameIndex] = Math.max(0, matchData.scores[lastPoint.returnerTeam][gameIndex] - 1);
        } else {
            matchData.scores[lastPoint.serverTeam][gameIndex] = Math.max(0, matchData.scores[lastPoint.serverTeam][gameIndex] - 1);
        }
    }
    updateAllDisplays();
}

function updateReturnStringsDisplay() {
    if (currentView !== 'match-tracker') return;
    const currentGamePoints = matchData.pointHistory.filter(p => p.gameIndex === matchData.scores.team1.length - 1);
    
    const strings = { deuce: '', ad: '' };
    
    currentGamePoints.forEach(p => {
        if (p.type === 'return' && p.returner === matchData.returners.deuce) {
            strings.deuce += p.outcome === '1' ? 'W' : 'L';
        } else if (p.type === 'return' && p.returner === matchData.returners.ad) {
            strings.ad += p.outcome === '1' ? 'W' : 'L';
        }
    });

    document.getElementById('deuce_return_str').textContent = strings.deuce || "-";
    document.getElementById('ad_return_str').textContent = strings.ad || "-";
}


// --- DOUBLES-SPECIFIC DISPLAYS ---
function getPlayerPosition(playerKey) {
    if (!matchData || !matchData.currentServer) return '';
    if (playerKey === matchData.currentServer) return 'S';
    const serverTeam = matchData.teams.team1.includes(matchData.currentServer) ? 'team1' : 'team2';
    const serverPartner = matchData.teams[serverTeam].find(p => p !== matchData.currentServer);
    if (playerKey === serverPartner) return 'N';
    if (playerKey === matchData.returners.deuce) return 'D';
    if (playerKey === matchData.returners.ad) return 'A';
    return '?';
}

function updateUnforcedErrorDisplay() {
    if (currentView !== 'match-tracker') return;
    
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const btn = document.getElementById(`p${pKey.slice(-1)}_ue`);
        if (btn) btn.textContent = getAbbrev(pKey);
    });

    const currentGameIndex = matchData.scores.team1.length - 1;
    let tally = { player1:0, player2:0, player3:0, player4:0 };
    matchData.pointHistory
        .filter(p => p.type === 'unforcedError' && p.gameIndex === currentGameIndex)
        .forEach(p => tally[p.playerKey]++);
    
    let tallyHTML = '';
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        if (tally[pKey] > 0) tallyHTML += `<span>${getAbbrev(pKey)}: ${tally[pKey]}</span>`;
    });
    document.getElementById('ueTally').innerHTML = tallyHTML || '<span>No errors this game</span>';
}

function updateThirdFourthShotDisplay() {
    if (currentView !== 'match-tracker') return;
    
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const btn = document.getElementById(`p${pKey.slice(-1)}_3rd`);
        if (btn) btn.textContent = `${getAbbrev(pKey)}-${getPlayerPosition(pKey)}`;
    });

    const currentGameIndex = matchData.scores.team1.length - 1;
    let tally = { player1:0, player2:0, player3:0, player4:0 };
    matchData.pointHistory
        .filter(p => p.type === 'thirdFourthShotMiss' && p.gameIndex === currentGameIndex)
        .forEach(p => tally[p.playerKey]++);
    
    let tallyHTML = '';
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        if (tally[pKey] > 0) tallyHTML += `<span>${getAbbrev(pKey)}: ${tally[pKey]}</span>`;
    });
    document.getElementById('3rdShotMissTally').innerHTML = tallyHTML || '<span>No misses this game</span>';
}


// --- LOCAL STORAGE & MATCH MANAGEMENT ---
function saveCurrentMatch() {
    const existingIndex = allMatches.findIndex(m => m.id === matchData.id);
    if (existingIndex > -1) {
        allMatches[existingIndex] = JSON.parse(JSON.stringify(matchData));
    } else {
        allMatches.push(JSON.parse(JSON.stringify(matchData)));
    }
    localStorage.setItem('pickleballDoublesMatches', JSON.stringify(allMatches));
    alert(`Match "${matchData.date}" saved!`);
}

function loadAllMatches() {
    const saved = localStorage.getItem('pickleballDoublesMatches');
    if (saved) allMatches = JSON.parse(saved);
}

function activateMatch(id) {
    const matchToLoad = allMatches.find(m => m.id === id);
    if (matchToLoad) {
        matchData = JSON.parse(JSON.stringify(matchToLoad));
        
        ['player1', 'player2', 'player3', 'player4'].forEach(key => {
            document.getElementById(key).value = matchData.players[key];
        });
        document.getElementById('location').value = matchData.location;
        document.getElementById('matchDate').value = matchData.date;

        showSection('match-tracker');
    }
}

function deleteMatch(id) {
    if (confirm('Are you sure you want to delete this match?')) {
        allMatches = allMatches.filter(m => m.id !== id);
        localStorage.setItem('pickleballDoublesMatches', JSON.stringify(allMatches));
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
        <div class="match-summary" id="summary-content"></div>
        <div class="tennis-btn-group" style="margin-top:1rem; flex-wrap: wrap;">
            <button class="tennis-btn" onclick="saveCurrentMatch()">💾 Save Match</button>
            <button class="tennis-btn" onclick="generatePdf()">📄 Save as PDF</button>
            <button class="tennis-btn" onclick="startNewMatch()">✨ New Match</button>
        </div>
    </div>`;

    ['team1', 'team2'].forEach((teamKey, i) => {
        html += `<div class="results-view" id="results-view-${i+1}"><div class="view-title" id="${teamKey}-title"></div><div class="team-card team-${i+1}" id="${teamKey}-results-card"></div></div>`;
    });

    ['player1', 'player2', 'player3', 'player4'].forEach((pKey, i) => {
        html += `<div class="results-view" id="results-view-${i+3}"><div class="view-title" id="${pKey}-title"></div><div class="player-card team-${i < 2 ? 1 : 2}" id="${pKey}-results-card"></div></div>`;
    });
    return html;
}

function calculateAllStats() {
    const numGames = matchData.scores.team1.length;
    const stats = {}; 

    for (let i = -1; i < numGames; i++) {
        const key = i === -1 ? 'match' : `game${i}`;
        const periodStats = stats[key] = {
            team1: {}, team2: {}, player1: {}, player2: {}, player3: {}, player4: {}
        };
        const pointsInPeriod = i === -1 ? matchData.pointHistory : matchData.pointHistory.filter(p => p.gameIndex === i);
        
        ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
            periodStats[pKey] = {
                retDeuceWon: 0, retDeuceTotal: 0, retAdWon: 0, retAdTotal: 0,
                servDeuceWon: 0, servDeuceTotal: 0, servAdWon: 0, servAdTotal: 0,
                thirdFourthShotMisses: { S: 0, N: 0, D: 0, A: 0 },
                unforcedErrors: 0,
                pointsWon: 0,
                pointsTotal: 0,
                servWon: 0,
                retWon: 0,
                servWonPct: 0,
                retWonPct: 0
            };

            const servePoints = pointsInPeriod.filter(p => p.type === 'return' && p.server === pKey);
            const returnPoints = pointsInPeriod.filter(p => p.type === 'return' && p.returner === pKey);

            periodStats[pKey].pointsWon = servePoints.filter(p => p.outcome === '0').length + returnPoints.filter(p => p.outcome === '1').length;
            periodStats[pKey].pointsTotal = servePoints.length + returnPoints.length;

            returnPoints.forEach(p => {
                if (p.side === 'deuce') { periodStats[pKey].retDeuceTotal++; if (p.outcome === '1') periodStats[pKey].retDeuceWon++; }
                if (p.side === 'ad') { periodStats[pKey].retAdTotal++; if (p.outcome === '1') periodStats[pKey].retAdWon++; }
            });
            
            servePoints.forEach(p => {
                if (p.side === 'deuce') { periodStats[pKey].servDeuceTotal++; if (p.outcome === '0') periodStats[pKey].servDeuceWon++; }
                if (p.side === 'ad') { periodStats[pKey].servAdTotal++; if (p.outcome === '0') periodStats[pKey].servAdWon++; }
            });

            pointsInPeriod.filter(p => p.type === 'thirdFourthShotMiss' && p.playerKey === pKey).forEach(p => periodStats[pKey].thirdFourthShotMisses[p.position]++);
            periodStats[pKey].unforcedErrors = pointsInPeriod.filter(p => p.type === 'unforcedError' && p.playerKey === pKey).length;
            
            periodStats[pKey].servWon = periodStats[pKey].servDeuceWon + periodStats[pKey].servAdWon;
            periodStats[pKey].servTotal = periodStats[pKey].servDeuceTotal + periodStats[pKey].servAdTotal;
            periodStats[pKey].retWon = periodStats[pKey].retDeuceWon + periodStats[pKey].retAdWon;
            periodStats[pKey].retTotal = periodStats[pKey].retDeuceTotal + periodStats[pKey].retAdTotal;
            periodStats[pKey].servWonPct = periodStats[pKey].servTotal > 0 ? (periodStats[pKey].servWon / periodStats[pKey].servTotal) * 100 : 0;
            periodStats[pKey].retWonPct = periodStats[pKey].retTotal > 0 ? (periodStats[pKey].retWon / periodStats[pKey].retTotal) * 100 : 0;
        });

        ['team1', 'team2'].forEach(teamKey => {
            const tStats = periodStats[teamKey] = {};
            tStats.retWon = 0; tStats.retTotal = 0;
            tStats.servWon = 0; tStats.servTotal = 0;
            tStats.thirdFourthServing = 0; tStats.thirdFourthReturning = 0;
            tStats.unforcedErrors = 0;
            tStats.pointsWon = 0; tStats.pointsTotal = 0;
            
            matchData.teams[teamKey].forEach(pKey => {
                const pStats = periodStats[pKey];
                tStats.retWon += pStats.retDeuceWon + pStats.retAdWon;
                tStats.retTotal += pStats.retDeuceTotal + pStats.retAdTotal;
                tStats.servWon += pStats.servDeuceWon + pStats.servAdWon;
                tStats.servTotal += pStats.servDeuceTotal + pStats.servAdTotal;
                tStats.thirdFourthServing += pStats.thirdFourthShotMisses.S + pStats.thirdFourthShotMisses.N;
                tStats.thirdFourthReturning += pStats.thirdFourthShotMisses.D + pStats.thirdFourthShotMisses.A;
                tStats.unforcedErrors += pStats.unforcedErrors;
                tStats.pointsWon += pStats.pointsWon;
                tStats.pointsTotal += pStats.pointsTotal;
            });
            tStats.retWonPct = tStats.retTotal > 0 ? (tStats.retWon / tStats.retTotal) * 100 : 0;
            tStats.servWonPct = tStats.servTotal > 0 ? (tStats.servWon / tStats.servTotal) * 100 : 0;
        });
    }

    const matchStats = stats['match'];
    const totalPoints = (matchStats.team1.pointsTotal || 0) + (matchStats.team2.pointsTotal || 0);
    matchStats.team1.pointsWonPct = totalPoints > 0 ? (matchStats.team1.pointsWon / totalPoints) * 100 : 0;
    matchStats.team2.pointsWonPct = totalPoints > 0 ? (matchStats.team2.pointsWon / totalPoints) * 100 : 0;
    
    return stats;
}

function populateAllResultsViews() {
    const allStats = calculateAllStats();
    const numGames = matchData.scores.team1.length;
    const periods = ['match', ...Array.from({length: numGames}, (_, i) => `game${i}`)];

    const matchStats = allStats.match;

    document.getElementById('summary-content').innerHTML = `
        <h3 class="results-subtitle">🏆 Final Score</h3>
        <div class="final-score">🔵 ${matchData.scores.team1.join('-')} &nbsp; | &nbsp; 🔴 ${matchData.scores.team2.join('-')}</div>
        <div class="match-details">${matchData.location} • ${matchData.date}</div>
        <h3 class="results-subtitle">Teams</h3>
        <div class="stats-grid" style="grid-template-columns: 1fr 1fr; text-align: left; padding: 0 1rem;">
            <div><b>🔵 Team 1:</b><br>${matchData.players.player1} & ${matchData.players.player2}</div>
            <div><b>🔴 Team 2:</b><br>${matchData.players.player3} & ${matchData.players.player4}</div>
        </div>
        <h3 class="results-subtitle">Points Won</h3>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">${getAbbrev('player1')}/${getAbbrev('player2')}</div><div class="stat-value">${matchStats.team1.pointsWon} (${matchStats.team1.pointsWonPct.toFixed(0)}%)</div></div>
            <div class="stat-card"><div class="stat-label">${getAbbrev('player3')}/${getAbbrev('player4')}</div><div class="stat-value">${matchStats.team2.pointsWon} (${matchStats.team2.pointsWonPct.toFixed(0)}%)</div></div>
        </div>
        <h3 class="results-subtitle">Unforced Errors</h3>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Team 1</div><div class="stat-value">${matchStats.team1.unforcedErrors}</div></div>
            <div class="stat-card"><div class="stat-label">Team 2</div><div class="stat-value">${matchStats.team2.unforcedErrors}</div></div>
        </div>
    `;

    ['team1', 'team2'].forEach((teamKey, i) => {
        document.getElementById(`${teamKey}-title`).innerHTML = `${i===0 ? '🔵' : '🔴'} ${matchData.players[matchData.teams[teamKey][0]]} & ${matchData.players[matchData.teams[teamKey][1]]}`;
        
        let table = `<h3 class="results-subtitle">📤 Serving Performance</h3><table class="results-table"><thead><tr><th>Game</th><th>Serve Won %</th></tr></thead><tbody>`;
        periods.forEach((p, i) => table += `<tr><td>${p === 'match' ? 'Match' : `Game ${i+1}`}</td><td>${allStats[p][teamKey].servWonPct.toFixed(0)}%</td></tr>`);
        table += `</tbody></table><h3 class="results-subtitle">📥 Returning Performance</h3><table class="results-table"><thead><tr><th>Game</th><th>Return Won %</th></tr></thead><tbody>`;
        periods.forEach((p, i) => table += `<tr><td>${p === 'match' ? 'Match' : `Game ${i+1}`}</td><td>${allStats[p][teamKey].retWonPct.toFixed(0)}%</td></tr>`);
        table += `</tbody></table><h3 class="results-subtitle">😩 Unforced Errors</h3><table class="results-table"><thead><tr><th>Game</th><th>Total</th></tr></thead><tbody>`;
        periods.forEach((p, i) => table += `<tr><td>${p === 'match' ? 'Match' : `Game ${i+1}`}</td><td>${allStats[p][teamKey].unforcedErrors}</td></tr>`);
        table += `</tbody></table><h3 class="results-subtitle">🎯 Third/Fourth Shot Misses</h3><table class="results-table"><thead><tr><th>Game</th><th>Serving</th><th>Returning</th></tr></thead><tbody>`;
        periods.forEach((p, i) => table += `<tr><td>${p === 'match' ? 'Match' : `Game ${i+1}`}</td><td>${allStats[p][teamKey].thirdFourthServing}</td><td>${allStats[p][teamKey].thirdFourthReturning}</td></tr>`);
        table += `</tbody></table>`;
        document.getElementById(`${teamKey}-results-card`).innerHTML = table;
    });

    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        document.getElementById(`${pKey}-title`).innerHTML = `👤 ${matchData.players[pKey]}`;
        const pStatsMatch = allStats.match[pKey];
        
        // Correctly handle division by zero for percentage calculations
        const pointsWonPct = pStatsMatch.pointsTotal > 0 ? (pStatsMatch.pointsWon / pStatsMatch.pointsTotal * 100).toFixed(0) : 0;
        const servWonPct = pStatsMatch.servTotal > 0 ? (pStatsMatch.servWon / pStatsMatch.servTotal * 100).toFixed(0) : 0;
        const retWonPct = pStatsMatch.retTotal > 0 ? (pStatsMatch.retWon / pStatsMatch.retTotal * 100).toFixed(0) : 0;
        
        let table = `<h3 class="results-subtitle">Overall Stats</h3><table class="results-table"><thead><tr><th>Stat</th><th>Total</th><th>Percentage</th></tr></thead><tbody>
        <tr><td>Points Won</td><td>${pStatsMatch.pointsWon}</td><td>${pointsWonPct}%</td></tr>
        <tr><td>Serves Won</td><td>${pStatsMatch.servWon}</td><td>${servWonPct}%</td></tr>
        <tr><td>Returns Won</td><td>${pStatsMatch.retWon}</td><td>${retWonPct}%</td></tr>
        <tr><td>Unforced Errors</td><td>${pStatsMatch.unforcedErrors}</td><td>-</td></tr>
        <tr><td>3rd/4th Shot Misses</td><td>${pStatsMatch.thirdFourthShotMisses.S + pStatsMatch.thirdFourthShotMisses.N + pStatsMatch.thirdFourthShotMisses.D + pStatsMatch.thirdFourthShotMisses.A}</td><td>-</td></tr>
        </tbody></table>`;

        table += `<h3 class="results-subtitle">Breakdown by Game</h3><table class="results-table"><thead><tr><th>Game</th><th>Serves Won %</th><th>Returns Won %</th><th>UE</th><th>3rd/4th Miss</th></tr></thead><tbody>`;
        for(let i=0; i < numGames; i++) {
            const s = allStats[`game${i}`][pKey];
            table += `<tr><td>Game ${i+1}</td><td>${s.servWonPct.toFixed(0)}%</td><td>${s.retWonPct.toFixed(0)}%</td><td>${s.unforcedErrors}</td><td>${s.thirdFourthShotMisses.S + s.thirdFourthShotMisses.N + s.thirdFourthShotMisses.D + s.thirdFourthShotMisses.A}</td></tr>`;
        }
        table += `</tbody></table>`;
        
        table += `<h3 class="results-subtitle">Serving Side Breakdown</h3><table class="results-table"><thead><tr><th>Game</th><th>Deuce Side %</th><th>Ad Side %</th></tr></thead><tbody>`;
        for(let i=0; i < numGames; i++) {
             const s = allStats[`game${i}`][pKey];
             const deucePct = s.servDeuceTotal > 0 ? (s.servDeuceWon / s.servDeuceTotal) * 100 : 0;
             const adPct = s.servAdTotal > 0 ? (s.servAdWon / s.servAdTotal) * 100 : 0;
             table += `<tr><td>Game ${i+1}</td><td>${deucePct.toFixed(0)}% (${s.servDeuceWon}/${s.servDeuceTotal})</td><td>${adPct.toFixed(0)}% (${s.servAdWon}/${s.servAdTotal})</td></tr>`;
        }

        table += `</tbody></table><h3 class="results-subtitle">Returning Side Breakdown</h3><table class="results-table"><thead><tr><th>Game</th><th>Deuce Side %</th><th>Ad Side %</th></tr></thead><tbody>`;
        for(let i=0; i < numGames; i++) {
            const s = allStats[`game${i}`][pKey];
            const deucePct = s.retDeuceTotal > 0 ? (s.retDeuceWon / s.retDeuceTotal) * 100 : 0;
            const adPct = s.retAdTotal > 0 ? (s.retAdWon / s.retAdTotal) * 100 : 0;
            table += `<tr><td>Game ${i+1}</td><td>${deucePct.toFixed(0)}% (${s.retDeuceWon}/${s.retDeuceTotal})</td><td>${adPct.toFixed(0)}% (${s.retAdWon}/${s.retAdTotal})</td></tr>`;
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
    
    const p1 = getAbbrev('player1'); const p2 = getAbbrev('player2');
    const p3 = getAbbrev('player3'); const p4 = getAbbrev('player4');
    const filename = `${matchData.date}-PBL-D-${p1}${p2}-${p3}${p4}.pdf`;

    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Pickleball Doubles Tracker", pdfWidth / 2, margin, { align: 'center' });
    pdf.setFontSize(10).setTextColor(0, 0, 255).textWithLink('https://www.wescoup.com/tonys-pickleball-tools', pdfWidth / 2, margin + 5, { align: 'center', url: 'https://www.wescoup.com/tonys-pickleball-tools' });
    
    document.body.classList.add('pdf-export-mode');

    let promise = Promise.resolve();
    const elements = document.querySelectorAll('.results-view');
    
    elements.forEach((element, index) => {
        promise = promise.then(() => html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 800 }))
        .then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            if (index > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, index === 0 ? margin + 10 : margin, pdfWidth, imgHeight);
        });
    });

    promise.then(() => {
        document.body.classList.remove('pdf-export-mode');
        pdf.save(filename);
    });
}
