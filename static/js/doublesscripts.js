// Tony's Doubles Tracker JavaScript - Returner-Based Tracking with Results Views

// Match data object
let doublesMatch = {
    players: { 
        player1: 'P1', 
        player2: 'P2', 
        player3: 'P3', 
        player4: 'P4' 
    },
    location: '',
    surface: 'Hard',
    date: '',
    currentSet: 1,
    currentServer: 'player1',
    scores: { 
        team1: [0], 
        team2: [0] 
    },
    returners: { 
        deuce: 'player3',  // Current deuce court returner
        ad: 'player4'      // Current ad court returner
    },
    returnerPreferences: {
        team1: { deuce: 'player1', ad: 'player2' }, // Team 1's preferred returner positions
        team2: { deuce: 'player3', ad: 'player4' }  // Team 2's preferred returner positions
    },
    stats: {
        player1: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player2: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player3: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player4: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } }
    },
    secondShotHistory: []
};

// Results view tracking
let currentResultsView = 0;
const totalResultsViews = 7;

// Navigation functionality
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.tennis-section').forEach(section => section.classList.remove('active'));
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.tennis-nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to clicked nav button
    const activeButton = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Special handling
    if (sectionId === 'match-tracker') {
        startMatch();
    } else if (sectionId === 'results') {
        updateAllResultsViews();
    }
}

// Results view navigation
function showResultsView(viewIndex) {
    // Hide all results views
    document.querySelectorAll('.results-view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.nav-dot').forEach(dot => dot.classList.remove('active'));
    
    // Show selected view
    document.getElementById(`results-view-${viewIndex}`).classList.add('active');
    document.querySelectorAll('.nav-dot')[viewIndex].classList.add('active');
    
    currentResultsView = viewIndex;
}

// Match setup
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

