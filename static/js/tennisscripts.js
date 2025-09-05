// Tony's Tennis Tracker JavaScript (Rewritten v2 - Feature Parity with Doubles)

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let allMatches = [];
let currentView = 'match-info';
let currentResultsView = 0;
const totalResultsViews = 3; // Summary, P1, P2

// A clean slate for a new match, preserving structure
const initialMatchData = {
    id: null,
    players: { player1: 'P1', player2: 'P2' },
    location: 'Local Court',
    surface: 'Hard',
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
    matchData.surface = document.getElementById('surface').value;
    matchData.date = document.getElementById('matchDate').value;
    matchData.currentServer = 'player1';
}

function updateAllDisplays() {
    if (currentView !== 'match-tracker') return;
    updateServerDropdown();
    updateScoreDisplay();
    updateSecondShotDisplay();
    updateReturnStringsDisplay();
}

// --- SCORE & SET ---
function adjustGames(playerKey, change) {
    const setIndex = matchData.scores.player1.length - 1;
    matchData.scores[playerKey][setIndex] = Math.max(0, (matchData.scores[playerKey][setIndex] || 0) + change);
    updateScoreDisplay();
}

function adjustSet(change) {
    const newSetCount = matchData.scores.player1.length + change;
    if (newSetCount > 0) {
        if (change > 0) {
            matchData.scores.player1.push(0);
            matchData.scores.player2.push(0);
        } else if (matchData.scores.player1.length > 1) {
            matchData.scores.player1.pop();
            matchData.scores.player2.pop();
        }
    }
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const setIndex = matchData.scores.player1.length - 1;
    document.getElementById('player1NameScore').textContent = getAbbrev('player1');
    document.getElementById('player2NameScore').textContent = getAbbrev('player2');
    document.getElementById('player1Score').textContent = matchData.scores.player1[setIndex] || 0;
    document.getElementById('player2Score').textContent = matchData.scores.player2[setIndex] || 0;
    document.getElementById('currentSet').textContent = matchData.scores.player1.length;
}

// --- SERVER & RETURNER ---
function updateServer() {
    matchData.currentServer = document.getElementById('currentServer').value;
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
    ['player1', 'player2'].forEach(pKey => {
        const option = document.createElement('option');
        option.value = pKey;
        option.textContent = matchData.players[pKey];
        select.appendChild(option);
    });
    select.value = matchData.currentServer;
}

// --- POINT TRACKING ---
function recordReturn(court, serveType, won) {
    const returner = matchData.currentServer === 'player1' ? 'player2' : 'player1';
    matchData.pointHistory.push({
        setIndex: matchData.scores.player1.length - 1,
        server: matchData.currentServer,
        returner: returner,
        serve: serveType,
        side: court,
        outcome: won ? '1' : '0',
        type: 'return'
    });
    updateReturnStringsDisplay();
}

