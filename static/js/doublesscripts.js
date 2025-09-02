// Tony's Doubles Tracker JavaScript (Rewritten v3)

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let currentView = 'match-info';
let currentResultsView = 0;
const totalResultsViews = 7;

// A clean slate for a new match, preserving structure
const initialMatchData = {
    players: { player1: 'P1', player2: 'P2', player3: 'P3', player4: 'P4' },
    teams: { team1: ['player1', 'player2'], team2: ['player3', 'player4'] },
    location: 'Local Court',
    surface: 'Hard',
    date: new Date().toISOString().split('T')[0],
    currentSet: 1,
    scores: { team1: [0], team2: [0] },
    currentServer: 'player1',
    returners: { deuce: 'player3', ad: 'player4' },
    returnerHistory: { team1: { deuce: 'player1', ad: 'player2' }, team2: { deuce: 'player3', ad: 'player4' } },
    stats: {},
    secondShotHistory: [],
    pointHistory: [] // Tracks every point for accurate undo
};

function initializePlayerStats() {
    const stats = {};
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        stats[pKey] = {
            returnData: {
                deuce: { first: "", second: "" },
                ad: { first: "", second: "" }
            },
            secondShotMisses: { S: 0, N: 0, D: 0, A: 0 }
        };
    });
    return stats;
}

function initializeTracker() {
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
    startNewMatch();
    initializeSwipeHandlers();
}