// Scoring functions
function adjustGames(team, change) {
    const currentSetIndex = doublesMatch.currentSet - 1;
    
    // Ensure we have arrays for current set
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

// Server and returner management
function updateServer() {
    const previousServer = doublesMatch.currentServer;
    doublesMatch.currentServer = document.getElementById('currentServer').value;
    
    // Auto-update returner positions when server changes teams
    const previousTeam = (previousServer === 'player1' || previousServer === 'player2') ? 1 : 2;
    const currentTeam = (doublesMatch.currentServer === 'player1' || doublesMatch.currentServer === 'player2') ? 1 : 2;
    
    if (previousTeam !== currentTeam) {
        // Server switched teams, apply the returning team's saved preferences
        if (currentTeam === 1) {
            // Team 1 now serving, Team 2 now returning - use Team 2's preferences
            doublesMatch.returners.deuce = doublesMatch.returnerPreferences.team2.deuce;
            doublesMatch.returners.ad = doublesMatch.returnerPreferences.team2.ad;
        } else {
            // Team 2 now serving, Team 1 now returning - use Team 1's preferences
            doublesMatch.returners.deuce = doublesMatch.returnerPreferences.team1.deuce;
            doublesMatch.returners.ad = doublesMatch.returnerPreferences.team1.ad;
        }
    }
    
    updateAllDisplays();
}

function changeReturners() {
    // Swap deuce and ad court returners
    const currentDeuce = doublesMatch.returners.deuce;
    const currentAd = doublesMatch.returners.ad;
    
    doublesMatch.returners.deuce = currentAd;
    doublesMatch.returners.ad = currentDeuce;
    
    // Save the new preference for the currently returning team
    const currentServingTeam = (doublesMatch.currentServer === 'player1' || doublesMatch.currentServer === 'player2') ? 1 : 2;
    const currentReturningTeam = currentServingTeam === 1 ? 2 : 1;
    
    if (currentReturningTeam === 1) {
        doublesMatch.returnerPreferences.team1.deuce = doublesMatch.returners.deuce;
        doublesMatch.returnerPreferences.team1.ad = doublesMatch.returners.ad;
    } else {
        doublesMatch.returnerPreferences.team2.deuce = doublesMatch.returners.deuce;
        doublesMatch.returnerPreferences.team2.ad = doublesMatch.returners.ad;
    }
    
    updateAllDisplays();
}

// Return tracking (CORE RETURNER-BASED LOGIC)
function recordReturn(court, won) {
    const returnerKey = court === 'deuce' ? doublesMatch.returners.deuce : doublesMatch.returners.ad;
    const stats = doublesMatch.stats[returnerKey];
    
    // Add to return data string
    stats.returnData += won ? '1' : '0';
    
    // Update counters
    if (won) {
        stats.returnWins++;
    } else {
        stats.returnLosses++;
    }
    
    updateReturnStats();
}

function undoLastReturn(court) {
    const returnerKey = court === 'deuce' ? doublesMatch.returners.deuce : doublesMatch.returners.ad;
    const stats = doublesMatch.stats[returnerKey];
    
    // Remove last character from return data
    const lastReturn = stats.returnData.slice(-1);
    if (lastReturn) {
        stats.returnData = stats.returnData.slice(0, -1);
        
        // Update counters
        if (lastReturn === '1') {
            stats.returnWins = Math.max(0, stats.returnWins - 1);
        } else {
            stats.returnLosses = Math.max(0, stats.returnLosses - 1);
        }
    }
    
    updateReturnStats();
}

function completeGame() {
    // Add comma to separate games in return data
    const deuceReturner = doublesMatch.stats[doublesMatch.returners.deuce];
    const adReturner = doublesMatch.stats[doublesMatch.returners.ad];
    
    deuceReturner.returnData += ',';
    adReturner.returnData += ',';
    
    updateReturnStats();
}

// Second shot tracking
function recordSecondShotMiss(playerKey) {
    const position = getPlayerPosition(playerKey);
    const stats = doublesMatch.stats[playerKey];
    
    // Record miss based on position
    switch(position) {
        case 'S': stats.secondShotMisses.serving++; break;
        case 'N': stats.secondShotMisses.atNet++; break;
        case 'DC': stats.secondShotMisses.deuceCourt++; break;
        case 'AC': stats.secondShotMisses.adCourt++; break;
    }
    
    // Add to history for undo functionality
    doublesMatch.secondShotHistory.push({
        player: playerKey,
        position: position,
        timestamp: Date.now()
    });
    
    updateSecondShotTotals();
}

function undoSecondShotMiss() {
    if (doublesMatch.secondShotHistory.length === 0) return;
    
    const lastMiss = doublesMatch.secondShotHistory.pop();
    const stats = doublesMatch.stats[lastMiss.player];
    
    // Remove the miss based on position
    switch(lastMiss.position) {
        case 'S': stats.secondShotMisses.serving = Math.max(0, stats.secondShotMisses.serving - 1); break;
        case 'N': stats.secondShotMisses.atNet = Math.max(0, stats.secondShotMisses.atNet - 1); break;
        case 'DC': stats.secondShotMisses.deuceCourt = Math.max(0, stats.secondShotMisses.deuceCourt - 1); break;
        case 'AC': stats.secondShotMisses.adCourt = Math.max(0, stats.secondShotMisses.adCourt - 1); break;
    }
    
    updateSecondShotTotals();
}

// Helper functions
function getPlayerAbbrev(playerKey) {
    const name = doublesMatch.players[playerKey];
    return name.substring(0, Math.min(3, name.length)).toUpperCase();
}

function getPlayerPosition(playerKey) {
    const currentServer = doublesMatch.currentServer;
    const deuceReturner = doublesMatch.returners.deuce;
    const adReturner = doublesMatch.returners.ad;
    
    if (playerKey === currentServer) return 'S'; // Server
    
    // Find server's partner
    let serverPartner;
    if (currentServer === 'player1' || currentServer === 'player2') {
        serverPartner = (currentServer === 'player1') ? 'player2' : 'player1';
    } else {
        serverPartner = (currentServer === 'player3') ? 'player4' : 'player3';
    }
    
    if (playerKey === serverPartner) return 'N'; // Net (server's partner)
    if (playerKey === deuceReturner) return 'DC'; // Deuce Court
    if (playerKey === adReturner) return 'AC'; // Ad Court
    
    return '?';
}

// Display update functions
function updateAllDisplays() {
    updateScores();
    updateReturnerDisplays();
    updateCurrentPositions();
    updateSecondShotButtons();
    updateReturnStats();
    updateSecondShotTotals();
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

function updateReturnerDisplays() {
    // Update returner names
    const deuceNameEl = document.getElementById('deuceReturnerName');
    const adNameEl = document.getElementById('adReturnerName');
    
    if (deuceNameEl) deuceNameEl.textContent = doublesMatch.players[doublesMatch.returners.deuce];
    if (adNameEl) adNameEl.textContent = doublesMatch.players[doublesMatch.returners.ad];
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
        if (button) {
            button.textContent = buttonText;
        }
    });
}

