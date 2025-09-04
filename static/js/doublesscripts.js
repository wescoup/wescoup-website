// Tony's Doubles Tracker JavaScript (Rewritten v4 - Now with Set-by-Set Stats)

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let allMatches = [];
let currentMatchIndex = -1;
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
    pointHistory: [] // Tracks every point: { server, deuceReturner, adReturner, outcome: '1' or '0', serve: 'first'/'second', side: 'deuce'/'ad' }
};

function initializePlayerStats() {
    const stats = {};
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        stats[pKey] = {
            returnData: { deuce: { first: "", second: "" }, ad: { first: "", second: "" } },
            secondShotMisses: { S: 0, N: 0, D: 0, A: 0 }
        };
    });
    return stats;
}

function initializeTracker() {
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
    startNewMatch();
    initializeSwipeHandlers();
    loadAllMatches();
}

function startNewMatch() {
    matchData = JSON.parse(JSON.stringify(initialMatchData));
    matchData.id = Date.now(); // Unique ID for each new match
    matchData.stats = initializePlayerStats();
    currentMatchIndex = allMatches.length; // New match is at the end
    updateMatchScrollerUI();
    showSection('match-info');
}

// ... (keep showSection, collectMatchInfo, updateAllDisplays)

function showSection(sectionId) {
    if (sectionId === 'match-tracker' && currentView === 'match-info') {
        collectMatchInfo();
    }
    currentView = sectionId;

    document.querySelectorAll('.tennis-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.tennis-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tennis-nav-btn[onclick="showSection('${sectionId}')"]`).classList.add('active');
    
    if (sectionId === 'results') {
        renderResults(); 
    } else {
        updateAllDisplays();
    }
}

function collectMatchInfo() {
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const inputId = pKey;
        matchData.players[pKey] = document.getElementById(inputId).value.trim() || `P${pKey.slice(-1)}`;
    });
    matchData.location = document.getElementById('location').value.trim() || 'Local Court';
    matchData.surface = document.getElementById('surface').value;
    matchData.date = document.getElementById('matchDate').value;
    
    // Set initial server/returner history based on P1-P4
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
// ... (keep adjustGames, adjustSet, updateScoreDisplay)
function adjustGames(team, change) {
    const setIndex = matchData.scores.team1.length - 1;
    matchData.scores[team][setIndex] = Math.max(0, (matchData.scores[team][setIndex] || 0) + change);
    updateScoreDisplay();
}

function adjustSet(change) {
    // Finalize the last set before adding a new one
    if (change > 0 && matchData.scores.team1.length > 0) {
        // You could add logic here to check for valid set scores if needed
    }
    
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
// ... (keep updateServer, changeReturners, getAbbrev, updateServerDropdown, updateReturnerDisplay)

function updateServer() {
    const previousServer = matchData.currentServer;
    matchData.currentServer = document.getElementById('currentServer').value;
    // If the serving team changed, update the returners to the other team
    if (matchData.teams.team1.includes(previousServer) !== matchData.teams.team1.includes(matchData.currentServer)) {
        const returningTeam = matchData.teams.team1.includes(matchData.currentServer) ? 'team2' : 'team1';
        matchData.returners = { ...matchData.returnerHistory[returningTeam] };
    }
    updateAllDisplays();
}

function changeReturners() {
    [matchData.returners.deuce, matchData.returners.ad] = [matchData.returners.ad, matchData.returners.deuce];
    // Save the new returner alignment for the returning team
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
        option.textContent = getAbbrev(pKey);
        select.appendChild(option);
    });
    select.value = matchData.currentServer;
}

function updateReturnerDisplay() {
    document.getElementById('deuceReturnerName').textContent = matchData.players[matchData.returners.deuce];
    document.getElementById('adReturnerName').textContent = matchData.players[matchData.returners.ad];
}


// --- POINT & RETURN TRACKING ---
// Major change: pointHistory is now the source of truth
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
        type: 'return'
    });
    updateReturnStringsDisplay();
}