function startNewMatch() {
    matchData = JSON.parse(JSON.stringify(initialMatchData));
    matchData.stats = initializePlayerStats();
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
    
    matchData.returnerHistory.team1 = { deuce: 'player1', ad: 'player2' };
    matchData.returnerHistory.team2 = { deuce: 'player3', ad: 'player4' };
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

// SCORE & SET
function adjustGames(team, change) {
    const setIndex = matchData.currentSet - 1;
    matchData.scores[team][setIndex] = Math.max(0, (matchData.scores[team][setIndex] || 0) + change);
    updateScoreDisplay();
}

function adjustSet(change) {
    matchData.currentSet = Math.max(1, matchData.currentSet + change);
    const setIndex = matchData.currentSet - 1;
    if (matchData.scores.team1.length <= setIndex) {
        matchData.scores.team1.push(0);
        matchData.scores.team2.push(0);
    }
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const setIndex = matchData.currentSet - 1;
    document.getElementById('team1NameScore').textContent = `${getAbbrev('player1')}/${getAbbrev('player2')}`;
    document.getElementById('team2NameScore').textContent = `${getAbbrev('player3')}/${getAbbrev('player4')}`;
    document.getElementById('team1Score').textContent = matchData.scores.team1[setIndex] || 0;
    document.getElementById('team2Score').textContent = matchData.scores.team2[setIndex] || 0;
    document.getElementById('currentSet').textContent = matchData.currentSet;
}

// SERVER & RETURNER
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
    // Add a check to prevent errors if player name is not yet defined
    if (matchData.players[playerKey]) {
        return matchData.players[playerKey].substring(0, 3);
    }
    return ''; // Return an empty string as a fallback
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

// RETURN TRACKING
function recordReturn(court, serveType, won) {
    const returnerKey = matchData.returners[court];
    const pointOutcome = won ? '1' : '0';
    matchData.stats[returnerKey].returnData[court][serveType] += pointOutcome;
    matchData.pointHistory.push({ type: 'return', court, serveType, returnerKey });
    updateReturnStringsDisplay();
}

function undoReturn(court, serveType) {
    const lastPoint = matchData.pointHistory[matchData.pointHistory.length - 1];
    if (lastPoint && lastPoint.type === 'return') {
        const { returnerKey, court, serveType } = matchData.pointHistory.pop();
        const returnString = matchData.stats[returnerKey].returnData[court][serveType];
        if (returnString.length > 0) {
            matchData.stats[returnerKey].returnData[court][serveType] = returnString.slice(0, -1);
        }
    }
    updateReturnStringsDisplay();
}

function gameComplete() {
    ['deuce', 'ad'].forEach(court => {
        ['first', 'second'].forEach(serveType => {
            const returnerKey = matchData.returners[court];
            const returnString = matchData.stats[returnerKey].returnData[court][serveType];
            if (returnString.length > 0 && returnString.slice(-1) !== ',') {
                 matchData.stats[returnerKey].returnData[court][serveType] += ',';
            }
        });
    });
    updateReturnStringsDisplay();
}

function updateReturnStringsDisplay() {
    const deuceKey = matchData.returners.deuce;
    const adKey = matchData.returners.ad;
    document.getElementById('deuce_first_return_str').textContent = matchData.stats[deuceKey].returnData.deuce.first || "-";
    document.getElementById('deuce_second_return_str').textContent = matchData.stats[deuceKey].returnData.deuce.second || "-";
    document.getElementById('ad_first_return_str').textContent = matchData.stats[adKey].returnData.ad.first || "-";
    document.getElementById('ad_second_return_str').textContent = matchData.stats[adKey].returnData.ad.second || "-";
}

// SECOND SHOT TRACKING
function getPlayerPosition(playerKey) {
    if (playerKey === matchData.currentServer) return 'S';
    if (playerKey === matchData.returners.deuce) return 'D';
    if (playerKey === matchData.returners.ad) return 'A';
    return 'N';
}

function recordSecondShotMiss(playerKey) {
    const position = getPlayerPosition(playerKey);
    matchData.stats[playerKey].secondShotMisses[position]++;
    matchData.secondShotHistory.push({ playerKey, position });
    updateSecondShotDisplay();
}

function undoSecondShotMiss() {
    if (matchData.secondShotHistory.length > 0) {
        const lastMiss = matchData.secondShotHistory.pop();
        matchData.stats[lastMiss.playerKey].secondShotMisses[lastMiss.position]--;
        updateSecondShotDisplay();
    }
}

function updateSecondShotDisplay() {
    let tallyHTML = '';
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const pos = getPlayerPosition(pKey);
        const btn = document.getElementById(`p${pKey.slice(-1)}_ss`);
        btn.textContent = `${getAbbrev(pKey)}-${pos}`;

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


// --- RESULTS ---

function renderResults() {
    const container = document.getElementById('results');
    container.innerHTML = `
        <div class="results-navigation">
            ${Array.from({length: totalResultsViews}, (_, i) => `<div class="nav-dot ${i === 0 ? 'active' : ''}" onclick="showResultsView(${i})"></div>`).join('')}
        </div>
        <div class="swipe-hint">← Swipe to navigate →</div>
        <div id="results-views-container">
            ${generateAllResultsViewsHTML()}
        </div>
    `;
    populateAllResultsViews();
    showResultsView(currentResultsView);
}

function showResultsView(index) {
    currentResultsView = index;
    document.querySelectorAll('.results-view').forEach(v => v.style.display = 'none');
    document.getElementById(`results-view-${index}`).style.display = 'block';
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
    const p = matchData.players;
    const team1Name = `${getAbbrev('player1')} & ${getAbbrev('player2')}`;
    const team2Name = `${getAbbrev('player3')} & ${getAbbrev('player4')}`;
    
    let html = '';
    html += `<div class="results-view" id="results-view-0">
        <div class="view-title">📊 Match Summary</div>
        <div class="match-summary">
            <h3 class="results-subtitle">🏆 Final Score</h3>
            <div id="finalScoreDisplay" class="final-score"></div>
            <div id="matchDetailsDisplay" class="match-details"></div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total Points</div><div class="stat-value" id="totalPoints"></div></div>
            <div class="stat-card"><div class="stat-label">🔵 ${getAbbrev('player1')}/${getAbbrev('player2')} Won</div><div class="stat-value" id="team1PointsWon"></div></div>
            <div class="stat-card"><div class="stat-label">🔴 ${getAbbrev('player3')}/${getAbbrev('player4')} Won</div><div class="stat-value" id="team2PointsWon"></div></div>
            <div class="stat-card"><div class="stat-label">2nd Shot Misses</div><div class="stat-value" id="totalSSMisses"></div></div>
        </div>
    </div>`;

    [1, 2].forEach(teamNum => {
        const teamKey = `team${teamNum}`;
        const teamName = teamNum === 1 ? team1Name : team2Name;
        html += `<div class="results-view" id="results-view-${teamNum}">
            <div class="view-title">${teamNum === 1 ? '🔵' : '🔴'} ${teamName}</div>
            <div class="team-card team-${teamNum}">
                 <h3 class="results-subtitle">📥 Returning Performance</h3>
                 <div class="stats-grid">
                    <div class="stat-card"><div class="stat-label">vs 1st Serve</div><div class="stat-value" id="${teamKey}Ret1st"></div></div>
                    <div class="stat-card"><div class="stat-label">vs 2nd Serve</div><div class="stat-value" id="${teamKey}Ret2nd"></div></div>
                    <div class="stat-card"><div class="stat-label">Total Won</div><div class="stat-value" id="${teamKey}RetTotal"></div></div>
                 </div>
                 <h3 class="results-subtitle">🎯 2nd Shot Misses</h3>
                 <div class="stats-grid">
                    <div class="stat-card"><div class="stat-label">As Serving Team</div><div class="stat-value" id="${teamKey}SSServing"></div></div>
                    <div class="stat-card"><div class="stat-label">As Returning Team</div><div class="stat-value" id="${teamKey}SSReturning"></div></div>
                 </div>
            </div>
        </div>`;
    });

    ['player1', 'player2', 'player3', 'player4'].forEach((pKey, i) => {
        const viewNum = i + 3;
        const teamNum = i < 2 ? 1 : 2;
        const pName = matchData.players[pKey];
        html += `<div class="results-view" id="results-view-${viewNum}">
            <div class="view-title">👤 ${pName}</div>
            <div class="player-card team-${teamNum}">
                <h3 class="results-subtitle">📥 Returning Performance</h3>
                <div class="side-stats">
                    <div class="side-card deuce-side"><h5 class="side-title">🟢 Deuce</h5><div id="${pKey}DeuceRet"></div></div>
                    <div class="side-card ad-side"><h5 class="side-title">🟣 Ad</h5><div id="${pKey}AdRet"></div></div>
                </div>
                <h3 class="results-subtitle">🎯 2nd Shot Misses by Position</h3>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-label">Server (S)</div><div class="stat-value" id="${pKey}ssS"></div></div>
                    <div class="stat-card"><div class="stat-label">Net (N)</div><div class="stat-value" id="${pKey}ssN"></div></div>
                    <div class="stat-card"><div class="stat-label">Deuce Ret (D)</div><div class="stat-value" id="${pKey}ssD"></div></div>
                    <div class="stat-card"><div class="stat-label">Ad Ret (A)</div><div class="stat-value" id="${pKey}ssA"></div></div>
                </div>
            </div>
             ${i === 3 ? `<div class="text-center" style="margin-top: 1rem;"><button class="tennis-btn" onclick="generatePdf()">Save as PDF</button></div>` : ''}
        </div>`;
    });
    
    return html;
}

function calculateAllStats() {
    const totals = { team1: {}, team2: {}, player1: {}, player2: {}, player3: {}, player4: {} };

    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const pData = matchData.stats[pKey];
        const pTotals = totals[pKey] = {};
        pTotals.ssMisses = pData.secondShotMisses;
        ['deuce', 'ad'].forEach(court => {
            ['first', 'second'].forEach(serve => {
                const str = pData.returnData[court][serve].replace(/,/g, '');
                const won = (str.match(/1/g) || []).length;
                const total = str.length;
                const key = `ret${court[0].toUpperCase() + court.slice(1)}${serve[0].toUpperCase() + serve.slice(1)}`;
                pTotals[`${key}Won`] = won;
                pTotals[`${key}Total`] = total;
            });
        });
    });

    ['team1', 'team2'].forEach(teamKey => {
        const teamTotals = totals[teamKey];
        teamTotals.ret1stWon = teamTotals.ret2ndWon = teamTotals.ret1stTotal = teamTotals.ret2ndTotal = 0;
        teamTotals.ssServing = teamTotals.ssReturning = 0;
        matchData.teams[teamKey].forEach(pKey => {
            const pTotals = totals[pKey];
            teamTotals.ret1stWon += pTotals.retDeuceFirstWon + pTotals.retAdFirstWon;
            teamTotals.ret1stTotal += pTotals.retDeuceFirstTotal + pTotals.retAdFirstTotal;
            teamTotals.ret2ndWon += pTotals.retDeuceSecondWon + pTotals.retAdSecondWon;
            teamTotals.ret2ndTotal += pTotals.retDeuceSecondTotal + pTotals.retAdSecondTotal;
            teamTotals.ssServing += pTotals.ssMisses.S + pTotals.ssMisses.N;
            teamTotals.ssReturning += pTotals.ssMisses.D + pTotals.ssMisses.A;
        });
        teamTotals.retTotalWon = teamTotals.ret1stWon + teamTotals.ret2ndWon;
        teamTotals.retTotal = teamTotals.ret1stTotal + teamTotals.ret2ndTotal;

        teamTotals.ret1stWonPct = teamTotals.ret1stTotal ? Math.round(teamTotals.ret1stWon * 100 / teamTotals.ret1stTotal) : 0;
        teamTotals.ret2ndWonPct = teamTotals.ret2ndTotal ? Math.round(teamTotals.ret2ndWon * 100 / teamTotals.ret2ndTotal) : 0;
        teamTotals.retTotalWonPct = teamTotals.retTotal ? Math.round(teamTotals.retTotalWon * 100 / teamTotals.retTotal) : 0;
    });
    
    totals.totalPoints = totals.team1.retTotal + totals.team2.retTotal;
    
    totals.team1.pointsWon = totals.team1.retTotalWon;
    totals.team2.pointsWon = totals.team2.retTotalWon;
    
    totals.team1.pointsWonPct = totals.totalPoints ? Math.round(totals.team1.pointsWon * 100 / totals.totalPoints) : 0;
    totals.team2.pointsWonPct = totals.totalPoints ? Math.round(totals.team2.pointsWon * 100 / totals.totalPoints) : 0;

    totals.totalSSMisses = totals.team1.ssServing + totals.team1.ssReturning + totals.team2.ssServing + totals.team2.ssReturning;
    totals.scores = matchData.scores;

    return totals;
}

