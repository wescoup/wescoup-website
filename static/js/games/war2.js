document.addEventListener('DOMContentLoaded', () => {
    
    // --- Global Variables ---
    // The player index (0 or 1) assigned by the server
    let localPlayerIndex = null; 
    // The global username is expected to be defined in the HTML template's script block (from Flask)
    // Example: const PLAYER_USERNAME = "{{ player_username }}"; 
    
    // --- LOBBY LOGIC (war_lobby.html) ---
    const createBtn = document.getElementById('create-game-btn');
    // NOTE: Socket initialized only once per logical page (lobby OR game room)
    const socket = io();
    const joinBtn = document.getElementById('join-game-btn');
    const codeInput = document.getElementById('game-code-input');
    
    // Modal elements
    const modal = document.getElementById('invitationModal');
    const invitationTextEl = document.getElementById('invitation-text');
    const copyInvitationBtn = document.getElementById('copy-invitation-btn');
    const goToGameBtn = document.getElementById('go-to-game-btn');
    let gameRoomUrl = ''; 
    
    // 1. Handle Game Creation (Lobby)
    if (createBtn) { 
        createBtn.addEventListener('click', () => {
            console.log('Emitting create_game');
            createBtn.disabled = true;
            createBtn.innerText = 'Creating...';
            socket.emit('create_game');
        });

        // 2. Listen for game_created (Lobby)
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

        // Let Player 1 go straight to the game
        if (goToGameBtn) {
            goToGameBtn.addEventListener('click', () => {
                if (gameRoomUrl) {
                    window.location.href = gameRoomUrl;
                } else {
                    // Fallback: just hide the modal if for some reason we don't have the URL yet
                    modal.style.display = "none";
                }
            });
        }

        // 3. Handle Joining by Code (Lobby)
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                const code = codeInput.value.trim().toLowerCase();

                if (typeof PLAYER_USERNAME === 'undefined' || !PLAYER_USERNAME) {
                    alert('FATAL ERROR: Identity not loaded. Please ensure PLAYER_USERNAME is set in HTML.');
                    return;
                }

                if (code) {
                    window.location.href = `/war/game/${code}`;
                } else {
                    alert('Please enter a game code.');
                }
            });
        }

        // ... (rest of lobby logic) ...
        
        window.onclick = function(event) {
            if (event.target == modal) {
                 if (gameRoomUrl) {
                     window.location.href = gameRoomUrl; 
                 }
            }
        }
    }


    // --- GAME ROOM LOGIC (war_multiplayer.html) ---
    const gameBoard = document.getElementById('war-game-board');

    if (gameBoard) {
        // The socket variable is initialized above, so we use it here.
        const roomCode = gameBoard.dataset.roomCode;

        // --- Element Refs ---
        const p0NameEl = document.getElementById('player-0-name');
        const p1NameEl = document.getElementById('player-1-name');

        // Keep track of the actual names the server uses for P0 / P1
        let serverP0Name = 'Player 1';
        let serverP1Name = 'Player 2';

        const p0CountEl = document.getElementById('player-0-count');
        const p1CountEl = document.getElementById('player-1-count');

        const p0RecycleEl = document.getElementById('player-0-recycle');
        const p1RecycleEl = document.getElementById('player-1-recycle');

        // Stats
        const p0AcesEl      = document.getElementById('player-0-aces');
        const p0KingsEl     = document.getElementById('player-0-kings');
        const p0WarsWonEl   = document.getElementById('player-0-wars-won');
        const p0HandsWonEl  = document.getElementById('player-0-hands-won');
        const p0WinPctEl    = document.getElementById('player-0-win-pct');

        const p1AcesEl      = document.getElementById('player-1-aces');
        const p1KingsEl     = document.getElementById('player-1-kings');
        const p1WarsWonEl   = document.getElementById('player-1-wars-won');
        const p1HandsWonEl  = document.getElementById('player-1-hands-won');
        const p1WinPctEl    = document.getElementById('player-1-win-pct');

        // Piles
        const p0PlayPileEl      = document.getElementById('player-0-play-pile');
        const p1PlayPileEl      = document.getElementById('player-1-play-pile');
        const p0WarPileEl       = document.getElementById('player-0-war-pile');
        const p1WarPileEl       = document.getElementById('player-1-war-pile');
        const warPileContainerEl = document.getElementById('war-pile-container');

        // Controls / message
        const messageEl      = document.getElementById('game-message-multi');
        const speedDisplayEl = document.getElementById('speed-display');
        const speedUpBtn     = document.getElementById('speed-up-btn');
        const speedDownBtn   = document.getElementById('speed-down-btn');
        const startBtn       = document.getElementById('start-game-btn');

        let isProcessingUpdate = false;

        // --- Helper functions ---

        function updateMessage(msg) {
            if (messageEl) {
                messageEl.textContent = msg || '';
            }
            console.log('[GAME]', msg);
        }

        function clearEl(el) {
            if (el) el.innerHTML = '';
        }

        function createCardElement(card) {
            const div = document.createElement('div');
            div.classList.add('card');
            // card has shape { suit, value, rank } from the server
            div.textContent = `${card.value}${card.suit}`;
            return div;
        }

        function renderCounts(state) {
            if (p0CountEl) p0CountEl.textContent = `Cards: ${state.player_0_count}`;
            if (p1CountEl) p1CountEl.textContent = `Cards: ${state.player_1_count}`;

            // For now, mirror counts into the "Cards Left" stat
            if (p0RecycleEl) p0RecycleEl.textContent = state.player_0_count;
            if (p1RecycleEl) p1RecycleEl.textContent = state.player_1_count;
        }

        function renderSpeed(state) {
            if (speedDisplayEl && typeof state.current_delay === 'number') {
                speedDisplayEl.textContent = `Delay: ${state.current_delay.toFixed(1)}s`;
            }
        }

        function renderStats(state) {
            const s0 = state.player_0_stats || {};
            const s1 = state.player_1_stats || {};

            if (p0AcesEl)     p0AcesEl.textContent     = s0.aces_count ?? 0;
            if (p0KingsEl)    p0KingsEl.textContent    = s0.kings_count ?? 0;
            if (p0WarsWonEl)  p0WarsWonEl.textContent  = s0.wars_won   ?? 0;
            if (p0HandsWonEl) p0HandsWonEl.textContent = s0.hands_won  ?? 0;
            if (p0WinPctEl)   p0WinPctEl.textContent   = (s0.win_pct ?? 0).toFixed(1);

            if (p1AcesEl)     p1AcesEl.textContent     = s1.aces_count ?? 0;
            if (p1KingsEl)    p1KingsEl.textContent    = s1.kings_count ?? 0;
            if (p1WarsWonEl)  p1WarsWonEl.textContent  = s1.wars_won   ?? 0;
            if (p1HandsWonEl) p1HandsWonEl.textContent = s1.hands_won  ?? 0;
            if (p1WinPctEl)   p1WinPctEl.textContent   = (s1.win_pct ?? 0).toFixed(1);
        }

        function renderPiles(state) {
            // Clear old cards
            clearEl(p0PlayPileEl);
            clearEl(p1PlayPileEl);
            clearEl(p0WarPileEl);
            clearEl(p1WarPileEl);
            clearEl(warPileContainerEl); // We’ll leave the center pile empty now

            const playPile = state.play_pile || [];
            const warPile  = state.war_pile  || [];

            // --- Optional debug logging ---
            console.log('play_pile from server:', playPile);
            console.log('war_pile from server:', warPile);

            // Play piles (top card for each player)
            if (playPile.length === 1) {
                console.warn('play_pile.length === 1; cloning to show for both players.');
                if (p0PlayPileEl) p0PlayPileEl.appendChild(createCardElement(playPile[0]));
                if (p1PlayPileEl) p1PlayPileEl.appendChild(createCardElement(playPile[0]));
            } else {
                if (playPile.length >= 1 && p0PlayPileEl) {
                    p0PlayPileEl.appendChild(createCardElement(playPile[0]));
                }
                if (playPile.length >= 2 && p1PlayPileEl) {
                    p1PlayPileEl.appendChild(createCardElement(playPile[1]));
                }
            }

            // --- War piles: split by even/odd index AND fan them out ---
            // Index 0,2,4,... → Player 0 ; 1,3,5,... → Player 1
            let p0WarIndex = 0;
            let p1WarIndex = 0;

            warPile.forEach((card, idx) => {
                const el = createCardElement(card);

                if (idx % 2 === 0) {
                    // Player 0
                    if (p0WarPileEl) {
                        el.style.left = `${p0WarIndex * 20}px`;  // stagger horizontally
                        p0WarPileEl.appendChild(el);
                        p0WarIndex++;
                    }
                } else {
                    // Player 1
                    if (p1WarPileEl) {
                        el.style.left = `${p1WarIndex * 20}px`;  // stagger horizontally
                        p1WarPileEl.appendChild(el);
                        p1WarIndex++;
                    }
                }
            });
        }

        function highlightWarDecision(state) {
            const msg = state.message || '';
            if (!msg.includes('wins the WAR!')) return;

            if (!p0WarPileEl || !p1WarPileEl) return;

            const p0CardsEls = p0WarPileEl.querySelectorAll('.card');
            const p1CardsEls = p1WarPileEl.querySelectorAll('.card');

            if (p0CardsEls.length === 0 || p1CardsEls.length === 0) return;

            const p0BattleEl = p0CardsEls[p0CardsEls.length - 1];
            const p1BattleEl = p1CardsEls[p1CardsEls.length - 1];

            let winnerEl = null;
            let loserEl  = null;

            if (msg.includes(serverP0Name)) {
                winnerEl = p0BattleEl;
                loserEl  = p1BattleEl;
            } else if (msg.includes(serverP1Name)) {
                winnerEl = p1BattleEl;
                loserEl  = p0BattleEl;
            }

            if (winnerEl && loserEl) {
                winnerEl.classList.add('highlight-win');
                loserEl.classList.add('highlight-lose');
            }
        }

        function applyState(state) {
            renderCounts(state);
            renderSpeed(state);
            renderStats(state);
            renderPiles(state);
            highlightWarDecision(state);
            
            if (state.message) {
                updateMessage(state.message);
            }
            if (state.game_over && startBtn) {
                startBtn.style.display = 'none';
            }
        }

        // --- Socket handlers ---

        // Ensure join_game is sent ONLY when socket is connected
        socket.on('connect', () => {
            console.log(`Connected to server. Joining game room: ${roomCode}`);
            if (typeof PLAYER_USERNAME === 'undefined' || !PLAYER_USERNAME) {
                updateMessage("FATAL ERROR: Identity not loaded. Please check browser cookies.");
                return;
            }

            socket.emit('join_game', {
                room_code: roomCode,
                username: PLAYER_USERNAME
            });
        });

        // Store the player index assigned by the server
        socket.on('you_joined', (data) => {
            localPlayerIndex = data.player_index;
            console.log(`Joined game, I am Player ${localPlayerIndex}`);
        });

        // Status messages before both players join / reconnect scenarios
        socket.on('status_update', (data) => {
            if (data && data.message) {
                updateMessage(data.message);
            }
        });

        // Hard errors when trying to join
        socket.on('join_error', (data) => {
            const msg = (data && data.message) || 'Error joining game.';
            updateMessage(msg);
            alert(msg);
        });

        // Server says the start button should be visible
        socket.on('show_start_button', () => {
            console.log("Server signaled to show start button.");
            if (startBtn) {
                startBtn.style.display = 'inline-block';
            }
        });

        // Player names & "Both players ready" message
        socket.on('players_ready', (data) => {
            const names = (data && data.names) || {};
            const p0Name = names.p0 || 'Player 1';
            const p1Name = names.p1 || 'Player 2';

            // Remember these so we can parse "___ wins the WAR!" messages later
            serverP0Name = p0Name;
            serverP1Name = p1Name;

            if (p0NameEl && p1NameEl) {
                if (localPlayerIndex === 0) {
                    p0NameEl.textContent = `${p0Name} (You)`;
                    p1NameEl.textContent = p1Name;
                } else if (localPlayerIndex === 1) {
                    p0NameEl.textContent = p0Name;
                    p1NameEl.textContent = `${p1Name} (You)`;
                } else {
                    p0NameEl.textContent = p0Name;
                    p1NameEl.textContent = p1Name;
                }
            }

            if (data && data.message) {
                updateMessage(data.message);
            }
        });

        // Main game state updater
        socket.on('game_state_update', (state) => {
            if (!state) return;
            isProcessingUpdate = true;
            try {
                applyState(state);
            } finally {
                isProcessingUpdate = false;
            }
        });

        // --- Button Event Listeners ---

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log("Start button clicked. Emitting 'start_game'.");
                socket.emit('start_game', { room_code: roomCode });
                startBtn.style.display = 'none';
                messageEl.textContent = "Starting game...";
            });
        }

        if (speedUpBtn) {
            speedUpBtn.addEventListener('click', () => {
                if (isProcessingUpdate) return;
                console.log('Emitting speed change: -0.1');
                socket.emit('change_speed', { room_code: roomCode, change: -0.1 });
            });
        }

        if (speedDownBtn) {
            speedDownBtn.addEventListener('click', () => {
                if (isProcessingUpdate) return;
                console.log('Emitting speed change: +0.1');
                socket.emit('change_speed', { room_code: roomCode, change: 0.1 });
            });
        }
    }
});