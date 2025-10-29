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
        // *** ADDED: Reference to the new start button ***
        const startBtn = document.getElementById('start-game-btn');
        
        let thisPlayerIndex = 0; // Will be 0 or 1
        let isProcessingUpdate = false; // Flag to prevent overlaps

        // --- Constants for delays ---
        const BASE_PACE_DURATION = 500; // General pace for card reveals
        const DRAMATIC_PAUSE_DURATION = 1000; // Pause for Ace/King

        // --- Helper Functions ---
        const sleep = (ms) => new Promise(res => setTimeout(res, ms));

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
            // *** NOTE: This logic assumes P0 is "You" if index is 0 ***
            // *** This was swapped in a previous step, VERIFY THIS IS CORRECT ***
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

        // *** ADDED: Listen for server signal to show the start button ***
        socket.on('show_start_button', () => {
            console.log("Server signaled to show start button.");
            if (startBtn) {
                startBtn.style.display = 'inline-block';
            }
        });

        // 5. Main Game State Updater - ASYNC
        socket.on('game_state_update', async (state) => {
            console.log('Game state update received:', state);

            // *** ADDED: Hide start button once game is running ***
            if (startBtn) {
                startBtn.style.display = 'none';
            }

            if (isProcessingUpdate) {
                 console.warn("Skipping update, previous one still processing.");
                 return; 
            }
            isProcessingUpdate = true;
            
            try { // *** (try/finally block remains from previous fix) ***
                // --- Update basic info immediately ---
                p0CountEl.textContent = `Cards: ${state.player_0_count}`;
                p1CountEl.textContent = `Cards: ${state.player_1_count}`;
                messageEl.textContent = state.message;
                speedDisplayEl.textContent = `Delay: ${state.current_delay.toFixed(1)}s`;

                // --- LOGIC FOR CARD PILES ---

                // A) Check if it's a War.
                if (state.war_pile.length > 0) {
                    // This is a war state.
                    // (War animation logic remains unchanged)
                    
                    // 2. Clear ONLY the war piles.
                    p0WarPileEl.innerHTML = '';
                    p1WarPileEl.innerHTML = '';
                    
                    // 3. Split the spoils
                    // (This logic is based on the previous fix, assuming server sends spoils in war_pile
                    // and decision cards in play_pile)
                    const numSpoilsPerPlayer = state.war_pile.length / 2;
                    const p0Spoils = state.war_pile.slice(0, numSpoilsPerPlayer);
                    const p1Spoils = state.war_pile.slice(numSpoilsPerPlayer);

                    // 4. Render spoil cards sequentially
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

                    // 5. Render the new decision cards (from state.play_pile)
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
                    // B) This is NOT a war state.
                    // (Regular play logic remains unchanged)
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

        // *** ADDED: Click listener for the start button ***
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log("Start button clicked. Emitting 'start_game'.");
                socket.emit('start_game', { room_code: roomCode });
                startBtn.style.display = 'none'; // Hide button immediately
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
