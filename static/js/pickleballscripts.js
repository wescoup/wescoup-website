// Tony's Pickleball Tracker JavaScript

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let allMatches = [];
let currentView = 'match-info';
let currentResultsView = 0;
const totalResultsViews = 3; // Summary, P1, P2

const initialMatchData = {
    id: null,
    players: { player1: 'P1', player2: 'P2' },
    location: 'Local Court',
    date: new Date().toISOString().split('T')[0],
    scores: { player1: [0], player2: [0] },
    pointHistory: []
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
    document.getElementById('location').value = "Local Court";
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
    
    showSection('match-info');
    updateAllDisplays();
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
    if (sectionId === 'results') renderResults();
    if (sectionId === 'saved-matches') renderSavedMatchesList();
}

function collectMatchInfo() {
    ['player1', 'player2'].forEach(pKey => {
        matchData.players[pKey] = document.getElementById(pKey).value.trim() || `P${pKey.slice(-1)}`;
    });
    matchData.location = document.getElementById('location').value.trim() || 'Local Court';
    matchData.date = document.getElementById('matchDate').value;
    matchData.currentServer = 'player1';
}

function updateAllDisplays() {
    if (currentView !== 'match-tracker' || !matchData.players) return;
    updateServerButton();
    updateScoreDisplay();
    updateReturnerDisplay();
    updateThirdShotDisplay();
    updateUnforcedErrorDisplay();
    updateReturnStringsDisplay();
}

function updateReturnerDisplay() {
    const serverKey = matchData.currentServer;
    const returnerKey = serverKey === 'player1' ? 'player2' : 'player1';
    const returnerName = matchData.players[returnerKey];
    
    const returnerDisplay = document.getElementById('currentReturner');
    if (returnerDisplay) {
        returnerDisplay.textContent = returnerName;
    }
}

// --- SCORE & GAME ---
function adjustGame(change) {
    const newGameCount = matchData.scores.player1.length + change;
    if (newGameCount > 0) {
        if (change > 0) {
            matchData.scores.player1.push(0);
            matchData.scores.player2.push(0);
            // Reset tallies when a new game starts
            updateAllDisplays();
        } else if (matchData.scores.player1.length > 1) {
            matchData.scores.player1.pop();
            matchData.scores.player2.pop();
        }
    }
    updateAllDisplays();
}

function updateScoreDisplay() {
    const gameIndex = matchData.scores.player1.length - 1;
    document.getElementById('player1NameScore').textContent = getAbbrev('player1');
    document.getElementById('player2NameScore').textContent = getAbbrev('player2');
    document.getElementById('player1Score').textContent = matchData.scores.player1[gameIndex] || 0;
    document.getElementById('player2Score').textContent = matchData.scores.player2[gameIndex] || 0;
    document.getElementById('currentGame').textContent = matchData.scores.player1.length;
}

// --- SERVER & RETURNER ---
function toggleServer() {
    matchData.currentServer = matchData.currentServer === 'player1' ? 'player2' : 'player1';
    updateAllDisplays();
}

function updateServerButton() {
    const serverName = matchData.players[matchData.currentServer] || 'P1';
    const btn = document.getElementById('server-toggle-btn');
    if (btn) {
        btn.textContent = `${serverName}`;
    }
}

function getAbbrev(playerKey) {
    if (matchData && matchData.players[playerKey]) {
        return matchData.players[playerKey].substring(0, 3);
    }
    return '';
}

// --- POINT & GAME TRACKING ---
function recordReturn(court, won) {
    const returner = matchData.currentServer === 'player1' ? 'player2' : 'player1';
    matchData.pointHistory.push({
        gameIndex: matchData.scores.player1.length - 1,
        server: matchData.currentServer,
        returner: returner,
        side: court,
        outcome: won ? '1' : '0',
        type: 'return'
    });
    // Dynamic scoring based on point outcome
    if (won) {
        const gameIndex = matchData.scores.player1.length - 1;
        matchData.scores[returner][gameIndex]++;
    } else {
        const gameIndex = matchData.scores.player1.length - 1;
        matchData.scores[matchData.currentServer][gameIndex]++;
    }
    updateAllDisplays();
}

