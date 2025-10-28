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
        const warPileEl = document.getElementById('war-pile-container');
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
            
            // Update play piles
            p0PileEl.innerHTML = ''; // Clear
            if (state.play_pile.length > 0) {
                p0PileEl.innerHTML = createCardHTML(state.play_pile[0]);
            }
            
            p1PileEl.innerHTML = ''; // Clear
            if (state.play_pile.length > 1) {
                p1PileEl.innerHTML = createCardHTML(state.play_pile[1]);
            }
            
            // Update war pile
            warPileEl.innerHTML = ''; // Clear
            if (state.war_pile.length > 0) {
                // Stagger war cards
                state.war_pile.forEach((card, index) => {
                    const cardEl = document.createElement('div');
                    // Show 1 face down, 1 face up
                    if (index % 2 === 0) {
                        cardEl.className = 'card card-back';
                    } else {
                        cardEl.innerHTML = createCardHTML(card);
                    }
                    cardEl.style.left = `${index * 10}px`;
                    cardEl.style.top = `${index * 2}px`; // Slight vertical stagger
                    
                    // Add card class if it's not a back
                    if(index % 2 !== 0) {
                        const colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
                        cardEl.className = `card ${colorClass}`;
                    }
                    warPileEl.appendChild(cardEl);
                });
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
