// Tony's Doubles Tracker JavaScript
// TEST: Add this at the very beginning of doublesscripts.js
console.log('🎾 doublesscripts.js START');
alert('JavaScript file is loading!');

// Match data structure for doubles
let doublesMatch = {
    // Basic match info
    players: {
        player1: 'P1',
        player2: 'P2', 
        player3: 'P3',
        player4: 'P4'
    },
    location: '',
    surface: 'Hard',
    date: '',
    
    // Game state
    currentSet: 1,
    currentServer: 'player1',
    scores: {
        team1: [0], // Array for multiple sets
        team2: [0]
    },
    
    // Return positions (which players are receiving in deuce/ad court)
    returners: {
        deuce: 'player3',  // Default: team 2 players return
        ad: 'player4'
    },
    
    // Serve statistics for each player
    stats: {
        player1: {
            firstServe: '',
            secondServe: '',
            firstServeWins: 0,
            firstServeLosses: 0, 
            secondServeWins: 0,
            secondServeLosses: 0,
            // Second shot tracking by position
            secondShotMisses: {
                serving: 0,     // When this player is serving
                atNet: 0,       // When this player is at net (partner serving)
                deuceCourt: 0,  // When returning in deuce court
                adCourt: 0      // When returning in ad court
            }
        },
        player2: {
            firstServe: '',
            secondServe: '',
            firstServeWins: 0,
            firstServeLosses: 0,
            secondServeWins: 0,
            secondServeLosses: 0,
            secondShotMisses: {
                serving: 0,
                atNet: 0,
                deuceCourt: 0,
                adCourt: 0
            }
        },
        player3: {
            firstServe: '',
            secondServe: '',
            firstServeWins: 0,
            firstServeLosses: 0,
            secondServeWins: 0,
            secondServeLosses: 0,
            secondShotMisses: {
                serving: 0,
                atNet: 0,
                deuceCourt: 0,
                adCourt: 0
            }
        },
        player4: {
            firstServe: '',
            secondServe: '',
            firstServeWins: 0,
            firstServeLosses: 0,
            secondServeWins: 0,
            secondServeLosses: 0,
            secondShotMisses: {
                serving: 0,
                atNet: 0,
                deuceCourt: 0,
                adCourt: 0
            }
        }
    },
    
    // Results pagination
    resultsPage: 1,
    
    // Second shot miss history for undo functionality
    secondShotHistory: []
};

// Initialize the doubles tracker
function initDoublesTracker() {
    // Set today's date
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
    
    // Show first section
    showSection('match-info');
    
    // Initialize displays
    updateAllDisplays();
    
    console.log('Doubles Tracker initialized');
}

// Navigation between sections
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.tennis-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Remove the miss from appropriate position
    switch(lastMiss.position) {
        case 'S':
            stats.secondShotMisses.serving = Math.max(0, stats.secondShotMisses.serving - 1);
            break;
        case 'N':
            stats.secondShotMisses.atNet = Math.max(0, stats.secondShotMisses.atNet - 1);
            break;
        case 'DC':
            stats.secondShotMisses.deuceCourt = Math.max(0, stats.secondShotMisses.deuceCourt - 1);
            break;
        case 'AC':
            stats.secondShotMisses.adCourt = Math.max(0, stats.secondShotMisses.adCourt - 1);
            break;
    }
    
    updateSecondShotTotals();
}

// Update second shot team totals
function updateSecondShotTotals() {
    // Team 1 total (player1 + player2)
    const team1Total = 
        Object.values(doublesMatch.stats.player1.secondShotMisses).reduce((a, b) => a + b, 0) +
        Object.values(doublesMatch.stats.player2.secondShotMisses).reduce((a, b) => a + b, 0);
    
    // Team 2 total (player3 + player4)  
    const team2Total =
        Object.values(doublesMatch.stats.player3.secondShotMisses).reduce((a, b) => a + b, 0) +
        Object.values(doublesMatch.stats.player4.secondShotMisses).reduce((a, b) => a + b, 0);
    
    document.getElementById('team1Misses').textContent = team1Total;
    document.getElementById('team2Misses').textContent = team2Total;
}

// Complete game (add commas to serve data)
function completeGame() {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    
    stats.firstServe += ',';
    stats.secondServe += ',';
    
    updateServeStats();
}

