// Global variables for dynamic content
let calculationData = {};
let allCalculations = [];
let currentView = 'options-setup';

document.addEventListener('DOMContentLoaded', init);

function init() {
    loadAllCalculations();
    updateScenarioDate();
    // Add default options for a 2x2 matrix on initial load
    addOption('player1');
    addOption('player2');
    // Add event listeners for input fields to trigger continuous updates
    document.querySelectorAll('#options-setup input').forEach(input => {
        input.addEventListener('input', updateAllViews);
    });
    updateOptionButtons();
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

function addOption() {
    const p1OptionsContainer = document.getElementById('player1-options-container');
    const p2OptionsContainer = document.getElementById('player2-options-container');
    const existingOptions = p1OptionsContainer.querySelectorAll('.option-group').length;

    if (existingOptions >= 6) {
        alert("You can only have up to 6 options per player.");
        return;
    }

    const newOptionNumber = existingOptions + 1;
    const p1OptionHtml = `
        <div class="option-group" id="player1-option-group-${newOptionNumber}">
            <label for="player1-option${newOptionNumber}">Option ${newOptionNumber}:</label>
            <input type="text" id="player1-option${newOptionNumber}" value="Option ${newOptionNumber}">
        </div>
    `;
    const p2OptionHtml = `
        <div class="option-group" id="player2-option-group-${newOptionNumber}">
            <label for="player2-option${newOptionNumber}">Option ${newOptionNumber}:</label>
            <input type="text" id="player2-option${newOptionNumber}" value="Response ${newOptionNumber}">
        </div>
    `;

    p1OptionsContainer.insertAdjacentHTML('beforeend', p1OptionHtml);
    p2OptionsContainer.insertAdjacentHTML('beforeend', p2OptionHtml);

    document.getElementById(`player1-option${newOptionNumber}`).addEventListener('input', updateAllViews);
    document.getElementById(`player2-option${newOptionNumber}`).addEventListener('input', updateAllViews);
    
    updateOptionButtons();
}

function removeOption() {
    const p1OptionsContainer = document.getElementById('player1-options-container');
    const p2OptionsContainer = document.getElementById('player2-options-container');
    const existingOptions = p1OptionsContainer.querySelectorAll('.option-group').length;

    if (existingOptions > 2) {
        const lastP1Option = document.getElementById(`player1-option-group-${existingOptions}`);
        const lastP2Option = document.getElementById(`player2-option-group-${existingOptions}`);
        lastP1Option.remove();
        lastP2Option.remove();
    }
    updateOptionButtons();
    updateAllViews();
}

function updateOptionButtons() {
    const p1OptionsContainer = document.getElementById('player1-options-container');
    const existingOptions = p1OptionsContainer.querySelectorAll('.option-group').length;
    const addBtn = document.getElementById('add-option-btn');
    const removeBtn = document.getElementById('remove-option-btn');

    if (existingOptions >= 6) {
        addBtn.disabled = true;
        addBtn.style.opacity = 0.5;
    } else {
        addBtn.disabled = false;
        addBtn.style.opacity = 1.0;
    }

    if (existingOptions <= 2) {
        removeBtn.disabled = true;
        removeBtn.style.opacity = 0.5;
    } else {
        removeBtn.disabled = false;
        removeBtn.style.opacity = 1.0;
    }
}

function getOptions(player) {
    const options = [];
    const optionsContainer = document.getElementById(`${player}-options-container`);
    const optionInputs = optionsContainer.querySelectorAll('input');
    optionInputs.forEach(input => {
        if (input.value) {
            options.push(input.value);
        }
    });
    return options;
}

function showMatrixView() {
    const p1Options = getOptions('player1');
    const p2Options = getOptions('player2');

    if (p1Options.length !== p2Options.length) {
        alert("The number of options for Player 1 and Player 2 must be the same.");
        showSection('options-setup');
        return;
    }

    const size = p1Options.length;
    let matrixHtml = `
        <table class="results-table" style="text-align:center; border-collapse:collapse;">
            <thead>
                <tr>
                    <th rowspan="2"></th>
                    <th rowspan="2"></th>
                    <th colspan="${size}">🔴 ${document.getElementById('player2-name').value || 'Player 2'}</th>
                </tr>
                <tr>
                    ${p2Options.map(opt => `<th>${opt}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${p1Options.map((p1Opt, i) => `
                    <tr>
                        ${i === 0 ? `<th rowspan="${size}">🔵 ${document.getElementById('player1-name').value || 'Player 1'}</th>` : ''}
                        <th>${p1Opt}</th>
                        ${p2Options.map((p2Opt, j) => `
                            <td><input type="number" id="payoff-${i}-${j}" class="form-control" value="0"></td>
                        `).join('')}
                    </tr>
                `).join('')}
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
    const p1Options = getOptions('player1');
    const p2Options = getOptions('player2');
    const size = p1Options.length;

    if (p1Options.length !== p2Options.length) {
        alert("The number of options for Player 1 and Player 2 must be the same.");
        showSection('options-setup');
        return;
    }

    const payoffs = [];
    for (let i = 0; i < size; i++) {
        payoffs[i] = [];
        for (let j = 0; j < size; j++) {
            payoffs[i][j] = parseFloat(document.getElementById(`payoff-${i}-${j}`).value || 0);
        }
    }
    
    const result = calculateNxNNash(payoffs, size);
    
    updateScenarioDate();

    calculationData = {
        id: calculationData.id || Date.now(),
        scenarioName: document.getElementById('scenario-name').value || 'My Strategy Scenario',
        date: document.getElementById('scenario-date').textContent,
        players: {
            player1: { name: document.getElementById('player1-name').value || 'Player 1', options: p1Options },
            player2: { name: document.getElementById('player2-name').value || 'Player 2', options: p2Options }
        },
        payoffs: payoffs,
        optimalStrategy: result
    };
    
    renderResults();
    showSection('results');
}

function calculateNxNNash(payoffs, size) {
    const p1_raw_strategies = new Array(size).fill(0);
    const p2_raw_strategies = new Array(size).fill(0);
    let p1_count = new Array(size).fill(0);
    let p2_count = new Array(size).fill(0);

    for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
            // Solve 2x2 for Player 1 options i and j
            const p1_2x2_payoffs = [
                [payoffs[i][i], payoffs[i][j]],
                [payoffs[j][i], payoffs[j][j]]
            ];
            const p1_result = solve2x2Nash(p1_2x2_payoffs);
            p1_raw_strategies[i] += p1_result.p;
            p1_raw_strategies[j] += p1_result.q;
            p1_count[i]++;
            p1_count[j]++;

            // Solve 2x2 for Player 2 options i and j
            const p2_2x2_payoffs = [
                [payoffs[i][i], payoffs[i][j]],
                [payoffs[j][i], payoffs[j][j]]
            ];
            const p2_result = solve2x2Nash(p2_2x2_payoffs);
            p2_raw_strategies[i] += p2_result.p_opponent;
            p2_raw_strategies[j] += p2_result.q_opponent;
            p2_count[i]++;
            p2_count[j]++;
        }
    }

    const p1_normalized = p1_raw_strategies.map((val, i) => val / p1_count[i] || 0);
    const p2_normalized = p2_raw_strategies.map((val, i) => val / p2_count[i] || 0);

    const p1_total = p1_normalized.reduce((sum, val) => sum + val, 0);
    const p2_total = p2_normalized.reduce((sum, val) => sum + val, 0);

    const player1 = {};
    const player2 = {};
    for (let i = 0; i < size; i++) {
        player1[`p${i+1}`] = ((p1_normalized[i] / p1_total) * 100).toFixed(1);
        player2[`q${i+1}`] = ((p2_normalized[i] / p2_total) * 100).toFixed(1);
    }
    
    return { player1, player2 };
}

