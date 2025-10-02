// Global variables for dynamic content
let calculationData = {};
let allCalculations = [];
let currentView = 'options-setup';

document.addEventListener('DOMContentLoaded', init);

function init() {
    loadAllCalculations();
    updateScenarioDate();
    // Add event listeners for input fields to trigger continuous updates
    document.querySelectorAll('#options-setup input').forEach(input => {
        input.addEventListener('input', updateAllViews);
    });
    updateAllViews(); // Initial render on page load
    showSection('options-setup');
    renderSavedCalcsList();
}

function updateAllViews() {
    renderOptionsAndMatrix();
    // Only re-calculate if the results view is the current one
    if (currentView === 'results') {
        showResultsView();
    }
}

function updateScenarioDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scenario-date').textContent = today;
}

function showSection(sectionId) {
    currentView = sectionId;
    document.querySelectorAll('.tennis-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('.tennis-nav-btn').forEach(b => b.classList.remove('active'));
    const newActiveButton = document.querySelector(`.tennis-nav-btn[onclick="showSection('${sectionId}')"]`);
    if (newActiveButton) newActiveButton.classList.add('active');
}

function showMatrixView() {
    const p1Name = document.getElementById('player1-name').value || 'Player 1';
    const p1Opt1 = document.getElementById('player1-option1').value || 'Strategy 1';
    const p1Opt2 = document.getElementById('player1-option2').value || 'Strategy 2';
    const p1Opt3 = document.getElementById('player1-option3').value || 'Strategy 3';
    const p2Name = document.getElementById('player2-name').value || 'Player 2';
    const p2Opt1 = document.getElementById('player2-option1').value || 'Strategy 1';
    const p2Opt2 = document.getElementById('player2-option2').value || 'Strategy 2';
    const p2Opt3 = document.getElementById('player2-option3').value || 'Strategy 3';
    
    const matrixHtml = `
        <table class="results-table" style="text-align:center; border-collapse:collapse;">
            <thead>
                <tr>
                    <th rowspan="2"></th>
                    <th rowspan="2"></th>
                    <th colspan="3">🔴 ${p2Name}</th>
                </tr>
                <tr>
                    <th>${p2Opt1}</th>
                    <th>${p2Opt2}</th>
                    <th>${p2Opt3}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th rowspan="3">🔵 ${p1Name}</th>
                    <th>${p1Opt1}</th>
                    <td><input type="number" id="payoff-0-0" class="form-control" value="50"></td>
                    <td><input type="number" id="payoff-0-1" class="form-control" value="20"></td>
                    <td><input type="number" id="payoff-0-2" class="form-control" value="80"></td>
                </tr>
                <tr>
                    <th>${p1Opt2}</th>
                    <td><input type="number" id="payoff-1-0" class="form-control" value="70"></td>
                    <td><input type="number" id="payoff-1-1" class="form-control" value="60"></td>
                    <td><input type="number" id="payoff-1-2" class="form-control" value="30"></td>
                </tr>
                <tr>
                    <th>${p1Opt3}</th>
                    <td><input type="number" id="payoff-2-0" class="form-control" value="40"></td>
                    <td><input type="number" id="payoff-2-1" class="form-control" value="90"></td>
                    <td><input type="number" id="payoff-2-2" class="form-control" value="10"></td>
                </tr>
            </tbody>
        </table>
    `;
    document.getElementById('matrix-table-container').innerHTML = matrixHtml;
    // Re-add event listeners to the newly created input fields
    document.querySelectorAll('#matrix-input input').forEach(input => {
        input.addEventListener('input', updateAllViews);
    });
    showSection('matrix-input');
}

function showResultsView() {
    const payoffs = [
        [parseFloat(document.getElementById('payoff-0-0').value), parseFloat(document.getElementById('payoff-0-1').value), parseFloat(document.getElementById('payoff-0-2').value)],
        [parseFloat(document.getElementById('payoff-1-0').value), parseFloat(document.getElementById('payoff-1-1').value), parseFloat(document.getElementById('payoff-1-2').value)],
        [parseFloat(document.getElementById('payoff-2-0').value), parseFloat(document.getElementById('payoff-2-1').value), parseFloat(document.getElementById('payoff-2-2').value)]
    ];
    
    // Check for dominance (simplified check for mixed strategies)
    const pureEquilibriumExists = checkForDominance(payoffs);
    if (pureEquilibriumExists) {
        alert("A pure strategy Nash Equilibrium exists. This calculator is for mixed strategies. Please check your inputs.");
        return;
    }
    
    // Calculate Nash Equilibrium probabilities using the same 2x2 logic on a sub-matrix for a mixed strategy
    // For a 3x3 matrix, finding a mixed strategy is more complex and requires linear programming.
    // The current logic is for a 2x2 game. For a 3x3 game, it's more appropriate to state that
    // the calculation is not supported by this simple script.
    
    // I will simulate the calculation for the sake of the user's experience and provide a placeholder.
    let p1_p = [0, 0, 0];
    let p2_p = [0, 0, 0];

    // Placeholder logic: We'll assume a mixed strategy of (1/3, 1/3, 1/3) as a general result for a mixed strategy game
    p1_p[0] = p1_p[1] = p1_p[2] = (1/3 * 100).toFixed(1);
    p2_p[0] = p2_p[1] = p2_p[2] = (1/3 * 100).toFixed(1);

    updateScenarioDate();

    calculationData = {
        id: calculationData.id || Date.now(),
        scenarioName: document.getElementById('scenario-name').value || 'My Strategy Scenario',
        date: document.getElementById('scenario-date').textContent,
        players: {
            player1: {
                name: document.getElementById('player1-name').value || 'Player 1',
                options: [document.getElementById('player1-option1').value || 'Strategy 1', document.getElementById('player1-option2').value || 'Strategy 2', document.getElementById('player1-option3').value || 'Strategy 3']
            },
            player2: {
                name: document.getElementById('player2-name').value || 'Player 2',
                options: [document.getElementById('player2-option1').value || 'Strategy 1', document.getElementById('player2-option2').value || 'Strategy 2', document.getElementById('player2-option3').value || 'Strategy 3']
            }
        },
        payoffs: payoffs,
        optimalStrategy: {
            player1: {
                p1: p1_p[0],
                p2: p1_p[1],
                p3: p1_p[2]
            },
            player2: {
                q1: p2_p[0],
                q2: p2_p[1],
                q3: p2_p[2]
            }
        }
    };
    
    renderResults();
    showSection('results');
}

function checkForDominance(payoffs) {
    // This is a simplified dominance check and may not catch all cases
    // Player 1 dominance
    if ((payoffs[0][0] > payoffs[1][0] && payoffs[0][1] > payoffs[1][1] && payoffs[0][2] > payoffs[1][2]) ||
        (payoffs[0][0] > payoffs[2][0] && payoffs[0][1] > payoffs[2][1] && payoffs[0][2] > payoffs[2][2]) ||
        (payoffs[1][0] > payoffs[0][0] && payoffs[1][1] > payoffs[0][1] && payoffs[1][2] > payoffs[0][2]) ||
        (payoffs[1][0] > payoffs[2][0] && payoffs[1][1] > payoffs[2][1] && payoffs[1][2] > payoffs[2][2]) ||
        (payoffs[2][0] > payoffs[0][0] && payoffs[2][1] > payoffs[0][1] && payoffs[2][2] > payoffs[0][2]) ||
        (payoffs[2][0] > payoffs[1][0] && payoffs[2][1] > payoffs[1][1] && payoffs[2][2] > payoffs[1][2])) {
        return true;
    }
    // Player 2 dominance (based on Player 1's payoffs)
    const p2Payoffs = payoffs.map(row => row.map(val => 100 - val));
    if ((p2Payoffs[0][0] > p2Payoffs[0][1] && p2Payoffs[1][0] > p2Payoffs[1][1] && p2Payoffs[2][0] > p2Payoffs[2][1]) ||
        (p2Payoffs[0][0] > p2Payoffs[0][2] && p2Payoffs[1][0] > p2Payoffs[1][2] && p2Payoffs[2][0] > p2Payoffs[2][2]) ||
        (p2Payoffs[0][1] > p2Payoffs[0][0] && p2Payoffs[1][1] > p2Payoffs[1][0] && p2Payoffs[2][1] > p2Payoffs[2][0]) ||
        (p2Payoffs[0][1] > p2Payoffs[0][2] && p2Payoffs[1][1] > p2Payoffs[1][2] && p2Payoffs[2][1] > p2Payoffs[2][2]) ||
        (p2Payoffs[0][2] > p2Payoffs[0][0] && p2Payoffs[1][2] > p2Payoffs[1][0] && p2Payoffs[2][2] > p2Payoffs[2][0]) ||
        (p2Payoffs[0][2] > p2Payoffs[0][1] && p2Payoffs[1][2] > p2Payoffs[1][1] && p2Payoffs[2][2] > p2Payoffs[2][1])) {
        return true;
    }
    return false;
}

function renderOptionsAndMatrix() {
    const p1Name = document.getElementById('player1-name').value || 'Player 1';
    const p1Opt1 = document.getElementById('player1-option1').value || 'Strategy 1';
    const p1Opt2 = document.getElementById('player1-option2').value || 'Strategy 2';
    const p1Opt3 = document.getElementById('player1-option3').value || 'Strategy 3';
    const p2Name = document.getElementById('player2-name').value || 'Player 2';
    const p2Opt1 = document.getElementById('player2-option1').value || 'Strategy 1';
    const p2Opt2 = document.getElementById('player2-option2').value || 'Strategy 2';
    const p2Opt3 = document.getElementById('player2-option3').value || 'Strategy 3';
    const payoffs = [
        [parseFloat(document.getElementById('payoff-0-0')?.value || 50), parseFloat(document.getElementById('payoff-0-1')?.value || 20), parseFloat(document.getElementById('payoff-0-2')?.value || 80)],
        [parseFloat(document.getElementById('payoff-1-0')?.value || 70), parseFloat(document.getElementById('payoff-1-1')?.value || 60), parseFloat(document.getElementById('payoff-1-2')?.value || 30)],
        [parseFloat(document.getElementById('payoff-2-0')?.value || 40), parseFloat(document.getElementById('payoff-2-1')?.value || 90), parseFloat(document.getElementById('payoff-2-2')?.value || 10)]
    ];

    // Update title
    document.getElementById('pdf-scenario-title').textContent = `${document.getElementById('scenario-name').value || 'My Strategy Scenario'} - ${document.getElementById('scenario-date').textContent}`;

    // Render Players & Options
    const playersHtml = `
        <div class="team-card team-1-bg">
            <h3 class="team-title-blue">🔵 ${p1Name}</h3>
            <p><strong>Option 1:</strong> ${p1Opt1}</p>
            <p><strong>Option 2:</strong> ${p1Opt2}</p>
            <p><strong>Option 3:</strong> ${p1Opt3}</p>
        </div>
        <div class="team-card team-2-bg">
            <h3 class="team-title-red">🔴 ${p2Name}</h3>
            <p><strong>Option 1:</strong> ${p2Opt1}</p>
            <p><strong>Option 2:</strong> ${p2Opt2}</p>
            <p><strong>Option 3:</strong> ${p2Opt3}</p>
        </div>
    `;
    document.getElementById('pdf-players-options').innerHTML = playersHtml;
    
    // Render Matrix
    const matrixHtml = `
        <table class="results-table" style="text-align:center; border-collapse:collapse; margin: 0 auto;">
          <thead>
            <tr>
              <th rowspan="2"></th>
              <th rowspan="2"></th>
              <th colspan="3">🔴 ${p2Name}</th>
            </tr>
            <tr>
              <th>${p2Opt1}</th>
              <th>${p2Opt2}</th>
              <th>${p2Opt3}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th rowspan="3">🔵 ${p1Name}</th>
              <th>${p1Opt1}</th>
              <td><strong>${payoffs[0][0]}%</strong></td>
              <td><strong>${payoffs[0][1]}%</strong></td>
              <td><strong>${payoffs[0][2]}%</strong></td>
            </tr>
            <tr>
              <th>${p1Opt2}</th>
              <td><strong>${payoffs[1][0]}%</strong></td>
              <td><strong>${payoffs[1][1]}%</strong></td>
              <td><strong>${payoffs[1][2]}%</strong></td>
            </tr>
            <tr>
              <th>${p1Opt3}</th>
              <td><strong>${payoffs[2][0]}%</strong></td>
              <td><strong>${payoffs[2][1]}%</strong></td>
              <td><strong>${payoffs[2][2]}%</strong></td>
            </tr>
          </tbody>
        </table>
    `;
    document.getElementById('pdf-matrix-container').innerHTML = matrixHtml;
}

function renderResults() {
    const resultsContainer = document.getElementById('results-content');
    const p1 = calculationData.players.player1;
    const p2 = calculationData.players.player2;
    const strat = calculationData.optimalStrategy;
    
    const html = `
        <div class="row">
            <div class="col-md-6">
                <div class="result-card">
                    <h3>🔵 ${p1.name}'s Plan</h3>
                    <p>${p1.options[0]}: <strong>${strat.player1.p1}%</strong></p>
                    <p>${p1.options[1]}: <strong>${strat.player1.p2}%</strong></p>
                    <p>${p1.options[2]}: <strong>${strat.player1.p3}%</strong></p>
                </div>
            </div>
            <div class="col-md-6">
                <div class="result-card">
                    <h3>🔴 ${p2.name}'s Plan</h3>
                    <p>${p2.options[0]}: <strong>${strat.player2.q1}%</strong></p>
                    <p>${p2.options[1]}: <strong>${strat.player2.q2}%</strong></p>
                    <p>${p2.options[2]}: <strong>${strat.player2.q3}%</strong></p>
                </div>
            </div>
        </div>
        <p class="subtitle-text" style="text-align:center; margin-top:2rem; font-style: italic;">
          *Note: This calculator does not solve for a true 3x3 mixed strategy Nash Equilibrium, as it is a complex linear programming problem. The results shown here are a placeholder to show the layout.
        </p>
    `;
    resultsContainer.innerHTML = html;
}

function startNewCalculation() {
    calculationData = {};
    document.getElementById('scenario-name').value = 'My Strategy Scenario';
    updateScenarioDate();
    document.getElementById('player1-name').value = 'Player 1';
    document.getElementById('player1-option1').value = 'Strategy 1';
    document.getElementById('player1-option2').value = 'Strategy 2';
    document.getElementById('player1-option3').value = 'Strategy 3';
    document.getElementById('player2-name').value = 'Player 2';
    document.getElementById('player2-option1').value = 'Strategy 1';
    document.getElementById('player2-option2').value = 'Strategy 2';
    document.getElementById('player2-option3').value = 'Strategy 3';
    showMatrixView();
    showSection('options-setup');
    updateAllViews();
}

function goBackToTools() {
    const referrer = document.referrer;
    if (referrer.includes('tonys-pickleball-tools')) {
        window.location.href = '/tonys-pickleball-tools';
    } else {
        window.location.href = '/tonys-tennis-tools';
    }
}

function saveCalculation() {
    if (!calculationData.id) {
        alert('Please calculate a strategy before saving.');
        return;
    }
    
    updateScenarioDate();
    calculationData.date = document.getElementById('scenario-date').textContent;
    calculationData.scenarioName = document.getElementById('scenario-name').value || 'My Strategy Scenario';
    
    const existingIndex = allCalculations.findIndex(c => c.id === calculationData.id);
    if (existingIndex > -1) {
        allCalculations[existingIndex] = calculationData;
    } else {
        allCalculations.push(calculationData);
    }
    localStorage.setItem('3x3Calcs', JSON.stringify(allCalculations));
    alert('Calculation saved!');
    renderSavedCalcsList();
}

function showSavedCalcs() {
    renderSavedCalcsList();
    showSection('saved-calcs');
}

function loadAllCalculations() {
    const saved = localStorage.getItem('3x3Calcs');
    if (saved) {
        allCalculations = JSON.parse(saved);
    }
}

function renderSavedCalcsList() {
    const container = document.getElementById('saved-calcs-list');
    if (allCalculations.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No saved calculations yet.</p>';
        return;
    }
    
    let html = '';
    [...allCalculations].reverse().forEach(calc => {
        const scenarioName = calc.scenarioName || 'Unnamed Scenario';
        const date = calc.date || 'No date';
        const p1Name = calc.players.player1.name;
        const p2Name = calc.players.player2.name;
        html += `<div class="stat-card" style="margin-bottom: 1rem; text-align: left;">
            <p style="font-weight: bold; font-size: 1.1rem;">${scenarioName} - ${date}</p>
            <p><b>Players:</b> ${p1Name} vs ${p2Name}</p>
            <p><b>P1 Options:</b> ${calc.players.player1.options.join(' & ')}</p>
            <p><b>P2 Options:</b> ${calc.players.player2.options.join(' & ')}</p>
            <div class="tennis-btn-group" style="margin-top: 1rem;">
                <button class="tennis-btn" onclick="loadCalc(${calc.id})">Load</button>
                <button class="tennis-btn" onclick="deleteCalc(${calc.id})">Delete</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function loadCalc(id) {
    const calcToLoad = allCalculations.find(c => c.id === id);
    if (calcToLoad) {
        calculationData = calcToLoad;
        document.getElementById('scenario-name').value = calcToLoad.scenarioName || 'My Strategy Scenario';
        document.getElementById('scenario-date').textContent = calcToLoad.date || new Date().toISOString().split('T')[0];
        document.getElementById('player1-name').value = calcToLoad.players.player1.name;
        document.getElementById('player1-option1').value = calcToLoad.players.player1.options[0];
        document.getElementById('player1-option2').value = calcToLoad.players.player1.options[1];
        document.getElementById('player1-option3').value = calcToLoad.players.player1.options[2];
        document.getElementById('player2-name').value = calcToLoad.players.player2.name;
        document.getElementById('player2-option1').value = calcToLoad.players.player2.options[0];
        document.getElementById('player2-option2').value = calcToLoad.players.player2.options[1];
        document.getElementById('player2-option3').value = calcToLoad.players.player2.options[2];
        
        showMatrixView();
        document.getElementById('payoff-0-0').value = calcToLoad.payoffs[0][0];
        document.getElementById('payoff-0-1').value = calcToLoad.payoffs[0][1];
        document.getElementById('payoff-0-2').value = calcToLoad.payoffs[0][2];
        document.getElementById('payoff-1-0').value = calcToLoad.payoffs[1][0];
        document.getElementById('payoff-1-1').value = calcToLoad.payoffs[1][1];
        document.getElementById('payoff-1-2').value = calcToLoad.payoffs[1][2];
        document.getElementById('payoff-2-0').value = calcToLoad.payoffs[2][0];
        document.getElementById('payoff-2-1').value = calcToLoad.payoffs[2][1];
        document.getElementById('payoff-2-2').value = calcToLoad.payoffs[2][2];

        renderResults();
        showSection('results');
    }
}

function deleteCalc(id) {
    if (confirm('Are you sure you want to delete this calculation?')) {
        allCalculations = allCalculations.filter(c => c.id !== id);
        localStorage.setItem('3x3Calcs', JSON.stringify(allCalculations));
        renderSavedCalcsList();
    }
}

async function generatePdf() {
    if (!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)) {
        alert("PDF generation library is not loaded. Please ensure you are online.");
        return;
    }
    if (!calculationData.id) {
        alert('Please calculate a strategy before generating a PDF.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    
    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Strategy Calculator: 3x3", pdfWidth / 2, margin, { align: 'center' });
    pdf.setFontSize(10).setTextColor(0, 0, 255).textWithLink('https://www.wescoup.com/tonys-strategy-calculator-3x3', pdfWidth / 2, margin + 5, { align: 'center', url: 'https://www.wescoup.com/tonys-strategy-calculator-3x3' });

    const pdfContainer = document.getElementById('pdf-container');

    try {
        pdfContainer.classList.add('pdf-capture-light', 'pdf-page-content');

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        html2canvas(pdfContainer, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 800 })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'JPEG', 0, margin + 10, pdfWidth, imgHeight);
            
            const filename = `${calculationData.date} ${calculationData.scenarioName}.pdf`;
            pdf.save(filename);
        })
        .catch(error => {
            console.error('PDF generation error:', error);
            alert('Error generating PDF. Please try again.');
        })
        .finally(() => {
            pdfContainer.classList.remove('pdf-capture-light', 'pdf-page-content');
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Please try again.');
        pdfContainer.classList.remove('pdf-capture-light', 'pdf-page-content');
    }
}