// Results pagination
let currentResultsPage = 1;
const totalResultsPages = 6;

function nextResultsPage() {
    currentResultsPage = currentResultsPage < totalResultsPages ? currentResultsPage + 1 : 1;
    updateResultsDisplay();
}

function previousResultsPage() {
    currentResultsPage = currentResultsPage > 1 ? currentResultsPage - 1 : totalResultsPages;
    updateResultsDisplay();
}

// Update results display based on current page
function updateResultsDisplay() {
    document.getElementById('resultsPageNumber').textContent = currentResultsPage;
    
    let content = '';
    
    switch(currentResultsPage) {
        case 1:
            content = generateTeam1Results();
            break;
        case 2:
            content = generateTeam2Results();
            break;
        case 3:
            content = generatePlayer1Results();
            break;
        case 4:
            content = generatePlayer2Results();
            break;
        case 5:
            content = generatePlayer3Results();
            break;
        case 6:
            content = generatePlayer4Results();
            break;
    }
    
    document.getElementById('resultsContent').innerHTML = content;
}

// Generate team 1 results
function generateTeam1Results() {
    const p1Stats = doublesMatch.stats.player1;
    const p2Stats = doublesMatch.stats.player2;
    
    // Calculate combined serve stats
    const combinedFirstWins = p1Stats.firstServeWins + p2Stats.firstServeWins;
    const combinedFirstLosses = p1Stats.firstServeLosses + p2Stats.firstServeLosses;
    const combinedSecondWins = p1Stats.secondServeWins + p2Stats.secondServeWins;
    const combinedSecondLosses = p1Stats.secondServeLosses + p2Stats.secondServeLosses;
    
    const firstPerc = (combinedFirstWins + combinedFirstLosses) > 0 ? 
        ((combinedFirstWins / (combinedFirstWins + combinedFirstLosses)) * 100).toFixed(1) : '0.0';
    const secondPerc = (combinedSecondWins + combinedSecondLosses) > 0 ?
        ((combinedSecondWins / (combinedSecondWins + combinedSecondLosses)) * 100).toFixed(1) : '0.0';
    
    // Calculate first serve percentage (how often first serve went in)
    const totalFirstAttempts = p1Stats.firstServe.replace(/,/g, '').length + p2Stats.firstServe.replace(/,/g, '').length;
    const totalSecondAttempts = p1Stats.secondServe.replace(/,/g, '').length + p2Stats.secondServe.replace(/,/g, '').length;
    const firstInPerc = (totalFirstAttempts + totalSecondAttempts) > 0 ?
        ((totalFirstAttempts / (totalFirstAttempts + totalSecondAttempts)) * 100).toFixed(1) : '0.0';
    
    // Second shot stats
    const team1SecondShotMisses = 
        Object.values(p1Stats.secondShotMisses).reduce((a, b) => a + b, 0) +
        Object.values(p2Stats.secondShotMisses).reduce((a, b) => a + b, 0);
    
    return `
        <h3 style="text-align: center; color: #6BB6FF; margin-bottom: 2rem;">🔵 Team 1 Results</h3>
        <div style="text-align: center; margin-bottom: 2rem;">
            <strong>${doublesMatch.players.player1} & ${doublesMatch.players.player2}</strong>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Match Info</div>
                <div>${doublesMatch.date}</div>
                <div>${doublesMatch.location}</div>
                <div>${doublesMatch.surface}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Final Score</div>
                <div class="stat-value">${doublesMatch.scores.team1.join('-')} vs ${doublesMatch.scores.team2.join('-')}</div>
            </div>
        </div>
        
        <h4 style="color: #FFE135; margin: 2rem 0 1rem 0;">Combined Serve Statistics</h4>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">1st Serve %</div>
                <div class="stat-value">${firstInPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">1st Serve Win %</div>
                <div class="stat-value">${firstPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">2nd Serve Win %</div>
                <div class="stat-value">${secondPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total 2nd Shot Misses</div>
                <div class="stat-value">${team1SecondShotMisses}</div>
            </div>
        </div>
    `;
}