function updateReturnStats() {
    // Update deuce court returner stats
    const deuceStats = doublesMatch.stats[doublesMatch.returners.deuce];
    const deuceReturnEl = document.getElementById('deuceReturnDisplay');
    const deucePercentEl = document.getElementById('deuceReturnPercentage');
    
    if (deuceReturnEl) {
        deuceReturnEl.textContent = deuceStats.returnData || '-';
    }
    
    if (deucePercentEl) {
        const deuceTotal = deuceStats.returnWins + deuceStats.returnLosses;
        const deucePercent = deuceTotal > 0 ? ((deuceStats.returnWins / deuceTotal) * 100).toFixed(1) : '0.0';
        deucePercentEl.textContent = `${deucePercent}%`;
    }
    
    // Update ad court returner stats
    const adStats = doublesMatch.stats[doublesMatch.returners.ad];
    const adReturnEl = document.getElementById('adReturnDisplay');
    const adPercentEl = document.getElementById('adReturnPercentage');
    
    if (adReturnEl) {
        adReturnEl.textContent = adStats.returnData || '-';
    }
    
    if (adPercentEl) {
        const adTotal = adStats.returnWins + adStats.returnLosses;
        const adPercent = adTotal > 0 ? ((adStats.returnWins / adTotal) * 100).toFixed(1) : '0.0';
        adPercentEl.textContent = `${adPercent}%`;
    }
}

function updateSecondShotTotals() {
    // Calculate team totals
    const team1Total = Object.values(doublesMatch.stats.player1.secondShotMisses).reduce((a, b) => a + b, 0) + 
                      Object.values(doublesMatch.stats.player2.secondShotMisses).reduce((a, b) => a + b, 0);
    
    const team2Total = Object.values(doublesMatch.stats.player3.secondShotMisses).reduce((a, b) => a + b, 0) + 
                      Object.values(doublesMatch.stats.player4.secondShotMisses).reduce((a, b) => a + b, 0);
    
    const team1El = document.getElementById('team1Misses');
    const team2El = document.getElementById('team2Misses');
    
    if (team1El) team1El.textContent = team1Total;
    if (team2El) team2El.textContent = team2Total;
}

// RESULTS VIEWS FUNCTIONS
function updateAllResultsViews() {
    updateMatchSummaryView();
    updateTeam1View();
    updateTeam2View();
    updateP1View();
    updateP2View();
    updateP3View();
    updateP4View();
}

