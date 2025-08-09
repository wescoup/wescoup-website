// Tony's Tennis Tracker JavaScript

// Navigation functionality
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.tennis-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.tennis-nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));

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

    // Special handling for results section
    if (sectionId === 'results') {
        updateStatsDisplay();
    }
}

// Initialize the app
function initTennisTracker() {
    // Initialize default values if not set
if (!currentMatch.player1) currentMatch.player1 = 'Player 1';
if (!currentMatch.player2) currentMatch.player2 = 'Player 2';
if (!currentMatch.currentServer) currentMatch.currentServer = currentMatch.player1;
    // Show the first section by default
    showSection('match-info');
    console.log('Tennis Tracker initialized');
}

// Match data object
let currentMatch = {
    player1: '',
    player2: '',
    location: '',
    surface: 'Hard',
    date: '',
    currentServer: '',
    sets: [],
    stats: {
        player1: {
            firstServe: '',
            secondServe: '',
            firstServeWins: 0,
            firstServeLosses: 0,
            secondServeWins: 0,
            secondServeLosses: 0,
            // Second shot match tracking
            secondShotMissesServing: 0,
            secondShotMissesReturning: 0
        },
        player2: {
            firstServe: '',
            secondServe: '',
            firstServeWins: 0,
            firstServeLosses: 0,
            secondServeWins: 0,
            secondServeLosses: 0,
            // Second shot match tracking
            secondShotMissesServing: 0,
            secondShotMissesReturning: 0
            
        }
    }
};

// Match info functions
function startMatch() {
    const player1 = document.getElementById('player1').value || 'Player 1';
    const player2 = document.getElementById('player2').value || 'Player 2';
    const location = document.getElementById('location').value || 'Location';
    const surface = document.getElementById('surface').value;
    const date = document.getElementById('matchDate').value;
    
    currentMatch.player1 = player1;
    currentMatch.player2 = player2;
    currentMatch.location = location;
    currentMatch.surface = surface;
    currentMatch.date = date;
    currentMatch.currentServer = player1;
    
    // Initialize sets
    currentMatch.sets = [0, 0];
    
    updateMatchDisplay();
    showSection('match-tracker');
}

function updateMatchDisplay() {
    // Update server dropdown
    const serverSelect = document.getElementById('currentServer');
    if (serverSelect) {
        serverSelect.innerHTML = `
            <option value="${currentMatch.player1}">${currentMatch.player1}</option>
            <option value="${currentMatch.player2}">${currentMatch.player2}</option>
        `;
        serverSelect.value = currentMatch.currentServer;
    }
    
    // Update set scores
    updateSetScores();
    
    // Update stats display
    updateStatsDisplay();
}

function updateSetScores() {
    const p1Score = document.getElementById('player1Score');
    const p2Score = document.getElementById('player2Score');
    
    if (p1Score && p2Score) {
        p1Score.textContent = currentMatch.sets[0];
        p2Score.textContent = currentMatch.sets[1];
    }
}

// Set score functions
function addGame(playerIndex) {
    // Initialize sets array if it doesn't exist
    if (!currentMatch.sets || currentMatch.sets.length === 0) {
        currentMatch.sets = [0, 0];
    }
    
    currentMatch.sets[playerIndex]++;
    updateSetScores();
}

function subtractGame(playerIndex) {
    // Initialize sets array if it doesn't exist
    if (!currentMatch.sets || currentMatch.sets.length === 0) {
        currentMatch.sets = [0, 0];
    }
    
    if (currentMatch.sets[playerIndex] > 0) {
        currentMatch.sets[playerIndex]--;
        updateSetScores();
    }
}

function updateSetScores() {
    const p1Score = document.getElementById('player1Score');
    const p2Score = document.getElementById('player2Score');
    
    // Make sure DOM elements exist and sets array is initialized
    if (p1Score && p2Score && currentMatch.sets) {
        p1Score.textContent = currentMatch.sets[0] || 0;
        p2Score.textContent = currentMatch.sets[1] || 0;
    }
}

