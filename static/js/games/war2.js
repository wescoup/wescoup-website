document.addEventListener('DOMContentLoaded', () => {
    
    // --- LOBBY LOGIC ---
    const createBtn = document.getElementById('create-game-btn');
    if (createBtn) {
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
        
        // *** UPDATED REFS ***
        const p0WarPileEl = document.getElementById('player-0-war-pile');
        const p1WarPileEl = document.getElementById('player-1-war-pile');
        // const warPileEl = document.getElementById('war-pile-container'); // No longer used for cards
        
        const messageEl = document.getElementById('game-message-multi');
        const speedDisplayEl = document.getElementById('speed-display');
        const speedUpBtn = document.getElementById('speed-up-btn');
        const speedDownBtn = document.getElementById('speed-down-btn');
        const p0NameEl = document.getElementById('player-0-name');
        const p1NameEl = document.getElementById('player-1-name');
        
        let thisPlayerIndex = 0; // Will be 0 or 1

        // --- Helper Function to create card HTML ---
        function createCardHTML(card) {
            const colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
            return `<div class="card ${colorClass}">
                        <span class="card-value">${card.value}</span>
                        <span class="card-suit">${card.suit}</span>
                    </div>`;
        }
        
        // *** NEW HELPER ***
        function createCardBackHTML() {
            return '<div class="card card-back"></div>';
        }


        // --- Socket Event Listeners ---

        // 1. Emit 'join_game' on load
        console.log(`Attempting to join room: ${roomCode}`);
        socket.emit('join_game', { room_code: roomCode });

        // 2. Listen for 'you_joined' to know if we are P0 or P1
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

        // 3. Listen for general status updates
        socket.on('status_update', (data) => {
            messageEl.textContent = data.message;
        });
        
        // 4. Listen for join errors
        socket.on('join_error', (data) => {
            messageEl.textContent = data.message;
            messageEl.style.color = '#dc3545';
            // Disable speed buttons
            speedUpBtn.disabled = true;
            speedDownBtn.disabled = true;
        });

        // 5. Main Game State Updater
        socket.on('game_state_update', (state) => {
            console.log('Game state update received:', state);
            
            // Update counts
            p0CountEl.textContent = `Cards: ${state.player_0_count}`;
            p1CountEl.textContent = `Cards: ${state.player_1_count}`;
            
            // Update message
            messageEl.textContent = state.message;
            
            // Update speed display
            speedDisplayEl.textContent = `Delay: ${state.current_delay.toFixed(1)}s`;

            // --- *** NEW LOGIC FOR CARD PILES *** ---

            // A) Check if it's a War. If it is, war_pile has cards.
            if (state.war_pile.length > 0) {
                // This is a war state.
                // 1. The play_pile (battle cards) should already be set from the previous state.
                //    We DON'T clear them.
                
                // 2. Clear ONLY the war piles.
                p0WarPileEl.innerHTML = '';
                p1WarPileEl.innerHTML = '';
                
                // 3. Iterate and distribute war_pile cards.
                //    P0 cards are at even indices (0, 2, 4...)
                //    P1 cards are at odd indices (1, 3, 5...)
                state.war_pile.forEach((card, index) => {
                    let cardElHTML;
                    // The server logic sends 1 face down, 1 face up.
                    // So, [p0_down, p1_down, p0_up, p1_up]
                    // We just need to render them as they come.
                    
                    // index 0 (p0_down), 1 (p1_down), 2 (p0_up), 3 (p1_up)
                    // We can simplify: first 2 are face down, next 2 are face up.
                    // And in a double war: next 2 face down, next 2 face up.
                    
                    // The server logic in manager.py [handle_war] sends:
                    // 1. face_down_p0, face_down_p1
                    // 2. p0_battle_card, p1_battle_card
                    // This means:
                    // index 0 = p0_down
                    // index 1 = p1_down
                    // index 2 = p0_up
                    // index 3 = p1_up
                    // ...and so on for multi-war
                    
                    const isFaceDown = (index % 4 === 0) || (index % 4 === 1);
                    
                    if (isFaceDown) {
                        cardElHTML = createCardBackHTML();
                    } else {
                        cardElHTML = createCardHTML(card);
                    }
                    
                    const cardEl = document.createElement('div');
                    cardEl.innerHTML = cardElHTML;
                    
                    // Staggering
                    const staggerIndex = Math.floor(index / 2);
                    cardEl.style.left = `${staggerIndex * 10}px`;
                    cardEl.style.top = `${staggerIndex * 2}px`;
                    
                    // Add the first child of cardEl (the card itself)
                    if (index % 2 === 0) {
                        // Player 0
                        p0WarPileEl.appendChild(cardEl.firstChild);
                    } else {
                        // Player 1
                        p1WarPileEl.appendChild(cardEl.firstChild);
                    }
                });

            } else {
                // B) This is NOT a war state. It's a regular draw or a hand result.
                // 1. Clear all war piles.
                p0WarPileEl.innerHTML = '';
                p1WarPileEl.innerHTML = '';

                // 2. Update play piles based on play_pile.
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
        });

        // --- Button Event Listeners ---
        speedUpBtn.addEventListener('click', () => {
            console.log('Emitting speed change: -0.1');
            socket.emit('change_speed', { room_code: roomCode, change: -0.1 });
        });
        
        speedDownBtn.addEventListener('click', () => {
            console.log('Emitting speed change: +0.1');
            socket.emit('change_speed', { room_code: roomCode, change: 0.1 });
        });
    }
});
