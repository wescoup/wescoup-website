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
            secondServeLosses: 0
        },
        player2: {
            firstServe: '',
            secondServe: '',
            firstServeWins: 0,
            firstServeLosses: 0,
            secondServeWins: 0,
            secondServeLosses: 0
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
    const serverSelect = document.getElementById('currentServer');
    //currentMatch.currentServer = serverSelect.value;
    currentMatch.currentServer = currentMatch.currentServer === 0 ? 1 : 0;
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

// Statistics functions
function updateStatsDisplay() {
    //showSection('results');
    
    // Calculate and display final statistics
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
    
    resultsContainer.innerHTML = `
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
                <div class="stat-label">${currentMatch.player2} - 1st Serve %</div>
                <div class="stat-value">${p2FirstServeInPerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 1st Serve Win %</div>
                <div class="stat-value">${p1FirstServePerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 1st Serve Win %</div>
                <div class="stat-value">${p2FirstServePerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 2nd Serve Win %</div>
                <div class="stat-value">${p1SecondServePerc}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 2nd Serve Win %</div>
                <div class="stat-value">${p2SecondServePerc}%</div>
            </div>
        </div>
        
        <h3 style="text-align: center; color: #FFE135; margin: 2rem 0;">Detailed Serve Data</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 1st Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p1Stats.firstServe || 'None'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 1st Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p2Stats.firstServe || 'None'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player1} - 2nd Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p1Stats.secondServe || 'None'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">${currentMatch.player2} - 2nd Serves</div>
                <div class="stat-value" style="font-size: 1rem; word-break: break-all;">${p2Stats.secondServe || 'None'}</div>
            </div>
        </div>
    `;
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