// Server functions
function changeServer() {
    // Get the current server text
    const currentServerElement = document.getElementById('currentServer');
    const currentServerText = currentServerElement.textContent;
    
    // Toggle between Player 1 and Player 2 (or whatever names are set)
    if (currentServerText === 'Player 1' || currentServerText === currentMatch.player1) {
        currentMatch.currentServer = currentMatch.player2 || 'Player 2';
    } else {
        currentMatch.currentServer = currentMatch.player1 || 'Player 1';
    }
    
    // Update the display
    currentServerElement.textContent = currentMatch.currentServer;
    
    // Update the serve statistics display
    updateServeStats();
}

// Serve tracking functions
function recordFirstServe(won) {
    const isPlayer1Serving = currentMatch.currentServer === currentMatch.player1;
    const player = isPlayer1Serving ? 'player1' : 'player2';
    
    currentMatch.stats[player].firstServe += won ? '1' : '0';
    
    if (won) {
        currentMatch.stats[player].firstServeWins++;
    } else {
        currentMatch.stats[player].firstServeLosses++;
    }
    
    updateServeStats();
}

function recordSecondServe(won) {
    const isPlayer1Serving = currentMatch.currentServer === currentMatch.player1;
    const player = isPlayer1Serving ? 'player1' : 'player2';
    
    currentMatch.stats[player].secondServe += won ? '1' : '0';
    
    if (won) {
        currentMatch.stats[player].secondServeWins++;
    } else {
        currentMatch.stats[player].secondServeLosses++;
    }
    
    updateServeStats();
}

function undoLastServe(serveType) {
    const isPlayer1Serving = currentMatch.currentServer === currentMatch.player1;
    const player = isPlayer1Serving ? 'player1' : 'player2';
    
    if (serveType === 'first') {
        const lastServe = currentMatch.stats[player].firstServe.slice(-1);
        if (lastServe) {
            currentMatch.stats[player].firstServe = currentMatch.stats[player].firstServe.slice(0, -1);
            if (lastServe === '1') {
                currentMatch.stats[player].firstServeWins--;
            } else {
                currentMatch.stats[player].firstServeLosses--;
            }
        }
    } else {
        const lastServe = currentMatch.stats[player].secondServe.slice(-1);
        if (lastServe) {
            currentMatch.stats[player].secondServe = currentMatch.stats[player].secondServe.slice(0, -1);
            if (lastServe === '1') {
                currentMatch.stats[player].secondServeWins--;
            } else {
                currentMatch.stats[player].secondServeLosses--;
            }
        }
    }
    
    updateServeStats();
}

function updateServeStats() {
    // Update serve displays
    const firstServeDisplay = document.getElementById('firstServeDisplay');
    const secondServeDisplay = document.getElementById('secondServeDisplay');
    
    const isPlayer1Serving = currentMatch.currentServer === currentMatch.player1;
    const player = isPlayer1Serving ? 'player1' : 'player2';
    
    if (firstServeDisplay) {
        firstServeDisplay.textContent = currentMatch.stats[player].firstServe;
    }
    if (secondServeDisplay) {
        secondServeDisplay.textContent = currentMatch.stats[player].secondServe;
    }
    
    // Update percentages
    updateServePercentages();
    
    // Version 2.0: Also update second shot live display
    if (document.title.includes('2.0')) {
        updateSecondShotStats();
    }
}

function updateServePercentages() {
    const player = currentMatch.currentServer === currentMatch.player1 ? 'player1' : 'player2';
    const stats = currentMatch.stats[player];
    
    const firstServePercentage = stats.firstServeWins + stats.firstServeLosses > 0 
        ? ((stats.firstServeWins / (stats.firstServeWins + stats.firstServeLosses)) * 100).toFixed(1)
        : '0.0';
    
    const secondServePercentage = stats.secondServeWins + stats.secondServeLosses > 0
        ? ((stats.secondServeWins / (stats.secondServeWins + stats.secondServeLosses)) * 100).toFixed(1)
        : '0.0';
    
    const firstServePercDisplay = document.getElementById('firstServePercentage');
    const secondServePercDisplay = document.getElementById('secondServePercentage');
    
    if (firstServePercDisplay) {
        firstServePercDisplay.textContent = `${firstServePercentage}%`;
    }
    if (secondServePercDisplay) {
        secondServePercDisplay.textContent = `${secondServePercentage}%`;
    }
}

