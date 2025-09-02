// Tony's Doubles Tracker JavaScript (Rewritten)

document.addEventListener('DOMContentLoaded', initializeTracker);

let matchData = {};
let viewHistory = ['match-info']; // For back button functionality

const initialMatchData = {
    players: { player1: 'Player 1', player2: 'Player 2', player3: 'Player 3', player4: 'Player 4' },
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
    secondShotHistory: []
};

function initializePlayerStats() {
    const stats = {};
    for (let i = 1; i <= 4; i++) {
        const playerKey = `player${i}`;
        stats[playerKey] = {
            gamesServed: 0,
            firstServes: { in: 0, out: 0 },
            firstServePoints: { won: 0, lost: 0 },
            secondServePoints: { won: 0, lost: 0 },
            returns: {
                deuce: { first: { won: 0, lost: 0 }, second: { won: 0, lost: 0 } },
                ad: { first: { won: 0, lost: 0 }, second: { won: 0, lost: 0 } }
            },
            secondShotMisses: { serving: 0, atNet: 0, returning: 0 }
        };
    }
    return stats;
}

function initializeTracker() {
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
    startNewMatch();
}

function startNewMatch() {
    matchData = JSON.parse(JSON.stringify(initialMatchData));
    matchData.stats = initializePlayerStats();
    showSection('match-info');
    updateAllDisplays();
}

function showSection(sectionId) {
    if (sectionId === 'match-tracker' && viewHistory[viewHistory.length - 1] === 'match-info') {
        collectMatchInfo();
    }

    document.querySelectorAll('.tennis-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.tennis-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tennis-nav-btn[onclick="showSection('${sectionId}')"]`).classList.add('active');

    if (sectionId !== viewHistory[viewHistory.length - 1]) {
        viewHistory.push(sectionId);
    }
    
    if (sectionId === 'results') {
        renderResults();
    }
}

function collectMatchInfo() {
    matchData.players.player1 = document.getElementById('player1').value || 'Player 1';
    matchData.players.player2 = document.getElementById('player2').value || 'Player 2';
    matchData.players.player3 = document.getElementById('player3').value || 'Player 3';
    matchData.players.player4 = document.getElementById('player4').value || 'Player 4';
    matchData.location = document.getElementById('location').value || 'Local Court';
    matchData.surface = document.getElementById('surface').value;
    matchData.date = document.getElementById('matchDate').value;

    // Reset returner history based on new names
    matchData.returnerHistory.team1 = { deuce: 'player1', ad: 'player2' };
    matchData.returnerHistory.team2 = { deuce: 'player3', ad: 'player4' };
    
    updateAllDisplays();
}

function updateAllDisplays() {
    updateServerDropdown();
    updateScoreDisplay();
    updateReturnerDisplay();
    updateSecondShotDisplay();
}

// SCORE AND SET
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
    document.getElementById('team1NameScore').textContent = `${matchData.players.player1}/${matchData.players.player2}`;
    document.getElementById('team2NameScore').textContent = `${matchData.players.player3}/${matchData.players.player4}`;
    document.getElementById('team1Score').textContent = matchData.scores.team1[setIndex] || 0;
    document.getElementById('team2Score').textContent = matchData.scores.team2[setIndex] || 0;
    document.getElementById('currentSet').textContent = matchData.currentSet;
}

// SERVER AND RETURNER
function updateServer() {
    const previousServer = matchData.currentServer;
    matchData.currentServer = document.getElementById('currentServer').value;

    const wasTeam1Serving = matchData.teams.team1.includes(previousServer);
    const isTeam1Serving = matchData.teams.team1.includes(matchData.currentServer);

    if (wasTeam1Serving !== isTeam1Serving) {
        // Server switched teams, restore the returning team's preferred sides
        const returningTeam = isTeam1Serving ? 'team2' : 'team1';
        matchData.returners = { ...matchData.returnerHistory[returningTeam] };
    }
    updateReturnerDisplay();
    updateSecondShotDisplay();
}

