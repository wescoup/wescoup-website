document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');

    if (calculateBtn) {
        calculateBtn.addEventListener('click', function() {
            // Player 1's Payoffs (Win %)
            const A = parseFloat(document.getElementById('p1_o1_vs_p2_o1').value) / 100;
            const B = parseFloat(document.getElementById('p1_o1_vs_p2_o2').value) / 100;
            const C = parseFloat(document.getElementById('p1_o2_vs_p2_o1').value) / 100;
            const D = parseFloat(document.getElementById('p1_o2_vs_p2_o2').value) / 100;

            // Player 2's Payoffs (Assumed to be the inverse of Player 1's for a zero-sum game)
            const A_prime = 1 - A;
            const B_prime = 1 - B;
            const C_prime = 1 - C;
            const D_prime = 1 - D;

            // Check for dominance first
            if ((A > C && B > D) || (A_prime > B_prime && C_prime > D_prime)) {
                alert("A pure strategy Nash Equilibrium exists. This calculator is for mixed strategies. Please check your inputs.");
                return;
            }


            // Calculate mixed strategy probabilities
            // Formula for Player 1's probability 'p' of choosing Option 1
            let p_num = D_prime - C_prime;
            let p_den = A_prime - B_prime - C_prime + D_prime;
            let p = p_den === 0 ? 0.5 : p_num / p_den; // Avoid division by zero

            // Formula for Player 2's probability 'q' of choosing Option 1
            let q_num = D - B;
            let q_den = A - B - C + D;
            let q = q_den === 0 ? 0.5 : q_num / q_den; // Avoid division by zero

            // Clamp probabilities between 0 and 1
            p = Math.max(0, Math.min(1, p));
            q = Math.max(0, Math.min(1, q));

            // Display results
            document.getElementById('p1-strategy').innerHTML = `Play Option 1: <strong>${(p * 100).toFixed(1)}%</strong> of the time<br>Play Option 2: <strong>${((1 - p) * 100).toFixed(1)}%</strong> of the time`;
            document.getElementById('p2-strategy').innerHTML = `Play Option 1: <strong>${(q * 100).toFixed(1)}%</strong> of the time<br>Play Option 2: <strong>${((1 - q) * 100).toFixed(1)}%</strong> of the time`;

            document.getElementById('results-container').style.display = 'block';
        });
    }
});
