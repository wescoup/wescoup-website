document.addEventListener('DOMContentLoaded', () => {
    
    // --- LOBBY LOGIC (Unchanged) ---
    const createBtn = document.getElementById('create-game-btn');
    if (createBtn) {
        // ... (existing lobby code remains unchanged) ...
        const socket = io();
        const joinBtn = document.getElementById('join-game-btn');
        const codeInput = document.getElementById('game-code-input');
        
        // Modal elements
        const modal = document.getElementById('invitationModal');
        const invitationTextEl = document.getElementById('invitation-text');
        const copyInvitationBtn = document.getElementById('copy-invitation-btn');
        const goToGameBtn = document.getElementById('go-to-game-btn');
        let gameRoomUrl = ''; // To store the URL for the "Go to Game" button

        // 1. Handle Game Creation
        createBtn.addEventListener('click', () => {
            console.log('Emitting create_game');
            createBtn.disabled = true;
            createBtn.innerText = 'Creating...';
            socket.emit('create_game');
        });

        // 2. Listen for game_created
        socket.on('game_created', (data) => {
            console.log('Game created:', data);
            const roomCode = data.room_code;
            gameRoomUrl = `${window.location.origin}/war/game/${roomCode}`; 
            
            const invitationMessage = `Let's play War!\n\nJoin Link: ${gameRoomUrl}\n\nOr go to ${window.location.origin}/war/new and enter code: ${roomCode}`;
            
            invitationTextEl.textContent = invitationMessage;
            modal.style.display = "block";
            createBtn.disabled = false;
            createBtn.innerText = 'Create Game';
        });

        // 3. Handle Joining by Code
        joinBtn.addEventListener('click', () => {
            const code = codeInput.value.trim().toLowerCase();
            if (code) {
                window.location.href = `/war/game/${code}`;
            } else {
                alert('Please enter a game code.');
            }
        });

        // 4. Modal Button Actions
        copyInvitationBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(invitationTextEl.textContent).then(() => {
                alert('Invitation copied to clipboard!');
            }, (err) => {
                alert('Failed to copy. Please copy manually.');
            });
        });

        goToGameBtn.addEventListener('click', () => {
            if (gameRoomUrl) {
                window.location.href = gameRoomUrl;
            }
        });

        window.onclick = function(event) {
            if (event.target == modal) {
                 if (gameRoomUrl) {
                     window.location.href = gameRoomUrl; 
                 }
            }
        }
    }

    // --- NEW 2-PLAYER GAME LOGIC ---
    const gameBoard = document.getElementById('war-game-board');
    if (gameBoard) {
        const socket = io();
        const roomCode = gameBoard.dataset.roomCode;

        // --- Element Refs ---
        const p0CountEl = document.getElementById('player-0-count');
        const p1CountEl = document.getElementById('player-1-count');
        const p0PileEl = document.getElementById('player-0-play-pile');
        const p1PileEl = document.getElementById('player-1-play-pile');
        const p0WarPileEl = document.getElementById('player-0-war-pile');
        const p1WarPileEl = document.getElementById('player-1-war-pile');
        const messageEl = document.getElementById('game-message-multi');
        const speedDisplayEl = document.getElementById('speed-display');
        const speedUpBtn = document.getElementById('speed-up-btn');
        const speedDownBtn = document.getElementById('speed-down-btn');
        const p0NameEl = document.getElementById('player-0-name');
        const p1NameEl = document.getElementById('player-1-name');
        const startBtn = document.getElementById('start-game-btn');
        
        // *** ADDED: Stat Element Refs ***
        // Player 0 Stats
        const p0AcesEl = document.getElementById('player-0-aces');
        const p0KingsEl = document.getElementById('player-0-kings');
        const p0WarsWonEl = document.getElementById('player-0-wars-won');
        const p0RecycleEl = document.getElementById('player-0-recycle');
        const p0HandsWonEl = document.getElementById('player-0-hands-won');
        const p0WinPctEl = document.getElementById('player-0-win-pct');
        // Player 1 Stats
        const p1AcesEl = document.getElementById('player-1-aces');
        const p1KingsEl = document.getElementById('player-1-kings');
        const p1WarsWonEl = document.getElementById('player-1-wars-won');
        const p1RecycleEl = document.getElementById('player-1-recycle');
        const p1HandsWonEl = document.getElementById('player-1-hands-won');
        const p1WinPctEl = document.getElementById('player-1-win-pct');
        
        let thisPlayerIndex = 0; // Will be 0 or 1
        let isProcessingUpdate = false; // Flag to prevent overlaps

        // --- Constants for delays ---
        const BASE_PACE_DURATION = 500; // General pace for card reveals
        const DRAMATIC_PAUSE_DURATION = 1000; // Pause for Ace/King

        // --- Helper Functions (Unchanged) ---
        const sleep = (ms) => new Promise(res => setTimeout(res, ms));
        function createCardHTML(card) { /* ... */ }
        function createCardElement(card, staggerIndex = -1) { /* ... */ }
        async function checkAndPause(card, cardEl, defaultDelay) { /* ... */ }
        
        // (Helper function implementations are assumed to be here from previous steps)
        // Example:
        function createCardHTML(card) {
            const colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
            const displayValue = card.value; 
            return `<div class="card ${colorClass}">
                        <span class="card-value">${displayValue}</span>
                        <span class="card-suit">${card.suit}</span>
                    </div>`;
        }

        function createCardElement(card, staggerIndex = -1) {
            const cardElHTML = createCardHTML(card);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardElHTML;
            const cardEl = tempDiv.firstChild;

            if (staggerIndex > -1) {
                cardEl.style.left = `${staggerIndex * 20}px`; 
                cardEl.style.top = `${staggerIndex * 5}px`;  
            }
            return cardEl;
        }

        async function checkAndPause(card, cardEl, defaultDelay) {
            const isHighCard = card.rank === 14 || card.rank === 13; // Ace or King
            
            if (isHighCard) {
                cardEl.classList.add('highlight-power-card');
                await sleep(DRAMATIC_PAUSE_DURATION);
                cardEl.classList.remove('highlight-power-card');
            } else {
                await sleep(defaultDelay);
            }
        }


        // --- Socket Event Listeners ---
        console.log(`Attempting to join room: ${roomCode}`);
        socket.emit('join_game', { room_code: roomCode });

        socket.on('you_joined', (data) => {
            thisPlayerIndex = data.player_index;
            console.log(`Joined game, I am Player ${thisPlayerIndex}`);
            if (thisPlayerIndex === 0) {
                p0NameEl.textContent = "Player 1 (You)";
                p1NameEl.textContent = "Player 2 (Opponent)";
            } else {
                p0NameEl.textContent = "Player 1 (Opponent)";
                p1NameEl.textContent = "Player 2 (You)";
            }
        });

        socket.on('status_update', (data) => {
            messageEl.textContent = data.message;
        });
        
        socket.on('join_error', (data) => {
            messageEl.textContent = data.message;
            messageEl.style.color = '#dc3545';
            speedUpBtn.disabled = true;
            speedDownBtn.disabled = true;
        });

        // (From previous step: Show start button)
        socket.on('show_start_button', () => {
            console.log("Server signaled to show start button.");
            if (startBtn) {
                startBtn.style.display = 'inline-block';
            }
        });

        // 5. Main Game State Updater - ASYNC
        socket.on('game_state_update', async (state) => {
            console.log('Game state update received:', state);

            // (From previous step: Hide start button)
            if (startBtn) {
                startBtn.style.display = 'none';
            }

            if (isProcessingUpdate) {
                 console.warn("Skipping update, previous one still processing.");
                 return; 
            }
            isProcessingUpdate = true;
            
            try { 
                // --- Update basic info immediately ---
                p0CountEl.textContent = `Cards: ${state.player_0_count}`;
                p1CountEl.textContent = `Cards: ${state.player_1_count}`;
                messageEl.textContent = state.message;
                speedDisplayEl.textContent = `Delay: ${state.current_delay.toFixed(1)}s`;

                // *** ADDED: Update Stats Display ***
                if (state.player_0_stats && state.player_1_stats) {
                    const p0_stats = state.player_0_stats;
                    const p1_stats = state.player_1_stats;
                    
                    // Update Player 0 Stats
                    p0AcesEl.textContent = p0_stats.aces_count;
                    p0KingsEl.textContent = p0_stats.kings_count;
                    p0WarsWonEl.textContent = p0_stats.wars_won;
                    p0HandsWonEl.textContent = p0_stats.hands_won;
                    p0WinPctEl.textContent = p0_stats.win_pct.toFixed(0);
                    // "Cards Left" (p0RecycleEl) mirrors the main card count
                    p0RecycleEl.textContent = state.player_0_count; 
                    
                    // Update Player 1 Stats
                    p1AcesEl.textContent = p1_stats.aces_count;
                    p1KingsEl.textContent = p1_stats.kings_count;
                    p1WarsWonEl.textContent = p1_stats.wars_won;
                    p1HandsWonEl.textContent = p1_stats.hands_won;
                    p1WinPctEl.textContent = p1_stats.win_pct.toFixed(0);
                    // "Cards Left" (p1RecycleEl) mirrors the main card count
                    p1RecycleEl.textContent = state.player_1_count;
                }

                // --- LOGIC FOR CARD PILES (Unchanged) ---
                if (state.war_pile.length > 0) {
                    // (War animation logic as before)
                    p0WarPileEl.innerHTML = '';
                    p1WarPileEl.innerHTML = '';
                    
                    const numSpoilsPerPlayer = state.war_pile.length / 2;
                    const p0Spoils = state.war_pile.slice(0, numSpoilsPerPlayer);
                    const p1Spoils = state.war_pile.slice(numSpoilsPerPlayer);

                    for (let i = 0; i < numSpoilsPerPlayer; i++) {
                        if (i < p0Spoils.length) {
                             const p0Card = p0Spoils[i];
                             const p0CardEl = createCardElement(p0Card, i); 
                             p0WarPileEl.appendChild(p0CardEl);
                             await checkAndPause(p0Card, p0CardEl, BASE_PACE_DURATION);
                        }
                        if (i < p1Spoils.length) {
                             const p1Card = p1Spoils[i];
                             const p1CardEl = createCardElement(p1Card, i); 
                             p1WarPileEl.appendChild(p1CardEl);
                             await checkAndPause(p1Card, p1CardEl, BASE_PACE_DURATION);
                        }
                    }

                    p0PileEl.innerHTML = '';
                    p1PileEl.innerHTML = '';
                    
                    if (state.play_pile.length > 0) {
                        const p0DecisionCard = state.play_pile[0];
                        const p0DecisionEl = createCardElement(p0DecisionCard); 
                        p0PileEl.appendChild(p0DecisionEl);
                        await checkAndPause(p0DecisionCard, p0DecisionEl, DRAMATIC_PAUSE_DURATION); 
                    }
                    if (state.play_pile.length > 1) {
                         const p1DecisionCard = state.play_pile[1];
                         const p1DecisionEl = createCardElement(p1DecisionCard); 
                         p1PileEl.appendChild(p1DecisionEl);
                         await checkAndPause(p1DecisionCard, p1DecisionEl, DRAMATIC_PAUSE_DURATION);
                    }

                } else {
                    // (Regular play logic as before)
                    p0WarPileEl.innerHTML = '';
                    p1WarPileEl.innerHTML = '';
                    
                    p0PileEl.innerHTML = ''; // Clear
                    if (state.play_pile.length > 0) {
                        p0PileEl.innerHTML = createCardHTML(state.play_pile[0]);
                    }
                    
                    p1PileEl.innerHTML = ''; // Clear
                    if (state.play_pile.length > 1) {
                        p1PileEl.innerHTML = createCardHTML(state.play_pile[1]);
                    }
                }
                
                // Handle Game Over
                if (state.game_over) {
                    messageEl.style.color = '#007bff';
                    messageEl.style.fontWeight = 'bold';
                    speedUpBtn.disabled = true;
                    speedDownBtn.disabled = true;
                }
            } catch (error) { 
                 console.error("Error processing game state update:", error);
                 messageEl.textContent = "An error occurred displaying the game state.";
                 messageEl.style.color = 'red';
            } finally { 
                 isProcessingUpdate = false; 
                 console.log("Processing finished, flag released.");
            }
        });

        // --- Button Event Listeners ---

        // (From previous step: Start button listener)
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log("Start button clicked. Emitting 'start_game'.");
                socket.emit('start_game', { room_code: roomCode });
                startBtn.style.display = 'none'; 
                messageEl.textContent = "Starting game...";
            });
        }

        speedUpBtn.addEventListener('click', () => {
             if (isProcessingUpdate) return; 
            console.log('Emitting speed change: -0.1');
            socket.emit('change_speed', { room_code: roomCode, change: -0.1 });
        });
        
        speedDownBtn.addEventListener('click', () => {
             if (isProcessingUpdate) return; 
            console.log('Emitting speed change: +0.1');
            socket.emit('change_speed', { room_code: roomCode, change: 0.1 });
        });
    }
});
