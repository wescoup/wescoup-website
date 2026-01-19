// Tony's Doubles Tracker JavaScript (Rewritten v6.1 - Per-Set SSM Tracking)

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let allMatches = [];
let currentView = 'match-info';
let currentResultsView = 0;
const totalResultsViews = 7;

// A clean slate for a new match, preserving structure
const initialMatchData = {
    id: null,
    players: { player1: 'P1', player2: 'P2', player3: 'P3', player4: 'P4' },
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
    
    // Set default player names to P1, P2, etc.
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
    updateAllDisplays();
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
    
    const deuceReturner = matchData.returners.deuce;
    const adReturner = matchData.returners.ad;
    
    const strings = { deuce: { first: '', second: '' }, ad: { first: '', second: '' } };

    currentGamePoints.forEach(p => {
        if (p.type === 'return') {
            if (p.returner === deuceReturner && p.side === 'deuce') {
                strings.deuce[p.serve] += p.outcome;
            } else if (p.returner === adReturner && p.side === 'ad') {
                strings.ad[p.serve] += p.outcome;
            }
        }
    });

    document.getElementById('deuce_first_return_str').textContent = strings.deuce.first || "-";
    document.getElementById('deuce_second_return_str').textContent = strings.deuce.second || "-";
    document.getElementById('ad_first_return_str').textContent = strings.ad.first || "-";
    document.getElementById('ad_second_return_str').textContent = strings.ad.second || "-";
}

// --- MODIFIED: SECOND SHOT DISPLAY (Per-Set) ---
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
    
    const currentSetIndex = matchData.scores.team1.length - 1;
    let tally = { player1:0, player2:0, player3:0, player4:0 };
    matchData.pointHistory
        .filter(p => p.type === 'secondShotMiss' && p.setIndex === currentSetIndex)
        .forEach(p => tally[p.playerKey]++);
    
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const btn = document.getElementById(`p${pKey.slice(-1)}_ss`);
        if (btn) btn.textContent = `${getAbbrev(pKey)}-${getPlayerPosition(pKey)}`;
    });
    
    let tallyHTML = '';
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        if (tally[pKey] > 0) tallyHTML += `<span>${getAbbrev(pKey)}: ${tally[pKey]}</span>`;
    });
    document.getElementById('ssMissTally').innerHTML = tallyHTML || '<span>No misses this set</span>';
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
        
        ['player1', 'player2', 'player3', 'player4'].forEach(key => {
            document.getElementById(key).value = matchData.players[key];
        });
        document.getElementById('location').value = matchData.location;
        document.getElementById('surface').value = matchData.surface;
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

/* =========================================================================
   CHANGE 1: calculateAllStats()
   - FIX: Compute *player* serving stats using point.server (not opponent/team return stats).
   - FIX: Compute *player* returning stats consistently (ret1st/ret2nd totals + won).
   - FIX: Outcome in pointHistory is stored as '1'/'0' (see recordReturn), not 'w'/'l').
   - ADD: Per-side serving breakdown fields (servDeuce* / servAd*) so player tables can
          show real serving-by-side numbers instead of reusing return fields.
   ========================================================================= */