function solve2x2Nash(payoffs) {
    const A = payoffs[0][0] / 100;
    const B = payoffs[0][1] / 100;
    const C = payoffs[1][0] / 100;
    const D = payoffs[1][1] / 100;
    const A_prime = 1 - A;
    const B_prime = 1 - B;
    const C_prime = 1 - C;
    const D_prime = 1 - D;

    let p_num = D_prime - C_prime;
    let p_den = A_prime - B_prime - C_prime + D_prime;
    let p = p_den === 0 ? 0.5 : p_num / p_den;
    p = Math.max(0, Math.min(1, p));

    let q_num = D - B;
    let q_den = A - B - C + D;
    let q = q_den === 0 ? 0.5 : q_num / q_den;
    q = Math.max(0, Math.min(1, q));
    
    return { p, q: 1 - p, p_opponent: q, q_opponent: 1 - q };
}


function renderOptionsAndMatrix() {
    const p1Options = getOptions('player1');
    const p2Options = getOptions('player2');
    const size = p1Options.length;
    const payoffs = [];
    for (let i = 0; i < size; i++) {
        payoffs[i] = [];
        for (let j = 0; j < size; j++) {
            payoffs[i][j] = parseFloat(document.getElementById(`payoff-${i}-${j}`)?.value || 0);
        }
    }

    // Update title
    document.getElementById('pdf-scenario-title').textContent = `${document.getElementById('scenario-name').value || 'My Strategy Scenario'} - ${document.getElementById('scenario-date').textContent}`;

    // Render Players & Options
    const playersHtml = `
        <div class="team-card team-1-bg">
            <h3 class="team-title-blue">🔵 ${document.getElementById('player1-name').value || 'Player 1'}</h3>
            ${p1Options.map((opt, i) => `<p><strong>Option ${i + 1}:</strong> ${opt}</p>`).join('')}
        </div>
        <div class="team-card team-2-bg">
            <h3 class="team-title-red">🔴 ${document.getElementById('player2-name').value || 'Player 2'}</h3>
            ${p2Options.map((opt, i) => `<p><strong>Option ${i + 1}:</strong> ${opt}</p>`).join('')}
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
                    <th colspan="${size}">🔴 ${document.getElementById('player2-name').value || 'Player 2'}</th>
                </tr>
                <tr>
                    ${p2Options.map(opt => `<th>${opt}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${p1Options.map((p1Opt, i) => `
                    <tr>
                        ${i === 0 ? `<th rowspan="${size}">🔵 ${document.getElementById('player1-name').value || 'Player 1'}</th>` : ''}
                        <th>${p1Opt}</th>
                        ${payoffs[i].map(payoff => `
                            <td><strong>${payoff}%</strong></td>
                        `).join('')}
                    </tr>
                `).join('')}
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
    
    let p1_html = '';
    let p2_html = '';
    for (let i = 0; i < p1.options.length; i++) {
        p1_html += `<p>${p1.options[i]}: <strong>${strat.player1[`p${i+1}`]}%</strong></p>`;
    }
    for (let i = 0; i < p2.options.length; i++) {
        p2_html += `<p>${p2.options[i]}: <strong>${strat.player2[`q${i+1}`]}%</strong></p>`;
    }

    const html = `
        <div class="row">
            <div class="col-md-6">
                <div class="result-card">
                    <h3>🔵 ${p1.name}'s Plan</h3>
                    ${p1_html}
                </div>
            </div>
            <div class="col-md-6">
                <div class="result-card">
                    <h3>🔴 ${p2.name}'s Plan</h3>
                    ${p2_html}
                </div>
            </div>
        </div>
        <p class="subtitle-text" style="text-align:center; margin-top:2rem; font-style: italic;">
          *Note: This calculator uses a simplified pairwise method to approximate the mixed strategy Nash Equilibrium.
        </p>
    `;
    resultsContainer.innerHTML = html;
}