// Generate team 2 results
function generateTeam2Results() {
    const p3Stats = doublesMatch.stats.player3;
    const p4Stats = doublesMatch.stats.player4;
    
    // Calculate combined serve stats
    const combinedFirstWins = p3Stats.firstServeWins + p4Stats.firstServeWins;
    const combinedFirstLosses = p3Stats.firstServeLosses + p4Stats.firstServeLosses;
    const combinedSecondWins = p3Stats.secondServeWins + p4Stats.secondServeWins;
    const combinedSecondLosses = p3Stats.secondServeLosses + p4Stats.secondServeLosses;
    
    const firstPerc = (combinedFirstWins + combinedFirstLosses) > 0 ? 
        ((combinedFirstWins / (combinedFirstWins + combinedFirstLosses)) * 100).toFixed(1) : '0.0';
    const secondPerc = (combinedSecondWins + combinedSecondLosses) > 0 ?
        ((combinedSecondWins / (combinedSecondWins + combinedSecondLosses)) * 100).toFixed(1) : '0.0';
    
    // Calculate first serve percentage
    const totalFirstAttempts = p3Stats.firstServe.replace(/,/g, '').length + p4Stats.firstServe.replace(/,/g, '').length;
    const totalSecondAttempts = p3Stats.secondServe.replace(/,/g, '').length + p4Stats.secondServe.replace(/,/g, '').length;
    const firstInPerc = (totalFirstAttempts + totalSecondAttempts) > 0 ?
        ((totalFirstAttempts / (totalFirstAttempts + totalSecondAttempts)) * 100).toFixed(1) : '0.0';
    
    // Second shot stats
    const team2SecondShotMisses = 
        Object.values(p3Stats.secondShotMisses).reduce((a, b) => a + b, 0) +
        Object.values(p4Stats.secondShotMisses).reduce((a, b) => a + b, 0);
    
    return `
        <h3 style="text-align: center; color: #FF6B6B; margin-bottom: 2rem;">🔴 Team 2 Results</h3>
        <div style="text-align: center; margin-bottom: 2rem;">
            <strong>${doublesMatch.players.player3} & ${doublesMatch.players.player4}</strong>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Match Info</div>
                <div>${doublesMatch.date}</div>
                <div>${doublesMatch.location}</div>
                <div>${doublesMatch.surface}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Final Score</div>
                <div class="stat-value">${doublesMatch.scores.team2.join('-')} vs ${doublesMatch.scores.team1.join('-')}</div>
            </div>
        </div>
        
        <h4 style="color: #FFE135; margin: 2rem 0 1rem 0;">Combined Serve Statistics</h4>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">1st Serve %</div>
                <div class="stat-value">${firstInPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">1st Serve Win %</div>
                <div class="stat-value">${firstPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">2nd Serve Win %</div>
                <div class="stat-value">${secondPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total 2nd Shot Misses</div>
                <div class="stat-value">${team2SecondShotMisses}</div>
            </div>
        </div>
    `;
}