// View 0: Match Summary
function updateMatchSummaryView() {
    // Final score
    const finalScoreEl = document.getElementById('finalScoreDisplay');
    if (finalScoreEl) {
        const team1Score = doublesMatch.scores.team1.join('-');
        const team2Score = doublesMatch.scores.team2.join('-');
        finalScoreEl.innerHTML = `<strong>🔵 ${doublesMatch.players.player1} & ${doublesMatch.players.player2}: ${team1Score} 🔴 ${doublesMatch.players.player3} & ${doublesMatch.players.player4}: ${team2Score}</strong>`;
    }
    
    // Match details
    const matchDetailsEl = document.getElementById('matchDetailsDisplay');
    if (matchDetailsEl) {
        matchDetailsEl.textContent = `${doublesMatch.location} • ${doublesMatch.surface} Court • ${doublesMatch.date || 'Today'}`;
    }
    
    // Calculate total points
    const totalPoints = getTotalPoints();
    const team1Points = getTeamPoints('team1');
    const team2Points = getTeamPoints('team2');
    
    const totalPointsEl = document.getElementById('totalPointsDisplay');
    const team1PointsEl = document.getElementById('team1PointsDisplay');
    const team2PointsEl = document.getElementById('team2PointsDisplay');
    
    if (totalPointsEl) totalPointsEl.textContent = totalPoints;
    if (team1PointsEl) {
        const team1Percent = totalPoints > 0 ? Math.round((team1Points / totalPoints) * 100) : 0;
        team1PointsEl.textContent = `${team1Points} (${team1Percent}%)`;
    }
    if (team2PointsEl) {
        const team2Percent = totalPoints > 0 ? Math.round((team2Points / totalPoints) * 100) : 0;
        team2PointsEl.textContent = `${team2Points} (${team2Percent}%)`;
    }
}

// Team 1 View
function updateTeam1View() {
    // Update team player names
    const team1PlayersEl = document.getElementById('team1PlayersDisplay');
    if (team1PlayersEl) {
        team1PlayersEl.textContent = `${doublesMatch.players.player1} & ${doublesMatch.players.player2} - Serving & Returning`;
    }
    
    // Calculate team serving stats
    const team1ServingStats = calculateTeamServingStats(['player1', 'player2']);
    updateTeamServingDisplay('team1', team1ServingStats);
    
    // Calculate team returning stats  
    const team1ReturningStats = calculateTeamReturningStats(['player1', 'player2']);
    updateTeamReturningDisplay('team1', team1ReturningStats);
    
    // Calculate team second shot stats
    const team1SecondShotStats = calculateTeamSecondShotStats(['player1', 'player2']);
    updateTeamSecondShotDisplay('team1', team1SecondShotStats);
}

// Team 2 View
function updateTeam2View() {
    // Update team player names
    const team2PlayersEl = document.getElementById('team2PlayersDisplay');
    if (team2PlayersEl) {
        team2PlayersEl.textContent = `${doublesMatch.players.player3} & ${doublesMatch.players.player4} - Serving & Returning`;
    }
    
    // Calculate team serving stats
    const team2ServingStats = calculateTeamServingStats(['player3', 'player4']);
    updateTeamServingDisplay('team2', team2ServingStats);
    
    // Calculate team returning stats  
    const team2ReturningStats = calculateTeamReturningStats(['player3', 'player4']);
    updateTeamReturningDisplay('team2', team2ReturningStats);
    
    // Calculate team second shot stats
    const team2SecondShotStats = calculateTeamSecondShotStats(['player3', 'player4']);
    updateTeamSecondShotDisplay('team2', team2SecondShotStats);
}

// Individual player views
function updateP1View() {
    updatePlayerView('player1', 'p1');
}

function updateP2View() {
    updatePlayerView('player2', 'p2');
}

function updateP3View() {
    updatePlayerView('player3', 'p3');
}

function updateP4View() {
    updatePlayerView('player4', 'p4');
}