function completeGame() {
    // Add comma to separate games
    const isPlayer1Serving = currentMatch.currentServer === currentMatch.player1;
    const player = isPlayer1Serving ? 'player1' : 'player2';
    
    currentMatch.stats[player].firstServe += ',';
    currentMatch.stats[player].secondServe += ',';
    
    updateServeStats();
}

// Updated to service both tonys-tennis-tracker and tonys-tennis-tracker-20
function updateStatsDisplay() {
    const resultsContainer = document.getElementById('finalResults');
    if (!resultsContainer) return;
    
    const p1Stats = currentMatch.stats.player1;
    const p2Stats = currentMatch.stats.player2;
    
    // Calculate percentages
    const p1FirstServePerc = p1Stats.firstServeWins + p1Stats.firstServeLosses > 0
        ? ((p1Stats.firstServeWins / (p1Stats.firstServeWins + p1Stats.firstServeLosses)) * 100).toFixed(1)
        : '0.0';
    
    const p1SecondServePerc = p1Stats.secondServeWins + p1Stats.secondServeLosses > 0
        ? ((p1Stats.secondServeWins / (p1Stats.secondServeWins + p1Stats.secondServeLosses)) * 100).toFixed(1)
        : '0.0';
    
    const p2FirstServePerc = p2Stats.firstServeWins + p2Stats.firstServeLosses > 0
        ? ((p2Stats.firstServeWins / (p2Stats.firstServeWins + p2Stats.firstServeLosses)) * 100).toFixed(1)
        : '0.0';
    
    const p2SecondServePerc = p2Stats.secondServeWins + p2Stats.secondServeLosses > 0
        ? ((p2Stats.secondServeWins / (p2Stats.secondServeWins + p2Stats.secondServeLosses)) * 100).toFixed(1)
        : '0.0';
    
    // Calculate first serve percentage (how often they got first serve in)
    const p1FirstServeInPerc = p1Stats.firstServe.replace(/,/g, '').length > 0
        ? ((p1Stats.firstServe.replace(/,/g, '').length / 
           (p1Stats.firstServe.replace(/,/g, '').length + p1Stats.secondServe.replace(/,/g, '').length)) * 100).toFixed(1)
        : '0.0';
    
    const p2FirstServeInPerc = p2Stats.firstServe.replace(/,/g, '').length > 0
        ? ((p2Stats.firstServe.replace(/,/g, '').length / 
           (p2Stats.firstServe.replace(/,/g, '').length + p2Stats.secondServe.replace(/,/g, '').length)) * 100).toFixed(1)
        : '0.0';

    // Base HTML that works for both versions
    let resultsHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Match Date</div>
                <div class="stat-value">${currentMatch.date}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Location</div>
                <div class="stat-value">${currentMatch.location}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Surface</div>
                <div class="stat-value">${currentMatch.surface}</div>
            </div>
        </div>
        
        <h3 style="text-align: center; color: #FFE135; margin: 2rem 0;">Final Set Score</h3>
        <div style="text-align: center; font-size: 2rem; margin-bottom: 2rem;">
            <strong>${currentMatch.player1}: ${currentMatch.sets[0]} - ${currentMatch.sets[1]} :${currentMatch.player2}</strong>
        </div>
        
        <h3 style="text-align: center; color: #FFE135; margin: 2rem 0;">Serve Statistics</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 1st Serve %</div>
                <div class="stat-value">${p1FirstServeInPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 1st Serve Win %</div>
                <div class="stat-value">${p1FirstServePerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 2nd Serve Win %</div>
                <div class="stat-value">${p1SecondServePerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 1st Serve %</div>
                <div class="stat-value">${p2FirstServeInPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 1st Serve Win %</div>
                <div class="stat-value">${p2FirstServePerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 2nd Serve Win %</div>
                <div class="stat-value">${p2SecondServePerc}%</div>
            </div>
        </div>`;

    // Version 2.0: Add second shot analysis
    if (document.title.includes('2.0')) {
        // Calculate second shot percentages
        const p1ServingTotal = p1Stats.firstServeWins + p1Stats.firstServeLosses + p1Stats.secondServeWins + p1Stats.secondServeLosses;
        const p1ReturningTotal = p2Stats.firstServeWins + p2Stats.firstServeLosses + p2Stats.secondServeWins + p2Stats.secondServeLosses;
        const p2ServingTotal = p2Stats.firstServeWins + p2Stats.firstServeLosses + p2Stats.secondServeWins + p2Stats.secondServeLosses;
        const p2ReturningTotal = p1Stats.firstServeWins + p1Stats.firstServeLosses + p1Stats.secondServeWins + p1Stats.secondServeLosses;
        
        const p1ServingSecondShotPerc = calculateSecondShotPercentage(p1Stats.secondShotMissesServing, p1ServingTotal);
        const p1ReturningSecondShotPerc = calculateSecondShotPercentage(p1Stats.secondShotMissesReturning, p1ReturningTotal);
        const p2ServingSecondShotPerc = calculateSecondShotPercentage(p2Stats.secondShotMissesServing, p2ServingTotal);
        const p2ReturningSecondShotPerc = calculateSecondShotPercentage(p2Stats.secondShotMissesReturning, p2ReturningTotal);
        
        resultsHTML += `
            <h3 style="text-align: center; color: #FFC107; margin: 2rem 0;">🎯 Second Shot Analysis</h3>
            <div class="stats-grid">
                <div class="stat-card" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3);">
                    <div class="stat-label">${currentMatch.player1} - Serving 2nd Shot Miss %</div>
                    <div class="stat-value">${p1ServingSecondShotPerc.toFixed(1)}%</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${p1Stats.secondShotMissesServing} misses</div>
                </div>
                <div class="stat-card" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3);">
                    <div class="stat-label">${currentMatch.player1} - Returning 2nd Shot Miss %</div>
                    <div class="stat-value">${p1ReturningSecondShotPerc.toFixed(1)}%</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${p1Stats.secondShotMissesReturning} misses</div>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-card" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3);">
                    <div class="stat-label">${currentMatch.player2} - Serving 2nd Shot Miss %</div>
                    <div class="stat-value">${p2ServingSecondShotPerc.toFixed(1)}%</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${p2Stats.secondShotMissesServing} misses</div>
                </div>
                <div class="stat-card" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3);">
                    <div class="stat-label">${currentMatch.player2} - Returning 2nd Shot Miss %</div>
                    <div class="stat-value">${p2ReturningSecondShotPerc.toFixed(1)}%</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${p2Stats.secondShotMissesReturning} misses</div>
                </div>
            </div>

            <div class="stat-card" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); margin-top: 2rem;">
                <h4 style="color: #FFC107; margin-top: 0;">💡 Second Shot Insight</h4>
                <p style="margin-bottom: 0;">
                    ${generateSecondShotInsight(p1Stats, p2Stats, currentMatch.player1, currentMatch.player2)}
                </p>
            </div>`;
    }

    // Add detailed serve data (for both versions)
    resultsHTML += `
        <h3 style="text-align: center; color: #FFE135; margin: 2rem 0;">Detailed Serve Data</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 1st Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p1Stats.firstServe || 'None'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 2nd Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p1Stats.secondServe || 'None'}</div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 1st Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p2Stats.firstServe || 'None'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 2nd Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p2Stats.secondServe || 'None'}</div>
            </div>
        </div>`;

    resultsContainer.innerHTML = resultsHTML;
}

// Screenshot functionality
function takeScreenshot() {
    if (typeof html2canvas !== 'undefined') {
        const element = document.getElementById('finalResults');
        if (element) {
            html2canvas(element).then(canvas => {
                const link = document.createElement('a');
                link.download = `tennis-stats-${currentMatch.date || 'match'}.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        }
    } else {
        alert('Screenshot functionality requires html2canvas library');
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
    
    initTennisTracker();
});