// Generate individual player results
function generatePlayerResults(playerKey) {
    const player = doublesMatch.players[playerKey];
    const stats = doublesMatch.stats[playerKey];
    
    // Calculate serve percentages
    const firstTotal = stats.firstServeWins + stats.firstServeLosses;
    const secondTotal = stats.secondServeWins + stats.secondServeLosses;
    
    const firstPerc = firstTotal > 0 ? ((stats.firstServeWins / firstTotal) * 100).toFixed(1) : '0.0';
    const secondPerc = secondTotal > 0 ? ((stats.secondServeWins / secondTotal) * 100).toFixed(1) : '0.0';
    
    // Calculate first serve percentage
    const totalFirstAttempts = stats.firstServe.replace(/,/g, '').length;
    const totalSecondAttempts = stats.secondServe.replace(/,/g, '').length;
    const firstInPerc = (totalFirstAttempts + totalSecondAttempts) > 0 ?
        ((totalFirstAttempts / (totalFirstAttempts + totalSecondAttempts)) * 100).toFixed(1) : '0.0';
    
    // Second shot breakdown
    const secondShotTotal = Object.values(stats.secondShotMisses).reduce((a, b) => a + b, 0);
    
    // Calculate serve opportunities (estimate based on game structure)
    const totalServePoints = firstTotal + secondTotal;
    
    // Determine team color
    const isTeam1 = (playerKey === 'player1' || playerKey === 'player2');
    const teamColor = isTeam1 ? '#6BB6FF' : '#FF6B6B';
    const teamEmoji = isTeam1 ? '🔵' : '🔴';
    
    return `
        <h3 style="text-align: center; color: ${teamColor}; margin-bottom: 2rem;">${teamEmoji} ${player} Individual Results</h3>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">1st Serve %</div>
                <div class="stat-value">${firstInPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">1st Serve Win %</div>
                <div class="stat-value">${firstPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">2nd Serve Win %</div>
                <div class="stat-value">${secondPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total 2nd Shot Misses</div>
                <div class="stat-value">${secondShotTotal}</div>
            </div>
        </div>
        
        <h4 style="color: #FFC107; margin: 2rem 0 1rem 0;">🎯 Second Shot Analysis by Position</h4>
        <div class="stats-grid">
            <div class="stat-card" style="background: rgba(255, 193, 7, 0.1);">
                <div class="stat-label">Serving Position</div>
                <div class="stat-value">${stats.secondShotMisses.serving} misses / ${totalServePoints} serves</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">When serving</div>
            </div>
            <div class="stat-card" style="background: rgba(255, 193, 7, 0.1);">
                <div class="stat-label">At Net Position</div>
                <div class="stat-value">${stats.secondShotMisses.atNet} misses</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">When partner serving</div>
            </div>
            <div class="stat-card" style="background: rgba(255, 193, 7, 0.1);">
                <div class="stat-label">Deuce Court Returns</div>
                <div class="stat-value">${stats.secondShotMisses.deuceCourt} misses</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">When returning deuce court</div>
            </div>
            <div class="stat-card" style="background: rgba(255, 193, 7, 0.1);">
                <div class="stat-label">Ad Court Returns</div>
                <div class="stat-value">${stats.secondShotMisses.adCourt} misses</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">When returning ad court</div>
            </div>
        </div>
        
        <h4 style="color: #FFE135; margin: 2rem 0 1rem 0;">Detailed Serve Data</h4>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">First Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${stats.firstServe || 'None'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Second Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${stats.secondServe || 'None'}</div>
            </div>
        </div>
    `;
}

// Individual player result generators
function generatePlayer1Results() {
    return generatePlayerResults('player1');
}

function generatePlayer2Results() {
    return generatePlayerResults('player2');
}

function generatePlayer3Results() {
    return generatePlayerResults('player3');
}

function generatePlayer4Results() {
    return generatePlayerResults('player4');
}