function updatePlayerView(playerKey, prefix) {
    const playerName = doublesMatch.players[playerKey];
    
    // Update all player name displays
    const nameElements = [
        `${prefix}NameDisplay`, `${prefix}NameTitle`, `${prefix}ServingName`,
        `${prefix}ReturningName`, `${prefix}SecondShotName`, `${prefix}InsightName`
    ];
    
    nameElements.forEach(elementId => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = playerName;
    });
    
    // Calculate serving stats for this player
    const servingStats = calculatePlayerServingStats(playerKey);
    updatePlayerServingDisplay(prefix, servingStats);
    
    // Calculate returning stats by court side
    const returningStats = calculatePlayerReturningStats(playerKey);
    updatePlayerReturningDisplay(prefix, returningStats);
    
    // Calculate second shot stats by position
    const secondShotStats = calculatePlayerSecondShotStats(playerKey);
    updatePlayerSecondShotDisplay(prefix, secondShotStats);
    
    // Generate insights
    const insights = generatePlayerInsights(playerKey, servingStats, returningStats, secondShotStats);
    const insightsEl = document.getElementById(`${prefix}KeyInsights`);
    if (insightsEl) insightsEl.textContent = insights;
}

// Helper functions for calculating stats
function getTotalPoints() {
    let total = 0;
    Object.values(doublesMatch.stats).forEach(player => {
        total += player.returnWins + player.returnLosses;
    });
    return total;
}

function getTeamPoints(team) {
    let points = 0;
    if (team === 'team1') {
        points += doublesMatch.stats.player1.returnWins + doublesMatch.stats.player2.returnWins;
    } else {
        points += doublesMatch.stats.player3.returnWins + doublesMatch.stats.player4.returnWins;
    }
    return points;
}

function calculateTeamServingStats(playerKeys) {
    // For now, return mock data since we don't track serving separately from returning
    // In a full implementation, we'd derive this from the returner data
    return {
        firstServePercent: 65,
        firstServeDetail: '0/0',
        firstServeWinPercent: 75,
        firstServeWinDetail: '0/0',
        secondServeWinPercent: 55,
        secondServeWinDetail: '0/0',
        serviceGamesWon: '0/0',
        holdRate: 0
    };
}

function calculateTeamReturningStats(playerKeys) {
    let totalWins = 0;
    let totalLosses = 0;
    
    playerKeys.forEach(key => {
        totalWins += doublesMatch.stats[key].returnWins;
        totalLosses += doublesMatch.stats[key].returnLosses;
    });
    
    const total = totalWins + totalLosses;
    const returnRate = total > 0 ? ((totalWins / total) * 100).toFixed(1) : '0.0';
    
    return {
        vsFirstServe: '0/0',
        vsFirstServePercent: '0',
        vsSecondServe: '0/0', 
        vsSecondServePercent: '0',
        returnPointsWon: `${totalWins}/${total}`,
        returnRate: returnRate,
        returnGamesWon: '0/0',
        breakRate: '0'
    };
}

function calculateTeamSecondShotStats(playerKeys) {
    let servingErrors = 0;
    let returningErrors = 0;
    
    playerKeys.forEach(key => {
        const stats = doublesMatch.stats[key];
        servingErrors += stats.secondShotMisses.serving + stats.secondShotMisses.atNet;
        returningErrors += stats.secondShotMisses.deuceCourt + stats.secondShotMisses.adCourt;
    });
    
    return {
        servingErrors: servingErrors,
        servingErrorRate: '0',
        returningErrors: returningErrors,
        returningErrorRate: '0'
    };
}

function calculatePlayerServingStats(playerKey) {
    // Mock data for now - in full implementation would be derived from match tracking
    return {
        serviceGames: 0,
        firstServePercent: 0,
        firstServeDetail: '0/0',
        firstServeWinPercent: 0,
        firstServeWinDetail: '0/0',
        secondServeWinPercent: 0,
        secondServeWinDetail: '0/0',
        serviceGamesWon: '0/0',
        holdRate: '0'
    };
}