function recordUnforcedError(playerKey) {
    matchData.pointHistory.push({
        gameIndex: matchData.scores.player1.length - 1,
        playerKey: playerKey,
        type: 'unforcedError'
    });
    updateUnforcedErrorDisplay();
}

function recordThirdShotMiss(playerKey) {
    matchData.pointHistory.push({
        gameIndex: matchData.scores.player1.length - 1,
        playerKey: playerKey,
        position: playerKey === matchData.currentServer ? 'S' : 'R',
        type: 'thirdShotMiss'
    });
    updateThirdShotDisplay();
}

function undoLastPoint() {
    if (matchData.pointHistory.length === 0) return;
    const lastPoint = matchData.pointHistory.pop();
    if (lastPoint.type === 'return') {
        const gameIndex = matchData.scores.player1.length - 1;
        if (lastPoint.outcome === '1') {
            matchData.scores[lastPoint.returner][gameIndex] = Math.max(0, matchData.scores[lastPoint.returner][gameIndex] - 1);
        } else {
            matchData.scores[lastPoint.server][gameIndex] = Math.max(0, matchData.scores[lastPoint.server][gameIndex] - 1);
        }
    }
    updateAllDisplays();
}

function updateReturnStringsDisplay() {
    if (currentView !== 'match-tracker') return;
    const currentGamePoints = matchData.pointHistory.filter(p => p.gameIndex === matchData.scores.player1.length - 1);
    const currentReturner = matchData.currentServer === 'player1' ? 'player2' : 'player1';
    
    const strings = { deuce: '', ad: '' };
    
    currentGamePoints.forEach(p => {
        if (p.type === 'return' && p.returner === currentReturner) {
            strings[p.side] += p.outcome;
        }
    });

    document.getElementById('deuce_return_str').textContent = strings.deuce || "-";
    document.getElementById('ad_return_str').textContent = strings.ad || "-";
}

// --- UNFORCED ERROR & THIRD SHOT DISPLAYS (Per-Game) ---
function updateUnforcedErrorDisplay() {
    if (currentView !== 'match-tracker') return;
    
    document.getElementById('p1_ue').textContent = getAbbrev('player1');
    document.getElementById('p2_ue').textContent = getAbbrev('player2');

    const currentGameIndex = matchData.scores.player1.length - 1;
    let tally = { player1:0, player2:0 };
    matchData.pointHistory
        .filter(p => p.type === 'unforcedError' && p.gameIndex === currentGameIndex)
        .forEach(p => tally[p.playerKey]++);
    
    let tallyHTML = '';
    ['player1', 'player2'].forEach(pKey => {
        if (tally[pKey] > 0) tallyHTML += `<span>${getAbbrev(pKey)}: ${tally[pKey]}</span>`;
    });
    document.getElementById('ueTally').innerHTML = tallyHTML || '<span>No errors this game</span>';
}