// Screenshot functionality
function takeScreenshot() {
    if (typeof html2canvas !== 'undefined') {
        const element = document.getElementById('resultsContent');
        if (element) {
            html2canvas(element).then(canvas => {
                const link = document.createElement('a');
                link.download = `doubles-stats-page${currentResultsPage}-${doublesMatch.date || 'match'}.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        }
    } else {
        // Fallback to print
        window.print();
    }
}

// Touch/swipe support for results
let touchStartX = null;
let touchStartY = null;

function handleTouchStart(event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

function handleTouchMove(event) {
    if (!touchStartX || !touchStartY) {
        return;
    }
    
    const touchEndX = event.touches[0].clientX;
    const touchEndY = event.touches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 50) { // Minimum swipe distance
            if (diffX > 0) {
                // Swipe left - next page
                nextResultsPage();
            } else {
                // Swipe right - previous page
                previousResultsPage();
            }
        }
    }
    
    touchStartX = null;
    touchStartY = null;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initDoublesTracker();
    
    // Add touch listeners for swipe support
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
});

// Export for potential debugging
window.doublesMatch = doublesMatch; 

// Navigation between sections
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.tennis-section');
    sections.forEach(section => section.classList.remove('active'));

    // Remove active class from nav buttons
    const navButtons = document.querySelectorAll('.tennis-nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to nav button
    const activeButton = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Update displays for the section
    if (sectionId === 'match-tracker') {
        startMatch();
    } else if (sectionId === 'results') {
        currentResultsPage = 1; // Reset to first page
        updateResultsDisplay();
    }
}

// Start match - gather info and initialize tracking
function startMatch() {
    // Get player names (handle empty inputs)
    doublesMatch.players.player1 = document.getElementById('player1').value.trim() || 'P1';
    doublesMatch.players.player2 = document.getElementById('player2').value.trim() || 'P2';
    doublesMatch.players.player3 = document.getElementById('player3').value.trim() || 'P3';
    doublesMatch.players.player4 = document.getElementById('player4').value.trim() || 'P4';
    
    // Get match details
    doublesMatch.location = document.getElementById('location').value.trim() || 'Local Court';
    doublesMatch.surface = document.getElementById('surface').value;
    doublesMatch.date = document.getElementById('matchDate').value;
    
    // Update server dropdown with actual names
    updateServerDropdown();
    
    // Update all displays
    updateAllDisplays();
}

// Update server dropdown with player names
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

// Get first 3 letters (or less) of player name for button text
function getPlayerAbbrev(playerKey) {
    const name = doublesMatch.players[playerKey];
    // Handle names shorter than 3 characters
    return name.substring(0, Math.min(3, name.length)).toUpperCase();
}

// Get current position for each player
function getPlayerPosition(playerKey) {
    const currentServer = doublesMatch.currentServer;
    const deuceReturner = doublesMatch.returners.deuce;
    const adReturner = doublesMatch.returners.ad;
    
    if (playerKey === currentServer) {
        return 'S'; // Serving
    }
    
    // Get server's partner (at net)
    let serverPartner;
    if (currentServer === 'player1' || currentServer === 'player2') {
        serverPartner = (currentServer === 'player1') ? 'player2' : 'player1';
    } else {
        serverPartner = (currentServer === 'player3') ? 'player4' : 'player3';
    }
    
    if (playerKey === serverPartner) {
        return 'N'; // At net
    }
    
    if (playerKey === deuceReturner) {
        return 'DC'; // Deuce court returner
    }
    
    if (playerKey === adReturner) {
        return 'AC'; // Ad court returner  
    }
    
    return '?'; // Should not happen in normal doubles
}

// Update all displays
function updateAllDisplays() {
    updateScores();
    updateCurrentPositions();
    updateSecondShotButtons();
    updateServeStats();
    updateSecondShotTotals();
    updateReturnerDisplay();
}

// Update score displays
function updateScores() {
    const currentSetIndex = doublesMatch.currentSet - 1;
    document.getElementById('team1Score').textContent = doublesMatch.scores.team1[currentSetIndex] || 0;
    document.getElementById('team2Score').textContent = doublesMatch.scores.team2[currentSetIndex] || 0;
    document.getElementById('currentSet').textContent = doublesMatch.currentSet;
}

// Update current positions display (enhanced visual formatting)
function updateCurrentPositions() {
    const p1Abbrev = getPlayerAbbrev('player1');
    const p2Abbrev = getPlayerAbbrev('player2');
    const p3Abbrev = getPlayerAbbrev('player3');
    const p4Abbrev = getPlayerAbbrev('player4');
    
    const p1Pos = getPlayerPosition('player1');
    const p2Pos = getPlayerPosition('player2');
    const p3Pos = getPlayerPosition('player3');
    const p4Pos = getPlayerPosition('player4');
    
    const positionsText = `🔵 ${p1Abbrev}(${p1Pos}) ${p2Abbrev}(${p2Pos}) vs 🔴 ${p3Abbrev}(${p3Pos}) ${p4Abbrev}(${p4Pos})`;
    document.getElementById('currentPositions').textContent = positionsText;
}

// Update second shot button text
function updateSecondShotButtons() {
    const players = ['player1', 'player2', 'player3', 'player4'];
    
    players.forEach(playerKey => {
        const abbrev = getPlayerAbbrev(playerKey);
        const position = getPlayerPosition(playerKey);
        const buttonText = `${abbrev}-${position}`;
        
        const button = document.getElementById(`${playerKey}SecondShotBtn`);
        if (button) {
            button.textContent = buttonText;
        }
    });
}

// Update returner display
function updateReturnerDisplay() {
    document.getElementById('deuceReturner').textContent = doublesMatch.players[doublesMatch.returners.deuce];
    document.getElementById('adReturner').textContent = doublesMatch.players[doublesMatch.returners.ad];
}

// Adjust games for teams
function adjustGames(team, change) {
    const currentSetIndex = doublesMatch.currentSet - 1;
    
    // Ensure arrays exist for current set
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

// Adjust set number
function adjustSet(change) {
    doublesMatch.currentSet = Math.max(1, Math.min(3, doublesMatch.currentSet + change));
    
    // Ensure score arrays exist for new set
    const currentSetIndex = doublesMatch.currentSet - 1;
    while (doublesMatch.scores.team1.length <= currentSetIndex) {
        doublesMatch.scores.team1.push(0);
        doublesMatch.scores.team2.push(0);
    }
    
    updateAllDisplays();
}

// Update server when dropdown changes
function updateServer() {
    doublesMatch.currentServer = document.getElementById('currentServer').value;
    updateAllDisplays();
}

// Change returner positions (switch deuce/ad court)
function changeReturners() {
    const currentDeuce = doublesMatch.returners.deuce;
    const currentAd = doublesMatch.returners.ad;
    
    // Swap the returners
    doublesMatch.returners.deuce = currentAd;
    doublesMatch.returners.ad = currentDeuce;
    
    updateAllDisplays();
}

// Record first serve
function recordFirstServe(won) {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    
    stats.firstServe += won ? '1' : '0';
    
    if (won) {
        stats.firstServeWins++;
    } else {
        stats.firstServeLosses++;
    }
    
    updateServeStats();
}

// Record second serve  
function recordSecondServe(won) {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    
    stats.secondServe += won ? '1' : '0';
    
    if (won) {
        stats.secondServeWins++;
    } else {
        stats.secondServeLosses++;
    }
    
    updateServeStats();
}

// Undo last serve
function undoLastServe(serveType) {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    
    if (serveType === 'first') {
        const lastServe = stats.firstServe.slice(-1);
        if (lastServe) {
            stats.firstServe = stats.firstServe.slice(0, -1);
            if (lastServe === '1') {
                stats.firstServeWins = Math.max(0, stats.firstServeWins - 1);
            } else {
                stats.firstServeLosses = Math.max(0, stats.firstServeLosses - 1);
            }
        }
    } else {
        const lastServe = stats.secondServe.slice(-1);
        if (lastServe) {
            stats.secondServe = stats.secondServe.slice(0, -1);
            if (lastServe === '1') {
                stats.secondServeWins = Math.max(0, stats.secondServeWins - 1);
            } else {
                stats.secondServeLosses = Math.max(0, stats.secondServeLosses - 1);
            }
        }
    }
    
    updateServeStats();
}

// Update serve statistics display
function updateServeStats() {
    const server = doublesMatch.currentServer;
    const stats = doublesMatch.stats[server];
    
    // Update serve displays
    document.getElementById('firstServeDisplay').textContent = stats.firstServe || '-';
    document.getElementById('secondServeDisplay').textContent = stats.secondServe || '-';
    
    // Calculate percentages
    const firstTotal = stats.firstServeWins + stats.firstServeLosses;
    const secondTotal = stats.secondServeWins + stats.secondServeLosses;
    
    const firstPerc = firstTotal > 0 ? ((stats.firstServeWins / firstTotal) * 100).toFixed(1) : '0.0';
    const secondPerc = secondTotal > 0 ? ((stats.secondServeWins / secondTotal) * 100).toFixed(1) : '0.0';
    
    document.getElementById('firstServePercentage').textContent = `${firstPerc}%`;
    document.getElementById('secondServePercentage').textContent = `${secondPerc}%`;
}

// Record second shot miss
function recordSecondShotMiss(playerKey) {
    const position = getPlayerPosition(playerKey);
    const stats = doublesMatch.stats[playerKey];
    
    // Record miss by position
    switch(position) {
        case 'S':
            stats.secondShotMisses.serving++;
            break;
        case 'N':
            stats.secondShotMisses.atNet++;
            break;
        case 'DC':
            stats.secondShotMisses.deuceCourt++;
            break;
        case 'AC':
            stats.secondShotMisses.adCourt++;
            break;
    }
    
    // Add to history for undo
    doublesMatch.secondShotHistory.push({
        player: playerKey,
        position: position,
        timestamp: Date.now()
    });
    
    updateSecondShotTotals();
}

// Undo last second shot miss
function undoSecondShotMiss() {
    if (doublesMatch.secondShotHistory.length === 0) return;
    
    const lastMiss = doublesMatch.secondShotHistory.pop();
    const stats = doublesMatch.stats[lastMiss.player];
    
    // Remove