function undoLastPoint() {
    if (matchData.pointHistory.length === 0) return;
    const lastPoint = matchData.pointHistory.pop();
    
    if (lastPoint.type === 'secondShotMiss') {
        matchData.stats[lastPoint.playerKey].secondShotMisses[lastPoint.position]--;
    }
    // No need to do anything else for returns, as strings are now generated from history
    
    updateAllDisplays();
}

function gameComplete() {
    const currentSetIndex = matchData.scores.team1.length - 1;
    matchData.pointHistory.push({ setIndex: currentSetIndex, type: 'gameComplete' });
    updateReturnStringsDisplay(); // Just to clear the view for the next game
}

function updateReturnStringsDisplay() {
    if (currentView !== 'match-tracker') return;

    // Find the last 'gameComplete' to get points for the current game
    let lastGameBreak = -1;
    for (let i = matchData.pointHistory.length - 1; i >= 0; i--) {
        if (matchData.pointHistory[i].type === 'gameComplete') {
            lastGameBreak = i;
            break;
        }
    }
    const currentGamePoints = matchData.pointHistory.slice(lastGameBreak + 1);

    // Generate return strings for the current game only
    const strings = {
        deuce: { first: '', second: '' },
        ad: { first: '', second: '' }
    };

    currentGamePoints.forEach(p => {
        if (p.type === 'return') {
            strings[p.side][p.serve] += p.outcome;
        }
    });

    document.getElementById('deuce_first_return_str').textContent = strings.deuce.first || "-";
    document.getElementById('deuce_second_return_str').textContent = strings.deuce.second || "-";
    document.getElementById('ad_first_return_str').textContent = strings.ad.first || "-";
    document.getElementById('ad_second_return_str').textContent = strings.ad.second || "-";
}


// --- SECOND SHOT TRACKING ---
// ... (keep getPlayerPosition, recordSecondShotMiss, updateSecondShotDisplay)
// Note: undo is handled by the generic undoLastPoint now.

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
    
    matchData.stats[playerKey].secondShotMisses[position]++; // Still increment for live view
    
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
    let tallyHTML = '';
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const pos = getPlayerPosition(pKey);
        const btn = document.getElementById(`p${pKey.slice(-1)}_ss`);
        if(btn) btn.textContent = `${getAbbrev(pKey)}-${pos}`;

        const misses = Object.values(matchData.stats[pKey].secondShotMisses).reduce((a, b) => a + b, 0);
        if (misses > 0) {
            tallyHTML += `<span>${getAbbrev(pKey)}: ${misses}</span>`;
        }
    });
    document.getElementById('ssMissTally').innerHTML = tallyHTML || '<span>No misses yet</span>';
    
    const positions = ['player1', 'player2', 'player3', 'player4'].map(pKey => {
        const pos = getPlayerPosition(pKey);
        return `${getAbbrev(pKey)}(${pos})`;
    }).join(' | ');
    document.getElementById('currentPositions').textContent = positions;
}


// --- LOCAL STORAGE & MATCH SCROLLING ---
function saveCurrentMatch() {
    // Find if match already exists and update it, otherwise add new
    const existingIndex = allMatches.findIndex(m => m.id === matchData.id);
    if (existingIndex > -1) {
        allMatches[existingIndex] = JSON.parse(JSON.stringify(matchData));
    } else {
        allMatches.push(JSON.parse(JSON.stringify(matchData)));
    }
    localStorage.setItem('doublesMatches', JSON.stringify(allMatches));
    alert('Match saved!');
    updateMatchScrollerUI();
}

function loadAllMatches() {
    const saved = localStorage.getItem('doublesMatches');
    if (saved) {
        allMatches = JSON.parse(saved);
        if (allMatches.length > 0) {
            currentMatchIndex = allMatches.length - 1;
            loadMatch(currentMatchIndex);
        }
    }
    updateMatchScrollerUI();
}