function populateAllResultsViews() {
    const calc = calculateAllStats();
    
    // Populate Match Summary (View 0)
    document.getElementById('finalScoreDisplay').innerHTML = `🔵 ${calc.scores.team1.join('-')} &nbsp; | &nbsp; 🔴 ${calc.scores.team2.join('-')}`;
    document.getElementById('matchDetailsDisplay').textContent = `${matchData.location} • ${matchData.surface} • ${matchData.date}`;
    document.getElementById('totalPoints').textContent = calc.totalPoints;
    document.getElementById('team1PointsWon').textContent = `${calc.team1.pointsWon} (${calc.team1.pointsWonPct}%)`;
    document.getElementById('team2PointsWon').textContent = `${calc.team2.pointsWon} (${calc.team2.pointsWonPct}%)`;
    document.getElementById('totalSSMisses').textContent = calc.totalSSMisses;
    
    // Populate Team Views (View 1 and 2)
    ['team1', 'team2'].forEach(teamKey => {
        const teamStats = calc[teamKey];
        document.getElementById(`${teamKey}Ret1st`).innerHTML = `${teamStats.ret1stWonPct}%<small>${teamStats.ret1stWon}/${teamStats.ret1stTotal}</small>`;
        document.getElementById(`${teamKey}Ret2nd`).innerHTML = `${teamStats.ret2ndWonPct}%<small>${teamStats.ret2ndWon}/${teamStats.ret2ndTotal}</small>`;
        document.getElementById(`${teamKey}RetTotal`).innerHTML = `${teamStats.retTotalWonPct}%<small>${teamStats.retTotalWon}/${teamStats.retTotal}</small>`;
        document.getElementById(`${teamKey}SSServing`).textContent = teamStats.ssServing;
        document.getElementById(`${teamKey}SSReturning`).textContent = teamStats.ssReturning;
    });

    // Populate Player Views (View 3 through 6)
    ['player1', 'player2', 'player3', 'player4'].forEach(pKey => {
        const pStats = calc[pKey];
        document.getElementById(`${pKey}DeuceRet`).innerHTML = `1st: ${pStats.retDeuceFirstWon}/${pStats.retDeuceFirstTotal}<br>2nd: ${pStats.retDeuceSecondWon}/${pStats.retDeuceSecondTotal}`;
        document.getElementById(`${pKey}AdRet`).innerHTML = `1st: ${pStats.retAdFirstWon}/${pStats.retAdFirstTotal}<br>2nd: ${pStats.retAdSecondWon}/${pStats.retAdSecondTotal}`;
        document.getElementById(`${pKey}ssS`).textContent = pStats.ssMisses.S;
        document.getElementById(`${pKey}ssN`).textContent = pStats.ssMisses.N;
        document.getElementById(`${pKey}ssD`).textContent = pStats.ssMisses.D;
        document.getElementById(`${pKey}ssA`).textContent = pStats.ssMisses.A;
    });
}


function generatePdf() {
    alert("This feature is coming soon!");
}