function calculateAllStats() {
    /* =========================================================================
       CHANGE 1: calculateAllStats()
       - FIX: Build stats for BOTH match + each set using consistent keys: 'match', 'set0', 'set1', ...
       - FIX: Compute *player* serving stats from point.server (NOT opponent return stats).
       - FIX: Compute *player* returning stats from point.returner.
       - FIX: point.outcome is stored as '1'/'0' (see recordReturn), not 'w'/'l'.
       - FIX: secondShotMiss uses point.position (recordSecondShotMiss), not missPosition.
       - ADD: Per-side serving breakdown fields (servDeuce / servAd) so player tables use real serve-side data.
       ========================================================================= */

    const numSets = matchData.scores.team1.length;

    const stats = { match: {} };
    for (let i = 0; i < numSets; i++) stats[`set${i}`] = {};

    const allPlayers = ['player1', 'player2', 'player3', 'player4'];
    const allTeams = ['team1', 'team2'];

    const pointCategories = [
        // Serving totals
        'serv1stTotal', 'serv1stWon', 'serv2ndTotal', 'serv2ndWon',
        // Serving by side + serve
        'servDeuceFirstTotal', 'servDeuceFirstWon',
        'servDeuceSecondTotal', 'servDeuceSecondWon',
        'servAdFirstTotal', 'servAdFirstWon',
        'servAdSecondTotal', 'servAdSecondWon',

        // Returning totals
        'ret1stTotal', 'ret1stWon', 'ret2ndTotal', 'ret2ndWon',
        // Returning by side + serve
        'retDeuceFirstTotal', 'retDeuceFirstWon',
        'retDeuceSecondTotal', 'retDeuceSecondWon',
        'retAdFirstTotal', 'retAdFirstWon',
        'retAdSecondTotal', 'retAdSecondWon',

        // Second-shot misses
        'ssMisses'
    ];

    function initEntity(obj) {
        pointCategories.forEach(cat => {
            obj[cat] = (cat === 'ssMisses')
                ? { S: 0, N: 0, D: 0, A: 0 }
                : 0;
        });
    }

    // Initialize all periods + entities
    const periodKeys = ['match', ...Array.from({ length: numSets }, (_, i) => `set${i}`)];
    periodKeys.forEach(pk => {
        stats[pk].team1 = {}; stats[pk].team2 = {};
        allPlayers.forEach(p => { stats[pk][p] = {}; });

        allTeams.forEach(t => initEntity(stats[pk][t]));
        allPlayers.forEach(p => initEntity(stats[pk][p]));
    });

    // --- Aggregate from point history ---
    matchData.pointHistory.forEach(point => {
        // Only set-based points exist in history; also roll them into 'match'
        const setKey = (typeof point.setIndex === 'number') ? `set${point.setIndex}` : null;
        const targets = ['match'];
        if (setKey && stats[setKey]) targets.push(setKey);

        if (point.type === 'return') {
            const serveType = point.serve;          // 'first' | 'second'
            const side = point.side;                // 'deuce' | 'ad'
            const returnWon = (point.outcome === '1');
                const serverWon = !returnWon; // return-based tracking: server win is inverse     // recordReturn stores '1'/'0'

            targets.forEach(pk => {
                // 1) RETURN stats (credited to RETURNER)
                if (point.returner && stats[pk][point.returner]) {
                    const r = stats[pk][point.returner];

                    if (serveType === 'first') {
                        r.ret1stTotal++;
                        if (returnWon) r.ret1stWon++;
                    } else {
                        r.ret2ndTotal++;
                        if (returnWon) r.ret2ndWon++;
                    }

                    if (side === 'deuce') {
                        if (serveType === 'first') {
                            r.retDeuceFirstTotal++;
                            if (returnWon) r.retDeuceFirstWon++;
                        } else {
                            r.retDeuceSecondTotal++;
                            if (returnWon) r.retDeuceSecondWon++;
                        }
                    } else if (side === 'ad') {
                        if (serveType === 'first') {
                            r.retAdFirstTotal++;
                            if (returnWon) r.retAdFirstWon++;
                        } else {
                            r.retAdSecondTotal++;
                            if (returnWon) r.retAdSecondWon++;
                        }
                    }
                }

                // 2) SERVE stats (credited to SERVER)
                if (point.server && stats[pk][point.server]) {
                    const s = stats[pk][point.server];

                    if (serveType === 'first') {
                        s.serv1stTotal++;
                        if (serverWon) s.serv1stWon++;
                    } else {
                        s.serv2ndTotal++;
                        if (serverWon) s.serv2ndWon++;
                    }

                    if (side === 'deuce') {
                        if (serveType === 'first') {
                            s.servDeuceFirstTotal++;
                            if (serverWon) s.servDeuceFirstWon++;
                        } else {
                            s.servDeuceSecondTotal++;
                            if (serverWon) s.servDeuceSecondWon++;
                        }
                    } else if (side === 'ad') {
                        if (serveType === 'first') {
                            s.servAdFirstTotal++;
                            if (serverWon) s.servAdFirstWon++;
                        } else {
                            s.servAdSecondTotal++;
                            if (serverWon) s.servAdSecondWon++;
                        }
                    }
                }
            });
        }

        if (point.type === 'secondShotMiss') {
            // recordSecondShotMiss stores "position" (S/N/D/A)
            const pos = point.position;
            const who = point.playerKey;
            if (!who || !pos) return;

            targets.forEach(pk => {
                if (!stats[pk][who]) return;
                const ss = stats[pk][who].ssMisses;
                ss[pos] = (ss[pos] || 0) + 1;
            });
        }
    });

    // --- Roll up PLAYER → TEAM stats for each period ---
    periodKeys.forEach(pk => {
        allTeams.forEach(teamKey => {
            const teamPlayers = matchData.teams[teamKey] || [];

            pointCategories.forEach(cat => {
                if (cat === 'ssMisses') return;
                stats[pk][teamKey][cat] = teamPlayers.reduce((sum, p) => sum + (stats[pk][p][cat] || 0), 0);
            });

            const ss = stats[pk][teamKey].ssMisses;
            ss.S = teamPlayers.reduce((sum, p) => sum + (stats[pk][p].ssMisses.S || 0), 0);
            ss.N = teamPlayers.reduce((sum, p) => sum + (stats[pk][p].ssMisses.N || 0), 0);
            ss.D = teamPlayers.reduce((sum, p) => sum + (stats[pk][p].ssMisses.D || 0), 0);
            ss.A = teamPlayers.reduce((sum, p) => sum + (stats[pk][p].ssMisses.A || 0), 0);

            // Derived team serving percentages (used by existing UI)
            const t = stats[pk][teamKey];
            const totalServes = t.serv1stTotal + t.serv2ndTotal;
            t.serv1stInPct = totalServes > 0 ? (t.serv1stTotal / totalServes) * 100 : 0;
            t.serv1stWonPct = t.serv1stTotal > 0 ? (t.serv1stWon / t.serv1stTotal) * 100 : 0;
            t.serv2ndWonPct = t.serv2ndTotal > 0 ? (t.serv2ndWon / t.serv2ndTotal) * 100 : 0;
        });
    });

    // --- Match summary fields (points won) ---
    const matchStats = stats.match;

    // Total points = all serves by both teams (each point has exactly one server)
    const totalPoints = (matchStats.team1.serv1stTotal + matchStats.team1.serv2ndTotal) +
                        (matchStats.team2.serv1stTotal + matchStats.team2.serv2ndTotal);

    matchStats.team1.pointsWon = matchStats.team1.serv1stWon + matchStats.team1.serv2ndWon;
    matchStats.team2.pointsWon = matchStats.team2.serv1stWon + matchStats.team2.serv2ndWon;

    matchStats.team1.pointsWonPct = totalPoints > 0 ? (matchStats.team1.pointsWon / totalPoints) * 100 : 0;
    matchStats.team2.pointsWonPct = totalPoints > 0 ? (matchStats.team2.pointsWon / totalPoints) * 100 : 0;

    return stats;
}