function changeReturners() {
    [matchData.returners.deuce, matchData.returners.ad] = [matchData.returners.ad, matchData.returners.deuce];
    
    // Save this as the new preference for the returning team
    const isTeam1Serving = matchData.teams.team1.includes(matchData.currentServer);
    const returningTeamKey = isTeam1Serving ? 'team2' : 'team1';
    matchData.returnerHistory[returningTeamKey] = { ...matchData.returners };

    updateReturnerDisplay();
    updateSecondShotDisplay();
}

function updateServerDropdown() {
    const select = document.getElementById('currentServer');
    select.innerHTML = '';
    [1, 2, 3, 4].forEach(i => {
        const playerKey = `player${i}`;
        const option = document.createElement('option');
        option.value = playerKey;
        option.textContent = matchData.players[playerKey];
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
    const serverKey = matchData.currentServer;
    const returnerKey = matchData.returners[court];
    
    const serverStats = matchData.stats[serverKey];
    const returnerStats = matchData.stats[returnerKey].returns[court][serveType];

    if (serveType === 'first') {
        serverStats.firstServes.in++;
        if (won) {
            serverStats.firstServePoints.lost++;
            returnerStats.won++;
        } else {
            serverStats.firstServePoints.won++;
            returnerStats.lost++;
        }
    } else { // second serve
        serverStats.firstServes.out++;
        if (won) {
            serverStats.secondServePoints.lost++;
            returnerStats.won++;
        } else {
            serverStats.secondServePoints.won++;
            returnerStats.lost++;
        }
    }
}

function undoReturn(court, serveType) {
    // This is complex to undo correctly without a history stack.
    // For now, we will add a simple alert. A full implementation would require a command history.
    alert("Undo is not fully implemented in this version.");
}

function gameComplete() {
    matchData.stats[matchData.currentServer].gamesServed++;
    // Logic to auto-rotate server could be added here
    alert("Game marked as complete.");
}

// SECOND SHOT TRACKING
function getPlayerPosition(playerKey) {
    if (playerKey === matchData.currentServer) return 'serving';
    
    const serverTeam = matchData.teams.team1.includes(matchData.currentServer) ? 'team1' : 'team2';
    const playerTeam = matchData.teams.team1.includes(playerKey) ? 'team1' : 'team2';

    if (serverTeam === playerTeam) return 'atNet';
    return 'returning';
}

function recordSecondShotMiss(playerKey) {
    const position = getPlayerPosition(playerKey);
    matchData.stats[playerKey].secondShotMisses[position]++;
    matchData.secondShotHistory.push(playerKey); // For undo
    updateSecondShotDisplay();
}

function undoSecondShotMiss() {
    if (matchData.secondShotHistory.length > 0) {
        const lastPlayer = matchData.secondShotHistory.pop();
        const position = getPlayerPosition(lastPlayer);
        matchData.stats[lastPlayer].secondShotMisses[position]--;
        updateSecondShotDisplay();
    }
}

function updateSecondShotDisplay() {
    [1, 2, 3, 4].forEach(i => {
        const pKey = `player${i}`;
        const pos = getPlayerPosition(pKey);
        const abbrev = pos === 'serving' ? 'S' : (pos === 'atNet' ? 'N' : 'R');
        const btn = document.getElementById(`p${i}_ss`);
        btn.textContent = `${matchData.players[pKey]} (${abbrev})`;
    });
    const positions = [1, 2, 3, 4].map(i => {
        const pKey = `player${i}`;
        const pos = getPlayerPosition(pKey);
        const abbrev = pos === 'serving' ? 'S' : (pos === 'atNet' ? 'N' : 'R');
        return `${matchData.players[pKey]}(${abbrev})`;
    }).join(' | ');
    document.getElementById('currentPositions').textContent = positions;
}


// RESULTS
function renderResults() {
    const container = document.getElementById('results');
    container.innerHTML = `
        <h2 class="section-title">Match Results</h2>
        <p>Results view is under construction.</p>
        <p>This section will contain the detailed breakdown of the match statistics once implemented.</p>
        <button class="tennis-btn" onclick="startNewMatch()">🔄 New Match</button>
    `;
    // The full, multi-view results rendering would be a large function here.
}
