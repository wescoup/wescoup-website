document.addEventListener('DOMContentLoaded', () => {
    
    // --- LOBBY LOGIC (Keep as is) ---
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
        
        let thisPlayerIndex = 0; // Will be 0 or 1
        let isProcessingUpdate = false; // Flag to prevent overlaps

        // --- Constants for delays ---
        const BASE_PACE_DURATION = 500; // General pace for card reveals
        const DRAMATIC_PAUSE_DURATION = 1000; // Pause for Ace/King

        // --- Helper Functions ---
        const sleep = (ms) => new Promise(res => setTimeout(res, ms));

        function createCardHTML(card) {
            const colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
            // Use card.value which holds the string ('J', 'Q', 'K', 'A')
            const displayValue = card.value; 
            return `<div class="card ${colorClass}">
                        <span class="card-value">${displayValue}</span>
                        <span class="card-suit">${card.suit}</span>
                    </div>`;
        }
        
        // --- Socket Event Listeners ---
        console.log(`Attempting to join room: ${roomCode}`);
        socket.emit('join_game', { room_code: roomCode });

        socket.on('you_joined', (data) => {
            thisPlayerIndex = data.player_index;
            console.log(`Joined game, I am Player ${thisPlayerIndex}`);
            // ... (name update logic as before) ...
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

        // 5. Main Game State Updater - NOW ASYNC
        socket.on('game_state_update', async (state) => { // Added async
            console.log('Game state update received:', state);

            // Prevent overlapping updates if server sends quickly
            if (isProcessingUpdate) {
                 console.warn("Skipping update, previous one still processing.");
                 return; 
            }
            isProcessingUpdate = true;
            
            // --- Update basic info immediately ---
            p0CountEl.textContent = `Cards: ${state.player_0_count}`;
            p1CountEl.textContent = `Cards: ${state.player_1_count}`;
            messageEl.textContent = state.message;
            speedDisplayEl.textContent = `Delay: ${state.current_delay.toFixed(1)}s`;

            // --- *** UPDATED LOGIC FOR CARD PILES WITH DELAYS *** ---

            // A) Check if it's a War.
            if (state.war_pile.length > 0) {
                // This is a war state.
                // 1. Keep the play_pile (battle cards) visible. Don't clear them.
                
                // 2. Clear ONLY the war piles for the new cards.
                p0WarPileEl.innerHTML = '';
                p1WarPileEl.innerHTML = '';
                
                // 3. Iterate and distribute war_pile cards WITH delays.
                //    Server sends [p0_down, p1_down, p0_up, p1_up]
                //    Indices:      0        1        2        3
                //    We show all 4 face up, staggering each one.
                for (let index = 0; index < state.war_pile.length; index++) {
                    const card = state.war_pile[index];
                    const isPlayer0Card = index % 2 === 0;
                    const targetPile = isPlayer0Card ? p0WarPileEl : p1WarPileEl;
                    
                    // Always create face up HTML
                    const cardElHTML = createCardHTML(card);
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = cardElHTML;
                    const cardEl = tempDiv.firstChild;
                    
                    // Staggering based on how many cards are ALREADY in THAT pile
                    // For war pile: index 0, 1 -> stagger 0; index 2, 3 -> stagger 1
                    const staggerIndex = Math.floor(index / 2); 
                    cardEl.style.left = `${staggerIndex * 20}px`; // Increase stagger offset
                    cardEl.style.top = `${staggerIndex * 5}px`;  // Add vertical stagger too
                    
                    // Append the card
                    targetPile.appendChild(cardEl);
                    
                    // Check for dramatic pause AFTER adding the card
                    // Pause if it's a spoil card (index 0, 1) OR the battle card (index 2, 3) AND is Ace/King
                    const isSpoilCard = index < state.war_pile.length - 2; // True for all but last 2
                    const isBattleCard = index >= state.war_pile.length - 2; // True for last 2
                    const isHighCard = card.rank === 14 || card.rank === 13; // Ace or King

                    if (isHighCard && (isSpoilCard || isBattleCard)) {
                        cardEl.classList.add('highlight-power-card'); // Add highlight
                        await sleep(DRAMATIC_PAUSE_DURATION);         // Wait
                        cardEl.classList.remove('highlight-power-card'); // Remove highlight
                    } else {
                        await sleep(BASE_PACE_DURATION); // Normal pace
                    }
                }

            } else {
                // B) This is NOT a war state. Clear war piles, update play piles.
                p0WarPileEl.innerHTML = '';
                p1WarPileEl.innerHTML = '';

                p0PileEl.innerHTML = ''; // Clear main play pile
                if (state.play_pile.length > 0) {
                    p0PileEl.innerHTML = createCardHTML(state.play_pile[0]);
                }
                
                p1PileEl.innerHTML = ''; // Clear main play pile
                if (state.play_pile.length > 1) {
                    p1PileEl.innerHTML = createCardHTML(state.play_pile[1]);
                }
                // No extra delay needed here, server controls turn pace
            }
            
            // Handle Game Over
            if (state.game_over) {
                messageEl.style.color = '#007bff';
                messageEl.style.fontWeight = 'bold';
                speedUpBtn.disabled = true;
                speedDownBtn.disabled = true;
            }

            isProcessingUpdate = false; // Release the flag
        });

        // --- Button Event Listeners ---
        speedUpBtn.addEventListener('click', () => {
             if (isProcessingUpdate) return; // Prevent speed change during animation
            console.log('Emitting speed change: -0.1');
            socket.emit('change_speed', { room_code: roomCode, change: -0.1 });
        });
        
        speedDownBtn.addEventListener('click', () => {
             if (isProcessingUpdate) return; // Prevent speed change during animation
            console.log('Emitting speed change: +0.1');
            socket.emit('change_speed', { room_code: roomCode, change: 0.1 });
        });
    }
});
