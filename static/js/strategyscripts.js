//Claude, use this file for the strategy calculators.
//We will start with the 2x2, which we are currently working on.
//We will then do the 3x3 and the NxN

// Global variables for dynamic content
let calculationData = {};
let allCalculations = [];
let currentView = 'options-setup';

document.addEventListener('DOMContentLoaded', init);

function init() {
    loadAllCalculations();
    updateScenarioDate();
    // Add event listeners for input fields to trigger continuous updates
    document.querySelectorAll('#options-setup input, #matrix-input input').forEach(input => {
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
    const p1Opt1 = document.getElementById('player1-option1').value || 'Serve Wide';
    const p1Opt2 = document.getElementById('player1-option2').value || 'Serve T';
    const p2Name = document.getElementById('player2-name').value || 'Player 2';
    const p2Opt1 = document.getElementById('player2-option1').value || 'Cover Wide';
    const p2Opt2 = document.getElementById('player2-option2').value || 'Cover T';
    
    const matrixHtml = `
        <table class="results-table" style="text-align:center; border-collapse:collapse;">
          <thead>
            <tr>
              <th rowspan="2"></th>
              <th rowspan="2"></th>
              <th colspan="2">🔴 ${p2Name}</th>
            </tr>
            <tr>
              <th>${p2Opt1}</th>
              <th>${p2Opt2}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th rowspan="2">🔵 ${p1Name}</th>
              <th>${p1Opt1}</th>
              <td><input type="number" id="payoff-0-0" class="form-control" value="45"></td>
              <td><input type="number" id="payoff-0-1" class="form-control" value="70"></td>
            </tr>
            <tr>
              <th>${p1Opt2}</th>
              <td><input type="number" id="payoff-1-0" class="form-control" value="65"></td>
              <td><input type="number" id="payoff-1-1" class="form-control" value="30"></td>
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
    const p1Name = document.getElementById('player1-name').value || 'Player 1';
    const p1Opt1 = document.getElementById('player1-option1').value || 'Serve Wide';
    const p1Opt2 = document.getElementById('player1-option2').value || 'Serve T';
    const p2Name = document.getElementById('player2-name').value || 'Player 2';
    const p2Opt1 = document.getElementById('player2-option1').value || 'Cover Wide';
    const p2Opt2 = document.getElementById('player2-option2').value || 'Cover T';

    const payoffs = [
        [parseFloat(document.getElementById('payoff-0-0').value), parseFloat(document.getElementById('payoff-0-1').value)],
        [parseFloat(document.getElementById('payoff-1-0').value), parseFloat(document.getElementById('payoff-1-1').value)]
    ];
    
    // Check for dominance
    const A = payoffs[0][0] / 100;
    const B = payoffs[0][1] / 100;
    const C = payoffs[1][0] / 100;
    const D = payoffs[1][1] / 100;
    const A_prime = 1 - A;
    const B_prime = 1 - B;
    const C_prime = 1 - C;
    const D_prime = 1 - D;

    if ((A > C && B > D) || (A_prime > B_prime && C_prime > D_prime)) {
        alert("A pure strategy Nash Equilibrium exists. This calculator is for mixed strategies. Please check your inputs.");
        return;
    }
    
    // Calculate Nash Equilibrium probabilities
    let p_num = D_prime - C_prime;
    let p_den = A_prime - B_prime - C_prime + D_prime;
    let p = p_den === 0 ? 0.5 : p_num / p_den;
    p = Math.max(0, Math.min(1, p));

    let q_num = D - B;
    let q_den = A - B - C + D;
    let q = q_den === 0 ? 0.5 : q_num / q_den;
    q = Math.max(0, Math.min(1, q));

    // Update scenario date to current date (auto-update on recalculation)
    updateScenarioDate();

    calculationData = {
        id: calculationData.id || Date.now(),
        scenarioName: document.getElementById('scenario-name').value || 'My Strategy Scenario',
        date: document.getElementById('scenario-date').textContent,
        players: {
            player1: {
                name: p1Name,
                options: [p1Opt1, p1Opt2]
            },
            player2: {
                name: p2Name,
                options: [p2Opt1, p2Opt2]
            }
        },
        payoffs: payoffs,
        optimalStrategy: {
            player1: {
                p1: (p * 100).toFixed(1),
                p2: ((1 - p) * 100).toFixed(1)
            },
            player2: {
                q1: (q * 100).toFixed(1),
                q2: ((1 - q) * 100).toFixed(1)
            }
        }
    };
    
    renderResults();
    showSection('results');
}

function renderOptionsAndMatrix() {
    const p1Name = document.getElementById('player1-name').value || 'Player 1';
    const p1Opt1 = document.getElementById('player1-option1').value || 'Serve Wide';
    const p1Opt2 = document.getElementById('player1-option2').value || 'Serve T';
    const p2Name = document.getElementById('player2-name').value || 'Player 2';
    const p2Opt1 = document.getElementById('player2-option1').value || 'Cover Wide';
    const p2Opt2 = document.getElementById('player2-option2').value || 'Cover T';
    const payoffs = [
        [parseFloat(document.getElementById('payoff-0-0')?.value || 45), parseFloat(document.getElementById('payoff-0-1')?.value || 70)],
        [parseFloat(document.getElementById('payoff-1-0')?.value || 65), parseFloat(document.getElementById('payoff-1-1')?.value || 30)]
    ];

    // Update title
    document.getElementById('pdf-scenario-title').textContent = `${document.getElementById('scenario-name').value || 'My Strategy Scenario'} - ${document.getElementById('scenario-date').textContent}`;

    // Render Players & Options
    const playersHtml = `
        <div class="team-card team-1-bg">
            <h3 class="team-title-blue">🔵 ${p1Name}</h3>
            <p><strong>Option 1:</strong> ${p1Opt1}</p>
            <p><strong>Option 2:</strong> ${p1Opt2}</p>
        </div>
        <div class="team-card team-2-bg">
            <h3 class="team-title-red">🔴 ${p2Name}</h3>
            <p><strong>Option 1:</strong> ${p2Opt1}</p>
            <p><strong>Option 2:</strong> ${p2Opt2}</p>
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
              <th colspan="2">🔴 ${p2Name}</th>
            </tr>
            <tr>
              <th>${p2Opt1}</th>
              <th>${p2Opt2}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th rowspan="2">🔵 ${p1Name}</th>
              <th>${p1Opt1}</th>
              <td><strong>${payoffs[0][0]}%</strong></td>
              <td><strong>${payoffs[0][1]}%</strong></td>
            </tr>
            <tr>
              <th>${p1Opt2}</th>
              <td><strong>${payoffs[1][0]}%</strong></td>
              <td><strong>${payoffs[1][1]}%</strong></td>
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
                </div>
            </div>
            <div class="col-md-6">
                <div class="result-card">
                    <h3>🔴 ${p2.name}'s Plan</h3>
                    <p>${p2.options[0]}: <strong>${strat.player2.q1}%</strong></p>
                    <p>${p2.options[1]}: <strong>${strat.player2.q2}%</strong></p>
                </div>
            </div>
        </div>
    `;
    resultsContainer.innerHTML = html;
}

function startNewCalculation() {
    calculationData = {};
    document.getElementById('scenario-name').value = 'My Strategy Scenario';
    updateScenarioDate();
    document.getElementById('player1-name').value = 'Player 1';
    document.getElementById('player1-option1').value = 'Serve Wide';
    document.getElementById('player1-option2').value = 'Serve T';
    document.getElementById('player2-name').value = 'Player 2';
    document.getElementById('player2-option1').value = 'Cover Wide';
    document.getElementById('player2-option2').value = 'Cover T';
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
    
    // Update date to current date on save
    updateScenarioDate();
    calculationData.date = document.getElementById('scenario-date').textContent;
    calculationData.scenarioName = document.getElementById('scenario-name').value || 'My Strategy Scenario';
    
    const existingIndex = allCalculations.findIndex(c => c.id === calculationData.id);
    if (existingIndex > -1) {
        allCalculations[existingIndex] = calculationData;
    } else {
        allCalculations.push(calculationData);
    }
    localStorage.setItem('2x2Calcs', JSON.stringify(allCalculations));
    alert('Calculation saved!');
    renderSavedCalcsList();
}

function showSavedCalcs() {
    renderSavedCalcsList();
    showSection('saved-calcs');
}

function loadAllCalculations() {
    const saved = localStorage.getItem('2x2Calcs');
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
    // Reverse to show newest first
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
        document.getElementById('player2-name').value = calcToLoad.players.player2.name;
        document.getElementById('player2-option1').value = calcToLoad.players.player2.options[0];
        document.getElementById('player2-option2').value = calcToLoad.players.player2.options[1];
        
        // Render matrix and fill with loaded data
        showMatrixView();
        document.getElementById('payoff-0-0').value = calcToLoad.payoffs[0][0];
        document.getElementById('payoff-0-1').value = calcToLoad.payoffs[0][1];
        document.getElementById('payoff-1-0').value = calcToLoad.payoffs[1][0];
        document.getElementById('payoff-1-1').value = calcToLoad.payoffs[1][1];

        renderResults();
        showSection('results');
    }
}

function deleteCalc(id) {
    if (confirm('Are you sure you want to delete this calculation?')) {
        allCalculations = allCalculations.filter(c => c.id !== id);
        localStorage.setItem('2x2Calcs', JSON.stringify(allCalculations));
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
    
    // Add title and link
    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Strategy Calculator: 2x2", pdfWidth / 2, margin, { align: 'center' });
    pdf.setFontSize(10).setTextColor(0, 0, 255).textWithLink('https://www.wescoup.com/tonys-strategy-calculator-2x2', pdfWidth / 2, margin + 5, { align: 'center', url: 'https://www.wescoup.com/tonys-strategy-calculator-2x2' });

    const pdfContainer = document.getElementById('pdf-container');

    try {
        // Add PDF-specific styling for proper rendering
        pdfContainer.classList.add('pdf-capture-light', 'pdf-page-content');

        // Wait for the DOM to update and render
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        html2canvas(pdfContainer, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 800 })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'JPEG', 0, margin + 10, pdfWidth, imgHeight);
            
            // Save with formatted filename: "2025-01-01 Scenario Name.pdf"
            const filename = `${calculationData.date} ${calculationData.scenarioName}.pdf`;
            pdf.save(filename);
        })
        .catch(error => {
            console.error('PDF generation error:', error);
            alert('Error generating PDF. Please try again.');
        })
        .finally(() => {
            // Restore original UI
            pdfContainer.classList.remove('pdf-capture-light', 'pdf-page-content');
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Please try again.');
        // Ensure UI is restored even if initial setup fails
        pdfContainer.classList.remove('pdf-capture-light', 'pdf-page-content');
    }
}
