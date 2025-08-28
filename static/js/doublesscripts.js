// Tony's Doubles Tracker JavaScript - Returner-Based Tracking

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
        deuce: 'player3',  // Default: Team 2 player 3 on deuce court
        ad: 'player4'      // Default: Team 2 player 4 on ad court
    },
    stats: {
        player1: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player2: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player3: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } },
        player4: { returnData: '', returnWins: 0, returnLosses: 0, secondShotMisses: { serving: 0, atNet: 0, deuceCourt: 0, adCourt: 0 } }
    },
    secondShotHistory: []
};

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
        updateResultsDisplay();
    }
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
        // Server switched teams, so returners switch too
        if (currentTeam === 1) {
            // Team 1 now serving, Team 2 now returning
            doublesMatch.returners.deuce = 'player3';
            doublesMatch.returners.ad = 'player4';
        } else {
            // Team 2 now serving, Team 1 now returning  
            doublesMatch.returners.deuce = 'player1';
            doublesMatch.returners.ad = 'player2';
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

// Results display
function updateResultsDisplay() {
    const resultsContainer = document.getElementById('finalResults');
    if (!resultsContainer) return;
    
    // Calculate match statistics
    let resultsHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Match Date</div>
                <div class="stat-value">${doublesMatch.date}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Location</div>
                <div class="stat-value">${doublesMatch.location}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Surface</div>
                <div class="stat-value">${doublesMatch.surface}</div>
            </div>
        </div>
        
        <h3 style="text-align: center; color: #FFE135; margin: 2rem 0;">Final Set Scores</h3>
        <div style="text-align: center; font-size: 1.5rem; margin-bottom: 2rem;">
            <strong>🔵 Team 1: ${doublesMatch.scores.team1.join('-')} 🔴 Team 2: ${doublesMatch.scores.team2.join('-')}</strong>
        </div>
        
        <h3 style="text-align: center; color: #FFE135; margin: 2rem 0;">Return Statistics</h3>
        <div class="stats-grid">
    `;
    
    // Add return stats for each player
    ['player1', 'player2', 'player3', 'player4'].forEach(playerKey => {
        const player = doublesMatch.players[playerKey];
        const stats = doublesMatch.stats[playerKey];
        const total = stats.returnWins + stats.returnLosses;
        const percentage = total > 0 ? ((stats.returnWins / total) * 100).toFixed(1) : '0.0';
        
        resultsHTML += `
            <div class="stat-card">
                <div class="stat-label">${player} - Return Win %</div>
                <div class="stat-value">${percentage}%</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">${stats.returnWins}/${total}</div>
            </div>
        `;
    });
    
    resultsHTML += `
        </div>
        
        <h3 style="text-align: center; color: #FFC107; margin: 2rem 0;">🎯 Second Shot Analysis</h3>
        <div class="stats-grid">
    `;
    
    // Add second shot stats
    ['player1', 'player2', 'player3', 'player4'].forEach(playerKey => {
        const player = doublesMatch.players[playerKey];
        const stats = doublesMatch.stats[playerKey];
        const totalMisses = Object.values(stats.secondShotMisses).reduce((a, b) => a + b, 0);
        
        resultsHTML += `
            <div class="stat-card" style="background: rgba(255, 193, 7, 0.1);">
                <div class="stat-label">${player} - 2nd Shot Misses</div>
                <div class="stat-value">${totalMisses}</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">
                    S:${stats.secondShotMisses.serving} N:${stats.secondShotMisses.atNet} 
                    DC:${stats.secondShotMisses.deuceCourt} AC:${stats.secondShotMisses.adCourt}
                </div>
            </div>
        `;
    });
    
    // Add team totals and insight
    const team1Misses = Object.values(doublesMatch.stats.player1.secondShotMisses).reduce((a, b) => a + b, 0) + 
                       Object.values(doublesMatch.stats.player2.secondShotMisses).reduce((a, b) => a + b, 0);
    const team2Misses = Object.values(doublesMatch.stats.player3.secondShotMisses).reduce((a, b) => a + b, 0) + 
                       Object.values(doublesMatch.stats.player4.secondShotMisses).reduce((a, b) => a + b, 0);
    
    let insight = '';
    const totalMisses = team1Misses + team2Misses;
    
    if (totalMisses === 0) {
        insight = 'Outstanding match! No second shot errors from any player.';
    } else if (team1Misses === team2Misses) {
        insight = `Both teams had ${totalMisses} second shot errors total. Focus on getting that crucial second ball in play!`;
    } else if (team1Misses > team2Misses) {
        insight = `🔵 Team 1 struggled more with second shots (${team1Misses} vs ${team2Misses} misses).`;
    } else {
        insight = `🔴 Team 2 struggled more with second shots (${team2Misses} vs ${team1Misses} misses).`;
    }
    
    resultsHTML += `
        </div>
        
        <div class="stat-card" style="background: rgba(255, 193, 7, 0.1); margin-top: 2rem;">
            <h4 style="color: #FFC107; margin-top: 0;">💡 Match Insight</h4>
            <p style="margin-bottom: 0;">${insight}</p>
        </div>
        
        <h3 style="text-align: center; color: #FFE135; margin: 2rem 0;">Detailed Return Data</h3>
        <div class="stats-grid">
    `;
    
    // Add raw return data
    ['player1', 'player2', 'player3', 'player4'].forEach(playerKey => {
        const player = doublesMatch.players[playerKey];
        const stats = doublesMatch.stats[playerKey];
        
        resultsHTML += `
            <div class="stat-card">
                <div class="stat-label">${player} - Return Data</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all; font-family: monospace;">${stats.returnData || 'None'}</div>
            </div>
        `;
    });
    
    resultsHTML += '</div>';
    
    resultsContainer.innerHTML = resultsHTML;
}

// Screenshot functionality
function takeScreenshot() {
    if (typeof html2canvas !== 'undefined') {
        const element = document.getElementById('finalResults');
        if (element) {
            html2canvas(element).then(canvas => {
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
    
    console.log('🎾 Doubles Tracker initialized successfully!');
});
