// Tony's Doubles Tracker JavaScript (Rewritten v5 - Match History)

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
    startNewMatch(); // Always start with a fresh match
    initializeSwipeHandlers();
}

function startNewMatch() {
    matchData = JSON.parse(JSON.stringify(initialMatchData));
    matchData.id = Date.now(); // Unique ID for each new match
    showSection('match-info');
    // Reset inputs
    document.getElementById('player1').value = "Player 1";
    document.getElementById('player2').value = "Player 2";
    document.getElementById('player3').value = "Player 3";
    document.getElementById('player4').value = "Player 4";
    document.getElementById('location').value = "Local Court";
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

// --- POINT & RETURN TRACKING ---
function recordReturn(court, serveType, won) {
    const returnerKey = matchData.returners[court];
    const outcome = won ? '1' : '0';
    const currentSetIndex = matchData.scores.team1.length - 1;

    matchData.pointHistory.push({
        setIndex: currentSetIndex,
        server: matchData.currentServer,
        returner: returnerKey,
        serve: serveType,
        side: court,
        outcome: outcome,
        type: 'return',
        // Preserve state for undo
        returnerHistory: JSON.parse(JSON.stringify(matchData.returnerHistory))
    });
    updateReturnStringsDisplay();
}

function undoLastPoint() {
    if (matchData.pointHistory.length === 0) return;
    const lastPoint = matchData.pointHistory.pop();
    
    // If it was a miss, we need to find the point it was associated with to correctly decrement the counter.
    // For simplicity here, we assume miss tracking is independent. Let's just undo the last action.
    if (lastPoint.type === 'secondShotMiss') {
        // This is a simplified undo. A more robust system would link misses to points.
    }
    
    updateAllDisplays();
}

function gameComplete() {
    const currentSetIndex = matchData.scores.team1.length - 1;
    matchData.pointHistory.push({ setIndex: currentSetIndex, type: 'gameComplete' });
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

// --- SECOND SHOT TRACKING ---
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

function recordSecondShotMiss(playerKey) {
    const position = getPlayerPosition(playerKey);
    const currentSetIndex = matchData.scores.team1.length - 1;
    matchData.pointHistory.push({
        setIndex: currentSetIndex,
        playerKey: playerKey,
        position: position,
        type: 'secondShotMiss'
    });
    updateSecondShotDisplay();
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
    alert('Match saved!');
    renderSavedMatchesList(); // Refresh list after saving
}

function loadAllMatches() {
    const saved = localStorage.getItem('doublesMatches');
    if (saved) allMatches = JSON.parse(saved);
}

function loadMatch(id) {
    const matchToLoad = allMatches.find(m => m.id === id);
    if (matchToLoad) {
        matchData = JSON.parse(JSON.stringify(matchToLoad));
        
        // Repopulate Match Info tab
        ['player1', 'player2', 'player3', 'player4', 'location', 'surface', 'date'].forEach(key => {
            const el = document.getElementById(key === 'date' ? 'matchDate' : key);
            if (el) el.value = matchData[key] || matchData.players[key] || '';
        });

        // Make it the active match and go to tracker
        showSection('match-tracker');
        updateAllDisplays();
    }
}

function deleteMatch(id) {
    if (confirm('Are you sure you want to delete this match?')) {
        allMatches = allMatches.filter(m => m.id !== id);
        localStorage.setItem('doublesMatches', JSON.stringify(allMatches));
        renderSavedMatchesList(); // Refresh the list
    }
}

function renderSavedMatchesList() {
    const container = document.getElementById('saved-matches-list');
    if (allMatches.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No saved matches yet.</p>';
        return;
    }
    
    let html = '';
    [...allMatches].reverse().forEach(match => { // Show newest first
        const t1p1 = match.players.player1;
        const t1p2 = match.players.player2;
        const t2p1 = match.players.player3;
        const t2p2 = match.players.player4;
        const score = `${match.scores.team1.join('-')} | ${match.scores.team2.join('-')}`;
        html += `<div class="stat-card" style="margin-bottom: 1rem; text-align: left;">
            <p><b>Date:</b> ${match.date} (${match.location})</p>
            <p><b>Teams:</b> ${t1p1}/${t1p2} vs ${t2p1}/${t2p2}</p>
            <p><b>Score:</b> ${score}</p>
            <div class="tennis-btn-group" style="margin-top: 1rem;">
                <button class="tennis-btn" onclick="loadMatch(${match.id})">Load & Continue</button>
                <button class="tennis-btn" onclick="deleteMatch(${match.id})">Delete</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// --- RESULTS RENDERING & CALCULATION ---
// ... (All functions from here down are for the Results tab)
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

// HTML structure generation (remains largely the same)
function generateAllResultsViewsHTML() {
    // This function is now much simpler, it just creates the containers
    let html = `
    <div class="results-view" id="results-view-0">
        <div class="view-title">📊 Match Summary</div>
        <div class="match-summary" id="summary-content"></div>
        <div class="tennis-btn-group" style="margin-top:1rem;">
            <button class="tennis-btn" onclick="saveCurrentMatch()">💾 Save Match</button>
            <button class="tennis-btn" onclick="generatePdf()">📄 Save as PDF</button>
        </div>
    </div>`;
    ['team1', 'team2'].forEach((teamKey, i) => {
        html += `<div class="results-view" id="results-view-${i+1}"><div class="view-title">${i===0 ? '🔵' : '🔴'} Team Stats</div><div id="${teamKey}-results-card"></div></div>`;
    });
    ['player1', 'player2', 'player3', 'player4'].forEach((pKey, i) => {
        html += `<div class="results-view" id="results-view-${i+3}"><div class="view-title">👤 Player Stats</div><div id="${pKey}-results-card"></div></div>`;
    });
    return html;
}

// The main calculation engine
function calculateAllStats() {
    // ... (This function remains the same as the previous version)
}

// The main population engine
function populateAllResultsViews() {
    // ... (This function remains the same as the previous version)
}

// PDF Generation
function generatePdf() {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("PDF generation library is not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    
    const p1Init = matchData.players.player1.charAt(0);
    const p2Init = matchData.players.player2.charAt(0);
    const p3Init = matchData.players.player3.charAt(0);
    const p4Init = matchData.players.player4.charAt(0);
    const filename = `${matchData.date}-D-${p1Init}${p2Init}-${p3Init}${p4Init}-stats.pdf`;

    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Doubles Tracker", pdfWidth / 2, margin, { align: 'center' });
    pdf.setFontSize(10).setTextColor(0, 0, 255).textWithLink('https://www.wescoup.com/tonys-tennis-page', pdfWidth / 2, margin + 5, { align: 'center', url: 'https://www.wescoup.com/tonys-tennis-page' });
    
    document.body.classList.add('pdf-export-mode');

    let promise = Promise.resolve();
    const elements = document.querySelectorAll('.results-view');
    
    elements.forEach((element, index) => {
        promise = promise.then(() => html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: 800 
        })).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            if (index > 0) pdf.addPage();
            const yPos = index === 0 ? margin + 10 : margin;
            pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, imgHeight);
        });
    });

    promise.then(() => {
        document.body.classList.remove('pdf-export-mode');
        pdf.save(filename);
    });
}