function startNewCalculation() {
    calculationData = {};
    document.getElementById('scenario-name').value = 'My Strategy Scenario';
    updateScenarioDate();
    document.getElementById('player1-name').value = 'Player 1';
    document.getElementById('player2-name').value = 'Player 2';
    
    const p1OptionsContainer = document.getElementById('player1-options-container');
    const p2OptionsContainer = document.getElementById('player2-options-container');
    p1OptionsContainer.innerHTML = '';
    p2OptionsContainer.innerHTML = '';

    addOption();
    addOption();
    
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
    localStorage.setItem('NxNCalcs', JSON.stringify(allCalculations));
    alert('Calculation saved!');
    renderSavedCalcsList();
}

function showSavedCalcs() {
    renderSavedCalcsList();
    showSection('saved-calcs');
}

function loadAllCalculations() {
    const saved = localStorage.getItem('NxNCalcs');
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
            <p><b>P1 Options:</b> ${calc.players.player1.options.join(', ')}</p>
            <p><b>P2 Options:</b> ${calc.players.player2.options.join(', ')}</p>
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
        document.getElementById('player2-name').value = calcToLoad.players.player2.name;
        
        const p1OptionsContainer = document.getElementById('player1-options-container');
        p1OptionsContainer.innerHTML = '';
        calcToLoad.players.player1.options.forEach((opt, i) => {
            const newOptionHtml = `
                <div class="option-group" id="player1-option-group-${i+1}">
                    <label for="player1-option${i+1}">Option ${i+1}:</label>
                    <input type="text" id="player1-option${i+1}" value="${opt}">
                </div>
            `;
            p1OptionsContainer.insertAdjacentHTML('beforeend', newOptionHtml);
            document.getElementById(`player1-option${i+1}`).addEventListener('input', updateAllViews);
        });

        const p2OptionsContainer = document.getElementById('player2-options-container');
        p2OptionsContainer.innerHTML = '';
        calcToLoad.players.player2.options.forEach((opt, i) => {
            const newOptionHtml = `
                <div class="option-group" id="player2-option-group-${i+1}">
                    <label for="player2-option${i+1}">Option ${i+1}:</label>
                    <input type="text" id="player2-option${i+1}" value="${opt}">
                </div>
            `;
            p2OptionsContainer.insertAdjacentHTML('beforeend', newOptionHtml);
            document.getElementById(`player2-option${i+1}`).addEventListener('input', updateAllViews);
        });

        showMatrixView();
        const size = calcToLoad.players.player1.options.length;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                document.getElementById(`payoff-${i}-${j}`).value = calcToLoad.payoffs[i][j];
            }
        }
        
        renderResults();
        showSection('results');
    }
}

function deleteCalc(id) {
    if (confirm('Are you sure you want to delete this calculation?')) {
        allCalculations = allCalculations.filter(c => c.id !== id);
        localStorage.setItem('NxNCalcs', JSON.stringify(allCalculations));
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
    pdf.setFontSize(16).setTextColor(40, 40, 40).text("Tony's Strategy Calculator: NxN", pdfWidth / 2, margin, { align: 'center' });
    pdf.setFontSize(10).setTextColor(0, 0, 255).textWithLink('https://www.wescoup.com/tonys-strategy-calculator-NxN', pdfWidth / 2, margin + 5, { align: 'center', url: 'https://www.wescoup.com/tonys-strategy-calculator-NxN' });

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