function loadMatch(index) {
    if (index >= 0 && index < allMatches.length) {
        currentMatchIndex = index;
        matchData = JSON.parse(JSON.stringify(allMatches[index]));
        // Ensure stats object exists for older data
        if (!matchData.stats) {
            matchData.stats = initializePlayerStats();
        }
        renderResults(); // Directly render results as we are loading a finished match
    }
    updateMatchScrollerUI();
}

function scrollMatches(direction) {
    const newIndex = currentMatchIndex + direction;
    if (newIndex >= 0 && newIndex < allMatches.length) {
        loadMatch(newIndex);
    }
}

function deleteCurrentMatch() {
    if (currentMatchIndex >= 0 && currentMatchIndex < allMatches.length) {
        if (confirm('Are you sure you want to delete this match?')) {
            allMatches.splice(currentMatchIndex, 1);
            localStorage.setItem('doublesMatches', JSON.stringify(allMatches));
            
            if (allMatches.length > 0) {
                loadMatch(Math.max(0, currentMatchIndex - 1));
            } else {
                startNewMatch();
            }
        }
    }
}

function updateMatchScrollerUI() {
    const scroller = document.getElementById('match-scroller');
    if (!scroller) return;

    if (allMatches.length > 0) {
        scroller.style.display = 'flex';
        const date = allMatches[currentMatchIndex]?.date || 'N/A';
        const p1 = getAbbrev(allMatches[currentMatchIndex]?.teams.team1[0]);
        const p2 = getAbbrev(allMatches[currentMatchIndex]?.teams.team1[1]);
        document.getElementById('scroller-text').textContent = `Match ${currentMatchIndex + 1} of ${allMatches.length} (${date} - ${p1}/${p2})`;
    } else {
        scroller.style.display = 'none';
    }
}

// --- RESULTS ---

function renderResults() {
    saveCurrentMatch(); // Auto-save when results are viewed
    const container = document.getElementById('results');
    container.innerHTML = `
        <div id="match-scroller" class="tennis-nav" style="display:none;">
             <button class="tennis-nav-btn" onclick="scrollMatches(-1)">◀</button>
             <span id="scroller-text" style="align-self: center; padding: 0 1rem; font-weight: bold;"></span>
             <button class="tennis-nav-btn" onclick="scrollMatches(1)">▶</button>
             <button class="tennis-nav-btn" onclick="deleteCurrentMatch()">🗑️</button>
        </div>
        <div class="results-navigation">
            ${Array.from({length: totalResultsViews}, (_, i) => `<div class="nav-dot ${i === 0 ? 'active' : ''}" onclick="showResultsView(${i})"></div>`).join('')}
        </div>
        <div class="swipe-hint">← Swipe to navigate →</div>
        <div id="results-views-container" style="overflow-x: hidden;">
            ${generateAllResultsViewsHTML()}
        </div>
    `;
    updateMatchScrollerUI();
    populateAllResultsViews();
    showResultsView(currentResultsView);
}