function recordSecondShotMiss(playerKey) {
    matchData.pointHistory.push({
        setIndex: matchData.scores.player1.length - 1,
        playerKey: playerKey,
        position: playerKey === matchData.currentServer ? 'S' : 'R',
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
    matchData.pointHistory.push({ setIndex: matchData.scores.player1.length - 1, type: 'gameComplete' });
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
function updateSecondShotDisplay() {
    if (currentView !== 'match-tracker') return;
    const serverKey = matchData.currentServer;
    const returnerKey = serverKey === 'player1' ? 'player2' : 'player1';
    
    document.getElementById('p1_ss').textContent = `${getAbbrev('player1')}-${'player1' === serverKey ? 'S' : 'R'}`;
    document.getElementById('p2_ss').textContent = `${getAbbrev('player2')}-${'player2' === serverKey ? 'S' : 'R'}`;

    let tally = { player1:0, player2:0 };
    matchData.pointHistory.filter(p => p.type === 'secondShotMiss').forEach(p => tally[p.playerKey]++);
    
    let tallyHTML = '';
    ['player1', 'player2'].forEach(pKey => {
        if (tally[pKey] > 0) tallyHTML += `<span>${getAbbrev(pKey)}: ${tally[pKey]}</span>`;
    });
    document.getElementById('ssMissTally').innerHTML = tallyHTML || '<span>No misses yet</span>';
}

// --- LOCAL STORAGE & MATCH MANAGEMENT ---
function saveCurrentMatch() {
    const existingIndex = allMatches.findIndex(m => m.id === matchData.id);
    if (existingIndex > -1) {
        allMatches[existingIndex] = JSON.parse(JSON.stringify(matchData));
    } else {
        allMatches.push(JSON.parse(JSON.stringify(matchData)));
    }
    localStorage.setItem('singlesMatches', JSON.stringify(allMatches));
    alert(`Match "${matchData.date}" saved!`);
}

function loadAllMatches() {
    const saved = localStorage.getItem('singlesMatches');
    if (saved) allMatches = JSON.parse(saved);
}

function activateMatch(id) {
    const matchToLoad = allMatches.find(m => m.id === id);
    if (matchToLoad) {
        matchData = JSON.parse(JSON.stringify(matchToLoad));
        
        ['player1', 'player2', 'location', 'surface'].forEach(key => {
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
        localStorage.setItem('singlesMatches', JSON.stringify(allMatches));
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
    const numSets = matchData.scores.player1.length;
    const stats = {}; 

    for (let i = -1; i < numSets; i++) {
        const key = i === -1 ? 'match' : `set${i}`;
        const periodStats = stats[key] = { player1: {}, player2: {} };
        const pointsInPeriod = i === -1 ? matchData.pointHistory : matchData.pointHistory.filter(p => p.setIndex === i);
        
        ['player1', 'player2'].forEach(pKey => {
            const pStats = periodStats[pKey] = {
                retDeuceFirstWon: 0, retDeuceFirstTotal: 0, retDeuceSecondWon: 0, retDeuceSecondTotal: 0,
                retAdFirstWon: 0, retAdFirstTotal: 0, retAdSecondWon: 0, retAdSecondTotal: 0,
                ssMisses: { S: 0, R: 0 }
            };
            pointsInPeriod.filter(p => p.type === 'return' && p.returner === pKey).forEach(p => {
                if (p.side === 'deuce' && p.serve === 'first') { pStats.retDeuceFirstTotal++; if (p.outcome === '1') pStats.retDeuceFirstWon++; }
                if (p.side === 'deuce' && p.serve === 'second') { pStats.retDeuceSecondTotal++; if (p.outcome === '1') pStats.retDeuceSecondWon++; }
                if (p.side === 'ad' && p.serve === 'first') { pStats.retAdFirstTotal++; if (p.outcome === '1') pStats.retAdFirstWon++; }
                if (p.side === 'ad' && p.serve === 'second') { pStats.retAdSecondTotal++; if (p.outcome === '1') pStats.retAdSecondWon++; }
            });
            pointsInPeriod.filter(p => p.type === 'secondShotMiss' && p.playerKey === pKey).forEach(p => pStats.ssMisses[p.position]++);
        });
        
        ['player1', 'player2'].forEach(pKey => {
             const pStats = periodStats[pKey];
             const oppStats = periodStats[pKey === 'player1' ? 'player2' : 'player1'];
             pStats.ret1stTotal = pStats.retDeuceFirstTotal + pStats.retAdFirstTotal;
             pStats.ret1stWon = pStats.retDeuceFirstWon + pStats.retAdFirstWon;
             pStats.ret2ndTotal = pStats.retDeuceSecondTotal + pStats.retAdSecondTotal;
             pStats.ret2ndWon = pStats.retDeuceSecondWon + pStats.retAdSecondWon;

             pStats.serv1stTotal = oppStats.ret1stTotal;
             pStats.serv1stWon = pStats.serv1stTotal - oppStats.ret1stWon;
             pStats.serv2ndTotal = oppStats.ret2ndTotal;
             pStats.serv2ndWon = pStats.serv2ndTotal - oppStats.ret2ndWon;
             
             pStats.serv1stInPct = (pStats.serv1stTotal + pStats.serv2ndTotal) > 0 ? (pStats.serv1stTotal / (pStats.serv1stTotal + pStats.serv2ndTotal)) * 100 : 0;
             pStats.serv1stWonPct = pStats.serv1stTotal > 0 ? (pStats.serv1stWon / pStats.serv1stTotal) * 100 : 0;
             pStats.serv2ndWonPct = pStats.serv2ndTotal > 0 ? (pStats.serv2ndWon / pStats.serv2ndTotal) * 100 : 0;
             pStats.ret1stWonPct = pStats.ret1stTotal > 0 ? (pStats.ret1stWon / pStats.ret1stTotal) * 100 : 0;
             pStats.ret2ndWonPct = pStats.ret2ndTotal > 0 ? (pStats.ret2ndWon / pStats.ret2ndTotal) * 100 : 0;
        });
    }

    const matchStats = stats['match'];
    const totalPoints = matchStats.player1.serv1stTotal + matchStats.player1.serv2ndTotal + matchStats.player2.serv1stTotal + matchStats.player2.serv2ndTotal;
    matchStats.player1.pointsWon = matchStats.player1.serv1stWon + matchStats.player1.serv2ndWon + matchStats.player1.ret1stWon + matchStats.player1.ret2ndWon;
    matchStats.player2.pointsWon = matchStats.player2.serv1stWon + matchStats.player2.serv2ndWon + matchStats.player2.ret1stWon + matchStats.player2.ret2ndWon;
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
        <div class="match-details">${matchData.location} • ${matchData.surface} • ${matchData.date}</div>
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
    `;

    const numSets = matchData.scores.player1.length;
    const periods = ['match', ...Array.from({length: numSets}, (_, i) => `set${i}`)];
    
    ['player1', 'player2'].forEach((pKey, i) => {
        document.getElementById(`${pKey}-title`).innerHTML = `${i===0 ? '🔵' : '🔴'} ${matchData.players[pKey]}`;
        let table = `<h3 class="results-subtitle">📤 Serving Performance</h3><table class="results-table"><thead><tr><th>Overall</th><th>1st In %</th><th>1st Won %</th><th>2nd Won %</th></tr></thead><tbody>`;
        periods.forEach((p, i) => {
            const s = allStats[p][pKey];
            table += `<tr><td>${p === 'match' ? 'Match' : `Set ${i}`}</td><td>${s.serv1stInPct.toFixed(0)}%</td><td>${s.serv1stWonPct.toFixed(0)}%</td><td>${s.serv2ndWonPct.toFixed(0)}%</td></tr>`;
        });
        table += `</tbody></table><h3 class="results-subtitle">📥 Returning Performance</h3><table class="results-table"><thead><tr><th>Set</th><th colspan="2">Deuce Side (1st/2nd)</th><th colspan="2">Ad Side (1st/2nd)</th></tr></thead><tbody>`;
        for(let i=0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr><td>Set ${i+1}</td><td>${s.retDeuceFirstWon}/${s.retDeuceFirstTotal}</td><td>${s.retDeuceSecondWon}/${s.retDeuceSecondTotal}</td><td>${s.retAdFirstWon}/${s.retAdFirstTotal}</td><td>${s.retAdSecondWon}/${s.retAdSecondTotal}</td></tr>`;
        }
        table += `</tbody></table><h3 class="results-subtitle">🎯 2nd Shot Misses</h3><table class="results-table"><thead><tr><th>Set</th><th>Serving</th><th>Returning</th></tr></thead><tbody>`;
        for(let i=0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr><td>Set ${i+1}</td><td>${s.ssMisses.S}</td><td>${s.ssMisses.R}</td></tr>`;
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
    const filename = `${matchData.date}-S-${p1}-${p2}.pdf`;

    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Tennis Tracker", pdfWidth / 2, margin, { align: 'center' });
    pdf.setFontSize(10).setTextColor(0, 0, 255).textWithLink('https://www.wescoup.com/tonys-tennis-page', pdfWidth / 2, margin + 5, { align: 'center', url: 'https://www.wescoup.com/tonys-tennis-page' });
    
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