function populateAllResultsViews() {
    /* =========================================================================
       CHANGE 2: populateAllResultsViews()
       - FIX: Use the same period keys produced by calculateAllStats(): 'match', 'set0', 'set1', ...
       - FIX: Player "Serving Performance" must use player.serv* fields (NOT player.ret*).
       - FIX: Player "Serving Breakdown" must use servDeuce / servAd fields.
       - FIX: Labels: Set numbers are 1-based in the UI.
       ========================================================================= */

    const allStats = calculateAllStats();
    const numSets = matchData.scores.team1.length;
    const periods = ['match', ...Array.from({ length: numSets }, (_, i) => `set${i}`)];

    // --- Summary ---
    document.getElementById('summary-content').innerHTML = `
        <h3 class="results-subtitle">🏆 Match Summary</h3>
        <table class="results-table">
            <thead><tr><th>Team</th><th>Points Won</th><th>%</th></tr></thead>
            <tbody>
                <tr><td>Team 1</td><td>${allStats.match.team1.pointsWon}</td><td>${allStats.match.team1.pointsWonPct.toFixed(0)}%</td></tr>
                <tr><td>Team 2</td><td>${allStats.match.team2.pointsWon}</td><td>${allStats.match.team2.pointsWonPct.toFixed(0)}%</td></tr>
            </tbody>
        </table>
    `;

    // --- Team Results ---
    ['team1', 'team2'].forEach(teamKey => {
        document.getElementById(`${teamKey}-title`).innerHTML =
            `👥 ${matchData.teams[teamKey].map(p => matchData.players[p]).join(' & ')}`;

        let table = `<h3 class="results-subtitle">📤 Serving Performance</h3>
            <table class="results-table">
            <thead><tr><th>Period</th><th>1st In %</th><th>1st Won %</th><th>2nd Won %</th><th>Double Faults</th><th>Missed Serving</th><th>Missed Returning</th></tr></thead><tbody>`;

        periods.forEach((pk) => {
            const teamStats = allStats[pk][teamKey];

            const df = 0; // placeholder
            const ssMissServing = 0;
            const ssMissReturning = 0;

            const label = (pk === 'match') ? 'Match' : `Set ${Number(pk.replace('set', '')) + 1}`;

            table += `<tr>
                <td>${label}</td>
                <td>${teamStats.serv1stInPct.toFixed(0)}%</td>
                <td>${teamStats.serv1stWonPct.toFixed(0)}%</td>
                <td>${teamStats.serv2ndWonPct.toFixed(0)}%</td>
                <td>${df}</td>
                <td>${ssMissServing}</td>
                <td>${ssMissReturning}</td>
            </tr>`;
        });

        table += `</tbody></table>`;
        document.getElementById(`${teamKey}-results-card`).innerHTML = table;
    });

    // --- Individual Player Results ---
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        document.getElementById(`${pKey}-title`).innerHTML = `👤 ${matchData.players[pKey]}`;

        let table = `<h3 class="results-subtitle">📤 Serving Performance</h3>
            <table class="results-table">
            <thead><tr><th>Period</th><th>1st In %</th><th>1st Won %</th><th>2nd Won %</th></tr></thead><tbody>`;

        periods.forEach(pk => {
            const ps = allStats[pk][pKey];

            const totalServes = ps.serv1stTotal + ps.serv2ndTotal;
            const s1In = totalServes > 0 ? (ps.serv1stTotal / totalServes) * 100 : 0;
            const s1Won = ps.serv1stTotal > 0 ? (ps.serv1stWon / ps.serv1stTotal) * 100 : 0;
            const s2Won = ps.serv2ndTotal > 0 ? (ps.serv2ndWon / ps.serv2ndTotal) * 100 : 0;

            const label = (pk === 'match') ? 'Match' : `Set ${Number(pk.replace('set', '')) + 1}`;

            table += `<tr>
                <td>${label}</td>
                <td>${s1In.toFixed(0)}%</td>
                <td>${s1Won.toFixed(0)}%</td>
                <td>${s2Won.toFixed(0)}%</td>
            </tr>`;
        });

        table += `</tbody></table>`;

        // Serving breakdown by side (per set)
        table += `<table class="results-table">
            <thead><tr><th>Serving Breakdown</th><th>Deuce Side (1st/2nd)</th><th>Ad Side (1st/2nd)</th></tr></thead><tbody>`;
        for (let i = 0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr>
                <td>Set ${i + 1}</td>
                <td>${s.servDeuceFirstWon}/${s.servDeuceFirstTotal}<br>${s.servDeuceSecondWon}/${s.servDeuceSecondTotal}</td>
                <td>${s.servAdFirstWon}/${s.servAdFirstTotal}<br>${s.servAdSecondWon}/${s.servAdSecondTotal}</td>
            </tr>`;
        }
        table += `</tbody></table>`;

        // Return breakdown (kept as-is structurally, but remove empty filler <td>s)
        table += `<h3 class="results-subtitle">🔥 Return Breakdown</h3>
            <table class="results-table">
            <thead><tr><th>Set</th><th>Deuce Side (1st/2nd)</th><th>Ad Side (1st/2nd)</th></tr></thead><tbody>`;
        for (let i = 0; i < numSets; i++) {
            const s = allStats[`set${i}`][pKey];
            table += `<tr>
                <td>Set ${i + 1}</td>
                <td>${s.retDeuceFirstWon}/${s.retDeuceFirstTotal}<br>${s.retDeuceSecondWon}/${s.retDeuceSecondTotal}</td>
                <td>${s.retAdFirstWon}/${s.retAdFirstTotal}<br>${s.retAdSecondWon}/${s.retAdSecondTotal}</td>
            </tr>`;
        }
        table += `</tbody></table>`;

        // Second-shot misses
        table += `<h3 class="results-subtitle">🎯 2nd Shot Misses</h3>
            <table class="results-table">
            <thead><tr><th>Set</th><th>Serve</th><th>Net</th><th>Deuce Ret</th><th>Ad Ret</th></tr></thead><tbody>`;
        for (let i = 0; i < numSets; i++) {
            const ss = allStats[`set${i}`][pKey].ssMisses;
            table += `<tr><td>Set ${i + 1}</td><td>${ss.S}</td><td>${ss.N}</td><td>${ss.D}</td><td>${ss.A}</td></tr>`;
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
            const imgData = canvas.toDataURL('image/jpeg', 0.92); // Use JPG compression
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