// ... (keep showResultsView, initializeSwipeHandlers)
function showResultsView(index) {
    currentResultsView = index;
    document.querySelectorAll('.results-view').forEach(v => v.style.display = 'none');
    const view = document.getElementById(`results-view-${index}`);
    if (view) {
      view.style.display = 'block';
    }
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
    let html = '';

    // View 0: Match Summary
    html += `<div class="results-view" id="results-view-0">
        <div class="view-title">📊 Match Summary</div>
        <div class="match-summary">
            <h3 class="results-subtitle">🏆 Final Score</h3>
            <div id="finalScoreDisplay" class="final-score"></div>
            <div id="matchDetailsDisplay" class="match-details"></div>
            <h3 class="results-subtitle">Players</h3>
            <div class="stats-grid" style="grid-template-columns: 1fr 1fr; text-align: left; padding: 0 1rem;">
                <div id="team1PlayerNames"></div>
                <div id="team2PlayerNames"></div>
            </div>
             <h3 class="results-subtitle">Points Won</h3>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-label" id="team1WonLabel">Team 1</div><div class="stat-value" id="team1PointsWon"></div></div>
                <div class="stat-card"><div class="stat-label" id="team2WonLabel">Team 2</div><div class="stat-value" id="team2PointsWon"></div></div>
            </div>
        </div>
        <div class="text-center" style="margin-top: 1rem;"><button class="tennis-btn" onclick="generatePdf()">Save as PDF</button></div>
    </div>`;

    // Views 1 & 2: Team Results
    [1, 2].forEach(teamNum => {
        const teamKey = `team${teamNum}`;
        const pKeys = teamNum === 1 ? ['player1', 'player2'] : ['player3', 'player4'];
        html += `<div class="results-view" id="results-view-${teamNum}">
            <div class="view-title">${teamNum === 1 ? '🔵' : '🔴'} ${matchData.players[pKeys[0]]} & ${matchData.players[pKeys[1]]}</div>
            <div class="team-card team-${teamNum}" id="team-results-${teamKey}">
                </div>
        </div>`;
    });
    
    // Views 3-6: Player Results
    ['player1', 'player2', 'player3', 'player4'].forEach((pKey, i) => {
        const viewNum = i + 3;
        const teamNum = i < 2 ? 1 : 2;
        html += `<div class="results-view" id="results-view-${viewNum}">
            <div class="view-title">👤 ${matchData.players[pKey]}</div>
            <div class="player-card team-${teamNum}" id="player-results-${pKey}">
                 </div>
        </div>`;
    });
    
    return html;
}