function updateThirdShotDisplay() {
    if (currentView !== 'match-tracker') return;
    const serverKey = matchData.currentServer;
    
    document.getElementById('p1_3rd').textContent = `${getAbbrev('player1')}-${'player1' === serverKey ? 'S' : 'R'}`;
    document.getElementById('p2_3rd').textContent = `${getAbbrev('player2')}-${'player2' === serverKey ? 'R' : 'S'}`;

    const currentGameIndex = matchData.scores.player1.length - 1;
    let tally = { player1:0, player2:0 };
    matchData.pointHistory
        .filter(p => p.type === 'thirdShotMiss' && p.gameIndex === currentGameIndex)
        .forEach(p => tally[p.playerKey]++);
    
    let tallyHTML = '';
    ['player1', 'player2'].forEach(pKey => {
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
    localStorage.setItem('singlesPickleballMatches', JSON.stringify(allMatches));
    alert(`Match "${matchData.date}" saved!`);
}

function loadAllMatches() {
    const saved = localStorage.getItem('singlesPickleballMatches');
    if (saved) allMatches = JSON.parse(saved);
}

function activateMatch(id) {
    const matchToLoad = allMatches.find(m => m.id === id);
    if (matchToLoad) {
        matchData = JSON.parse(JSON.stringify(matchToLoad));
        
        ['player1', 'player2'].forEach(pKey => {
            document.getElementById(pKey).value = matchData.players[pKey];
        });
        document.getElementById('location').value = matchData.location;
        document.getElementById('matchDate').value = matchData.date;

        showSection('match-tracker');
    }
}

function deleteMatch(id) {
    if (confirm('Are you sure you want to delete this match?')) {
        allMatches = allMatches.filter(m => m.id !== id);
        localStorage.setItem('singlesPickleballMatches', JSON.stringify(allMatches));
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
        const p1 = match.players.player1;
        const p2 = match.players.player2;
        const score = `${match.scores.player1.join('-')} | ${match.scores.player2.join('-')}`;
        html += `<div class="stat-card" style="margin-bottom: 1rem; text-align: left;">
            <p style="font-weight: bold; font-size: 1.1rem;">${match.date} at ${match.location}</p>
            <p><b>Players:</b> ${p1} vs ${p2}</p>
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

    ['player1', 'player2'].forEach((pKey, i) => {
        html += `<div class="results-view" id="results-view-${i+1}">
            <div class="view-title" id="${pKey}-title"></div>
            <div class="player-card team-${i+1}" id="${pKey}-results-card"></div>
        </div>`;
    });
    return html;
}

function calculateAllStats() {
    const numGames = matchData.scores.player1.length;
    const stats = {}; 

    for (let i = -1; i < numGames; i++) {
        const key = i === -1 ? 'match' : `game${i}`;
        const periodStats = stats[key] = { player1: {}, player2: {} };
        const pointsInPeriod = i === -1 ? matchData.pointHistory : matchData.pointHistory.filter(p => p.gameIndex === i);
        
        ['player1', 'player2'].forEach(pKey => {
            periodStats[pKey] = {
                retDeuceWon: 0, retDeuceTotal: 0, retAdWon: 0, retAdTotal: 0,
                thirdShotMisses: { S: 0, R: 0 },
                unforcedErrors: 0,
                pointsWon: 0,
                pointsTotal: 0
            };

            const servePoints = pointsInPeriod.filter(p => p.type === 'return' && p.server === pKey);
            const returnPoints = pointsInPeriod.filter(p => p.type === 'return' && p.returner === pKey);

            periodStats[pKey].pointsWon = servePoints.filter(p => p.outcome === '0').length + returnPoints.filter(p => p.outcome === '1').length;
            periodStats[pKey].pointsTotal = servePoints.length + returnPoints.length;

            returnPoints.forEach(p => {
                if (p.side === 'deuce') { periodStats[pKey].retDeuceTotal++; if (p.outcome === '1') periodStats[pKey].retDeuceWon++; }
                if (p.side === 'ad') { periodStats[pKey].retAdTotal++; if (p.outcome === '1') periodStats[pKey].retAdWon++; }
            });

            pointsInPeriod.filter(p => p.type === 'thirdShotMiss' && p.playerKey === pKey).forEach(p => periodStats[pKey].thirdShotMisses[p.position]++);
            periodStats[pKey].unforcedErrors = pointsInPeriod.filter(p => p.type === 'unforcedError' && p.playerKey === pKey).length;
        });

        ['player1', 'player2'].forEach(pKey => {
            const pStats = periodStats[pKey];
            const oppStats = periodStats[pKey === 'player1' ? 'player2' : 'player1'];
            
            pStats.servTotal = oppStats.retDeuceTotal + oppStats.retAdTotal;
            pStats.servWon = pStats.servTotal - (oppStats.retDeuceWon + oppStats.retAdWon);
            pStats.servWonPct = pStats.servTotal > 0 ? (pStats.servWon / pStats.servTotal) * 100 : 0;
            
            pStats.retTotal = pStats.retDeuceTotal + pStats.retAdTotal;
            pStats.retWon = pStats.retDeuceWon + pStats.retAdWon;
            pStats.retWonPct = pStats.retTotal > 0 ? (pStats.retWon / pStats.retTotal) * 100 : 0;
        });
    }

    const matchStats = stats['match'];
    const totalPoints = matchStats.player1.pointsTotal + matchStats.player2.pointsTotal;
    matchStats.player1.pointsWonPct = totalPoints > 0 ? (matchStats.player1.pointsWon / totalPoints) * 100 : 0;
    matchStats.player2.pointsWonPct = totalPoints > 0 ? (matchStats.player2.pointsWon / totalPoints) * 100 : 0;
    
    return stats;
}

function populateAllResultsViews() {
    const allStats = calculateAllStats();
    const matchStats = allStats.match;

    document.getElementById('summary-content').innerHTML = `
        <h3 class="results-subtitle">🏆 Final Score</h3>
        <div class="final-score">🔵 ${matchData.scores.player1.join('-')} &nbsp; | &nbsp; 🔴 ${matchData.scores.player2.join('-')}</div>
        <div class="match-details">${matchData.location} • ${matchData.date}</div>
        <h3 class="results-subtitle">Players</h3>
        <div class="stats-grid" style="grid-template-columns: 1fr 1fr; text-align: left; padding: 0 1rem;">
            <div><b>🔵 Player 1:</b><br>${matchData.players.player1}</div>
            <div><b>🔴 Player 2:</b><br>${matchData.players.player2}</div>
        </div>
        <h3 class="results-subtitle">Points Won</h3>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">${getAbbrev('player1')}</div><div class="stat-value">${matchStats.player1.pointsWon} (${matchStats.player1.pointsWonPct.toFixed(0)}%)</div></div>
            <div class="stat-card"><div class="stat-label">${getAbbrev('player2')}</div><div class="stat-value">${matchStats.player2.pointsWon} (${matchStats.player2.pointsWonPct.toFixed(0)}%)</div></div>
        </div>
        <h3 class="results-subtitle">Unforced Errors</h3>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">${getAbbrev('player1')}</div><div class="stat-value">${matchStats.player1.unforcedErrors}</div></div>
            <div class="stat-card"><div class="stat-label">${getAbbrev('player2')}</div><div class="stat-value">${matchStats.player2.unforcedErrors}</div></div>
        </div>
    `;

    const numGames = matchData.scores.player1.length;
    const periods = ['match', ...Array.from({length: numGames}, (_, i) => `game${i}`)];
    
    ['player1', 'player2'].forEach((pKey, i) => {
        document.getElementById(`${pKey}-title`).innerHTML = `${i===0 ? '🔵' : '🔴'} ${matchData.players[pKey]}`;
        let table = `<h3 class="results-subtitle">📥 Returning Performance</h3><table class="results-table"><thead><tr><th>Game</th><th colspan="2">Return Won %</th></tr></thead><tbody>`;
        periods.forEach((p, i) => {
            const s = allStats[p][pKey];
            table += `<tr><td>${p === 'match' ? 'Match' : `Game ${i+1}`}</td><td>${s.retWonPct.toFixed(0)}%</td></tr>`;
        });
        table += `</tbody></table><h3 class="results-subtitle">📤 Serving Performance</h3><table class="results-table"><thead><tr><th>Game</th><th colspan="2">Serve Won %</th></tr></thead><tbody>`;
        periods.forEach((p, i) => {
            const s = allStats[p][pKey];
            table += `<tr><td>${p === 'match' ? 'Match' : `Game ${i+1}`}</td><td>${s.servWonPct.toFixed(0)}%</td></tr>`;
        });
        table += `</tbody></table><h3 class="results-subtitle">😩 Unforced Errors</h3><table class="results-table"><thead><tr><th>Game</th><th>Total</th></tr></thead><tbody>`;
        for(let i=0; i < numGames; i++) {
            const s = allStats[`game${i}`][pKey];
            table += `<tr><td>Game ${i+1}</td><td>${s.unforcedErrors}</td></tr>`;
        }
        table += `<tr><td><b>Match</b></td><td><b>${allStats['match'][pKey].unforcedErrors}</b></td></tr>`;
        table += `</tbody></table><h3 class="results-subtitle">🎯 Third Shot / Fourth Shot Misses</h3><table class="results-table"><thead><tr><th>Game</th><th>Serving</th><th>Returning</th></tr></thead><tbody>`;
        for(let i=0; i < numGames; i++) {
            const s = allStats[`game${i}`][pKey];
            table += `<tr><td>Game ${i+1}</td><td>${s.thirdShotMisses.S}</td><td>${s.thirdShotMisses.R}</td></tr>`;
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
    
    const p1 = getAbbrev('player1');
    const p2 = getAbbrev('player2');
    const filename = `${matchData.date}-PBL-${p1}-${p2}.pdf`;

    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Pickleball Tracker", pdfWidth / 2, margin, { align: 'center' });
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