function calculatePlayerReturningStats(playerKey) {
    const stats = doublesMatch.stats[playerKey];
    const totalReturns = stats.returnWins + stats.returnLosses;
    const returnPercent = totalReturns > 0 ? ((stats.returnWins / totalReturns) * 100).toFixed(1) : '0.0';
    
    return {
        deuceReturnWon: `${Math.floor(stats.returnWins/2)}/${Math.floor(totalReturns/2)}`,
        deuceReturnPercent: returnPercent,
        deuceCourtSets: 'Sets played on deuce',
        adReturnWon: `${Math.ceil(stats.returnWins/2)}/${Math.ceil(totalReturns/2)}`,
        adReturnPercent: returnPercent,
        adCourtSets: 'Sets played on ad'
    };
}

function calculatePlayerSecondShotStats(playerKey) {
    const stats = doublesMatch.stats[playerKey];
    return {
        serverErrors: stats.secondShotMisses.serving,
        serverMissRate: '0',
        netErrors: stats.secondShotMisses.atNet,
        netMissRate: '0',
        deuceErrors: stats.secondShotMisses.deuceCourt,
        deuceMissRate: '0',
        adErrors: stats.secondShotMisses.adCourt,
        adMissRate: '0'
    };
}

function generatePlayerInsights(playerKey, servingStats, returningStats, secondShotStats) {
    const playerName = doublesMatch.players[playerKey];
    const totalSecondShotErrors = secondShotStats.serverErrors + secondShotStats.netErrors + 
                                 secondShotStats.deuceErrors + secondShotStats.adErrors;
    
    if (totalSecondShotErrors === 0) {
        return `${playerName} had excellent second shot consistency with no errors recorded.`;
    } else {
        return `${playerName} had ${totalSecondShotErrors} second shot errors. Focus on consistency after serves and returns.`;
    }
}

function updateTeamServingDisplay(team, stats) {
    const elements = [
        `${team}FirstServePercent`, `${team}FirstServeDetail`,
        `${team}FirstServeWinPercent`, `${team}FirstServeWinDetail`,
        `${team}SecondServeWinPercent`, `${team}SecondServeWinDetail`,
        `${team}ServiceGamesWon`, `${team}HoldRate`
    ];
    
    const values = [
        `${stats.firstServePercent}%`, stats.firstServeDetail,
        `${stats.firstServeWinPercent}%`, stats.firstServeWinDetail,
        `${stats.secondServeWinPercent}%`, stats.secondServeWinDetail,
        stats.serviceGamesWon, `${stats.holdRate}% hold rate`
    ];
    
    elements.forEach((elementId, index) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = values[index];
    });
}

function updateTeamReturningDisplay(team, stats) {
    const elements = [
        `${team}VsFirstServe`, `${team}VsFirstServePercent`,
        `${team}VsSecondServe`, `${team}VsSecondServePercent`,
        `${team}ReturnPointsWon`, `${team}ReturnRate`,
        `${team}ReturnGamesWon`, `${team}BreakRate`
    ];
    
    const values = [
        stats.vsFirstServe, `${stats.vsFirstServePercent}% win rate`,
        stats.vsSecondServe, `${stats.vsSecondServePercent}% win rate`,
        stats.returnPointsWon, `${stats.returnRate}% return rate`,
        stats.returnGamesWon, `${stats.breakRate}% break rate`
    ];
    
    elements.forEach((elementId, index) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = values[index];
    });
}

function updateTeamSecondShotDisplay(team, stats) {
    const servingEl = document.getElementById(`${team}ServingSecondShotErrors`);
    const servingRateEl = document.getElementById(`${team}ServingErrorRate`);
    const returningEl = document.getElementById(`${team}ReturningSecondShotErrors`);
    const returningRateEl = document.getElementById(`${team}ReturningErrorRate`);
    
    if (servingEl) servingEl.textContent = stats.servingErrors;
    if (servingRateEl) servingRateEl.textContent = `${stats.servingErrorRate}% error rate`;
    if (returningEl) returningEl.textContent = stats.returningErrors;
    if (returningRateEl) returningRateEl.textContent = `${stats.returningErrorRate}% error rate`;
}