function calculateAllStats() {
    const numSets = matchData.scores.team1.length;
    const stats = {}; // { match: {}, set0: {}, set1: {}, ... }

    for (let i = -1; i < numSets; i++) { // -1 for match totals
        const key = i === -1 ? 'match' : `set${i}`;
        const periodStats = stats[key] = {
            team1: {}, team2: {}, player1: {}, player2: {}, player3: {}, player4: {}
        };
        
        const pointsInPeriod = i === -1 ? matchData.pointHistory : matchData.pointHistory.filter(p => p.setIndex === i);

        // 1. Tally return points and 2nd shot misses for each player
        ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
            const pStats = periodStats[pKey] = {
                retDeuceFirstWon: 0, retDeuceFirstTotal: 0, retDeuceSecondWon: 0, retDeuceSecondTotal: 0,
                retAdFirstWon: 0, retAdFirstTotal: 0, retAdSecondWon: 0, retAdSecondTotal: 0,
                ssMisses: { S: 0, N: 0, D: 0, A: 0 }
            };
            const returnPoints = pointsInPeriod.filter(p => p.type === 'return' && p.returner === pKey);
            returnPoints.forEach(p => {
                if (p.side === 'deuce' && p.serve === 'first') { pStats.retDeuceFirstTotal++; if (p.outcome === '1') pStats.retDeuceFirstWon++; }
                if (p.side === 'deuce' && p.serve === 'second') { pStats.retDeuceSecondTotal++; if (p.outcome === '1') pStats.retDeuceSecondWon++; }
                if (p.side === 'ad' && p.serve === 'first') { pStats.retAdFirstTotal++; if (p.outcome === '1') pStats.retAdFirstWon++; }
                if (p.side === 'ad' && p.serve === 'second') { pStats.retAdSecondTotal++; if (p.outcome === '1') pStats.retAdSecondWon++; }
            });
            const ssMisses = pointsInPeriod.filter(p => p.type === 'secondShotMiss' && p.playerKey === pKey);
            ssMisses.forEach(p => pStats.ssMisses[p.position]++);
        });

        // 2. Aggregate team stats from player stats
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
        
        // 3. Calculate serving stats from opponent's return stats
        ['team1', 'team2'].forEach(teamKey => {
             const tStats = periodStats[teamKey];
             const oppTeamKey = teamKey === 'team1' ? 'team2' : 'team1';
             const oppStats = periodStats[oppTeamKey];
             
             tStats.serv1stTotal = oppStats.ret1stTotal;
             tStats.serv1stWon = tStats.serv1stTotal - oppStats.ret1stWon;
             tStats.serv2ndTotal = oppStats.ret2ndTotal;
             tStats.serv2ndWon = tStats.serv2ndTotal - oppStats.ret2ndWon;
             
             // Add percentages
             tStats.serv1stInPct = (tStats.serv1stTotal + tStats.serv2ndTotal) > 0 ? (tStats.serv1stTotal / (tStats.serv1stTotal + tStats.serv2ndTotal)) * 100 : 0;
             tStats.serv1stWonPct = tStats.serv1stTotal > 0 ? (tStats.serv1stWon / tStats.serv1stTotal) * 100 : 0;
             tStats.serv2ndWonPct = tStats.serv2ndTotal > 0 ? (tStats.serv2ndWon / tStats.serv2ndTotal) * 100 : 0;
             tStats.ret1stWonPct = tStats.ret1stTotal > 0 ? (tStats.ret1stWon / tStats.ret1stTotal) * 100 : 0;
             tStats.ret2ndWonPct = tStats.ret2ndTotal > 0 ? (tStats.ret2ndWon / tStats.ret2ndTotal) * 100 : 0;
        });
    }

    // Calculate overall points won for the match summary
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
    document.getElementById('finalScoreDisplay').innerHTML = `🔵 ${matchData.scores.team1.join('-')} &nbsp; | &nbsp; 🔴 ${matchData.scores.team2.join('-')}`;
    document.getElementById('matchDetailsDisplay').textContent = `${matchData.location} • ${matchData.surface} • ${matchData.date}`;
    document.getElementById('team1PlayerNames').innerHTML = `<b>🔵 Team 1:</b><br>${matchData.players.player1}<br>${matchData.players.player2}`;
    document.getElementById('team2PlayerNames').innerHTML = `<b>🔴 Team 2:</b><br>${matchData.players.player3}<br>${matchData.players.player4}`;
    document.getElementById('team1WonLabel').textContent = `${getAbbrev('player1')}/${getAbbrev('player2')} Won`;
    document.getElementById('team2WonLabel').textContent = `${getAbbrev('player3')}/${getAbbrev('player4')} Won`;
    document.getElementById('team1PointsWon').textContent = `${matchStats.team1.pointsWon} (${matchStats.team1.pointsWonPct.toFixed(0)}%)`;
    document.getElementById('team2PointsWon').textContent = `${matchStats.team2.pointsWon} (${matchStats.team2.pointsWonPct.toFixed(0)}%)`;

    // --- Populate Team & Player Views ---
    const numSets = matchData.scores.team1.length;
    const periods = ['match', ...Array.from({length: numSets}, (_, i) => `set${i}`)];
    
    // Team Views
    ['team1', 'team2'].forEach(teamKey => {
        let table = `
            <table class="results-table">
                <thead><tr><th>Serving</th><th>1st In %</th><th>1st Won %</th><th>2nd Won %</th></tr></thead>
                <tbody>`;
        periods.forEach((p, i) => {
            const label = p === 'match' ? 'Match' : `Set ${i}`;
            const s = allStats[p][teamKey];
            table += `<tr><td>${label}</td><td>${s.serv1stInPct.toFixed(0)}%</td><td>${s.serv1stWonPct.toFixed(0)}%</td><td>${s.serv2ndWonPct.toFixed(0)}%</td></tr>`;
        });
        table += `</tbody>
            <thead><tr><th>Returning</th><th>vs 1st</th><th>vs 2nd</th><th></th></tr></thead>
                <tbody>`;
        periods.forEach((p, i) => {
            const label = p === 'match' ? 'Match' : `Set ${i}`;
            const s = allStats[p][teamKey];
            table += `<tr><td>${label}</td><td>${s.ret1stWonPct.toFixed(0)}%</td><td>${s.ret2ndWonPct.toFixed(0)}%</td><td></td></tr>`;
        });
         table += `</tbody>
            <thead><tr><th>2nd Shot Misses</th><th>Serving</th><th>Returning</th><th></th></tr></thead>
                <tbody>`;
        periods.forEach((p, i) => {
            const label = p === 'match' ? 'Match' : `Set ${i}`;
            const s = allStats[p][teamKey];
            table += `<tr><td>${label}</td><td>${s.ssServing}</td><td>${s.ssReturning}</td><td></td></tr>`;
        });
        table += `</tbody></table>`;
        document.getElementById(`team-results-${teamKey}`).innerHTML = table;
    });

    // Player Views
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        let table = `
            <h3 class="results-subtitle">📤 Serving Performance</h3>
            <table class="results-table">
                <thead><tr><th>Set</th><th colspan="2">Deuce Side (1st/2nd)</th><th colspan="2">Ad Side (1st/2nd)</th></tr></thead>
                <tbody>`;
        for(let i=0; i < numSets; i++) {
             const setStats = allStats[`set${i}`];
             const oppTeamKey = matchData.teams.team1.includes(pKey) ? 'team2' : 'team1';
             const deuceReturner = matchData.returnerHistory[oppTeamKey].deuce;
             const adReturner = matchData.returnerHistory[oppTeamKey].ad;

             const s_d1_w = setStats[deuceReturner].retDeuceFirstTotal - setStats[deuceReturner].retDeuceFirstWon;
             const s_d1_t = setStats[deuceReturner].retDeuceFirstTotal;
             const s_d2_w = setStats[deuceReturner].retDeuceSecondTotal - setStats[deuceReturner].retDeuceSecondWon;
             const s_d2_t = setStats[deuceReturner].retDeuceSecondTotal;
             
             const s_a1_w = setStats[adReturner].retAdFirstTotal - setStats[adReturner].retAdFirstWon;
             const s_a1_t = setStats[adReturner].retAdFirstTotal;
             const s_a2_w = setStats[adReturner].retAdSecondTotal - setStats[adReturner].retAdSecondWon;
             const s_a2_t = setStats[adReturner].retAdSecondTotal;

            table += `<tr><td>Set ${i+1}</td><td>${s_d1_w}/${s_d1_t}</td><td>${s_d2_w}/${s_d2_t}</td><td>${s_a1_w}/${s_a1_t}</td><td>${s_a2_w}/${s_a2_t}</td></tr>`;
        }
        table += `</tbody></table>
            <h3 class="results-subtitle">📥 Returning Performance</h3>
            <table class="results-table">
                <thead><tr><th>Set</th><th colspan="2">Deuce Side (1st/2nd)</th><th colspan="2">Ad Side (1st/2nd)</th></tr></thead>
                <tbody>`;
        for(let i=0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr><td>Set ${i+1}</td><td>${s.retDeuceFirstWon}/${s.retDeuceFirstTotal}</td><td>${s.retDeuceSecondWon}/${s.retDeuceSecondTotal}</td><td>${s.retAdFirstWon}/${s.retAdFirstTotal}</td><td>${s.retAdSecondWon}/${s.retAdSecondTotal}</td></tr>`;
        }
        table += `</tbody></table>
             <h3 class="results-subtitle">🎯 2nd Shot Misses</h3>
             <table class="results-table">
                <thead><tr><th>Set</th><th>Server</th><th>Net</th><th>Deuce Ret</th><th>Ad Ret</th></tr></thead>
                <tbody>`;
        for(let i=0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr><td>Set ${i+1}</td><td>${s.ssMisses.S}</td><td>${s.ssMisses.N}</td><td>${s.ssMisses.D}</td><td>${s.ssMisses.A}</td></tr>`;
        }
        table += `</tbody></table>`;
        document.getElementById(`player-results-${pKey}`).innerHTML = table;
    });
}


function generatePdf() {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("PDF generation library is not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10; // Top margin in mm

    // --- Add PDF Header ---
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
            
            // Add image with top margin. For the first page, add extra margin for the header.
            const yPos = index === 0 ? margin + 10 : margin;
            pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, imgHeight);
        });
    });

    promise.then(() => {
        document.body.classList.remove('pdf-export-mode');
        pdf.save(`${matchData.date || 'match'}-doubles-stats.pdf`);
    });
}