// Second shot tracking functions
function recordSecondShotMiss(shotType) {
    const isPlayer1Serving = currentMatch.currentServer === currentMatch.player1;
    
    if (shotType === 'server') {
        // Server missed their second shot
        if (isPlayer1Serving) {
            currentMatch.stats.player1.secondShotMissesServing++;
        } else {
            currentMatch.stats.player2.secondShotMissesServing++;
        }
    } else {
        // Returner missed their second shot
        if (isPlayer1Serving) {
            currentMatch.stats.player2.secondShotMissesReturning++;
        } else {
            currentMatch.stats.player1.secondShotMissesReturning++;
        }
    }
    
    // This will trigger updateSecondShotStats() via updateServeStats()
    updateServeStats();
}

function calculateSecondShotPercentage(misses, totalPoints) {
    if (totalPoints === 0) return 0.0;
    return ((misses / totalPoints) * 100);
}

function updateSecondShotStats() {
    const isPlayer1Serving = currentMatch.currentServer === currentMatch.player1;
    
    // Get current server and returner stats
    const serverStats = isPlayer1Serving ? currentMatch.stats.player1 : currentMatch.stats.player2;
    const returnerStats = isPlayer1Serving ? currentMatch.stats.player2 : currentMatch.stats.player1;
    
    // Calculate total serving points for current server
    const serverTotalPoints = serverStats.firstServeWins + serverStats.firstServeLosses + 
                             serverStats.secondServeWins + serverStats.secondServeLosses;
    
    // Calculate total returning points for current returner
    const returnerTotalPoints = returnerStats.firstServeWins + returnerStats.firstServeLosses + 
                               returnerStats.secondServeWins + returnerStats.secondServeLosses;
    
    // Calculate percentages
    const serverSecondShotPerc = calculateSecondShotPercentage(serverStats.secondShotMissesServing, serverTotalPoints);
    const returnerSecondShotPerc = calculateSecondShotPercentage(returnerStats.secondShotMissesReturning, returnerTotalPoints);
    
    // Update displays
    const serverPercentElement = document.getElementById('serverSecondShotPercent');
    const returnerPercentElement = document.getElementById('returnerSecondShotPercent');
    const serverCountElement = document.getElementById('serverSecondShotCount');
    const returnerCountElement = document.getElementById('returnerSecondShotCount');
    
    if (serverPercentElement) {
        serverPercentElement.textContent = `${serverSecondShotPerc.toFixed(1)}%`;
    }
    if (returnerPercentElement) {
        returnerPercentElement.textContent = `${returnerSecondShotPerc.toFixed(1)}%`;
    }
    if (serverCountElement) {
        serverCountElement.textContent = `${serverStats.secondShotMissesServing} misses`;
    }
    if (returnerCountElement) {
        returnerCountElement.textContent = `${returnerStats.secondShotMissesReturning} misses`;
    }
}

function generateSecondShotInsight(p1Stats, p2Stats, player1Name, player2Name) {
    const totalMisses = p1Stats.secondShotMissesServing + p1Stats.secondShotMissesReturning + 
                       p2Stats.secondShotMissesServing + p2Stats.secondShotMissesReturning;
    
    if (totalMisses === 0) {
        return "Outstanding match! No second shot errors from either player.";
    }
    
    // Find who had the most issues
    const p1Total = p1Stats.secondShotMissesServing + p1Stats.secondShotMissesReturning;
    const p2Total = p2Stats.secondShotMissesServing + p2Stats.secondShotMissesReturning;
    
    if (p1Total === p2Total) {
        return `Both players had ${totalMisses} second shot errors total. Focus on getting that crucial second ball in play!`;
    } else if (p1Total > p2Total) {
        return `${player1Name} struggled more with second shots (${p1Total} vs ${p2Total} misses). Work on consistency after serves and returns.`;
    } else {
        return `${player2Name} struggled more with second shots (${p2Total} vs ${p1Total} misses). Work on consistency after serves and returns.`;
    }
}