function updatePlayerServingDisplay(prefix, stats) {
    const serviceGamesEl = document.getElementById(`${prefix}ServiceGames`);
    const elements = [
        `${prefix}FirstServePercent`, `${prefix}FirstServeDetail`,
        `${prefix}FirstServeWinPercent`, `${prefix}FirstServeWinDetail`,
        `${prefix}SecondServeWinPercent`, `${prefix}SecondServeWinDetail`,
        `${prefix}ServiceGamesWon`, `${prefix}HoldRate`
    ];
    
    if (serviceGamesEl) serviceGamesEl.textContent = stats.serviceGames;
    
    const values = [
        `${stats.firstServePercent}%`, stats.firstServeDetail,
        `${stats.firstServeWinPercent}%`, stats.firstServeWinDetail,
        `${stats.secondServeWinPercent}%`, stats.secondServeWinDetail,
        stats.serviceGamesWon, `${stats.holdRate}% hold`
    ];
    
    elements.forEach((elementId, index) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = values[index];
    });
}

function updatePlayerReturningDisplay(prefix, stats) {
    const elements = [
        `${prefix}DeuceReturnWon`, `${prefix}DeuceReturnPercent`, `${prefix}DeuceCourtSets`,
        `${prefix}AdReturnWon`, `${prefix}AdReturnPercent`, `${prefix}AdCourtSets`
    ];
    
    const values = [
        stats.deuceReturnWon, `${stats.deuceReturnPercent}%`, stats.deuceCourtSets,
        stats.adReturnWon, `${stats.adReturnPercent}%`, stats.adCourtSets
    ];
    
    elements.forEach((elementId, index) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = values[index];
    });
}

function updatePlayerSecondShotDisplay(prefix, stats) {
    const elements = [
        `${prefix}ServerErrors`, `${prefix}ServerMissRate`,
        `${prefix}NetErrors`, `${prefix}NetMissRate`,
        `${prefix}DeuceErrors`, `${prefix}DeuceMissRate`,
        `${prefix}AdErrors`, `${prefix}AdMissRate`
    ];
    
    const values = [
        `${stats.serverErrors} errors`, `${stats.serverMissRate}% miss rate`,
        `${stats.netErrors} errors`, `${stats.netMissRate}% miss rate`,
        `${stats.deuceErrors} errors`, `${stats.deuceMissRate}% miss rate`,
        `${stats.adErrors} errors`, `${stats.adMissRate}% miss rate`
    ];
    
    elements.forEach((elementId, index) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = values[index];
    });
}

// Screenshot functionality
function takeScreenshot() {
    if (typeof html2canvas !== 'undefined') {
        const activeView = document.querySelector('.results-view.active');
        if (activeView) {
            html2canvas(activeView).then(canvas => {
                const link = document.createElement('a');
                link.download = `doubles-stats-${doublesMatch.date || 'match'}.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        }
    } else {
        // Fallback to print
        window.print();
    }
}

// Touch/swipe functionality for results views
let startX = 0;
let startY = 0;

function initializeSwipeHandlers() {
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', function(e) {
        if (!startX || !startY) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Only swipe if horizontal movement is greater than vertical and we're on results section
        const resultsSection = document.getElementById('results');
        if (resultsSection && resultsSection.classList.contains('active') && 
            Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            
            if (diffX > 0 && currentResultsView < totalResultsViews - 1) {
                // Swipe left - next view
                showResultsView(currentResultsView + 1);
            } else if (diffX < 0 && currentResultsView > 0) {
                // Swipe right - previous view
                showResultsView(currentResultsView - 1);
            }
        }
        
        startX = 0;
        startY = 0;
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('matchDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Initialize first section
    showSection('match-info');
    
    // Initialize swipe handlers
    initializeSwipeHandlers();
    
    console.log('🎾 Doubles Tracker with Results Views initialized successfully!');
});
