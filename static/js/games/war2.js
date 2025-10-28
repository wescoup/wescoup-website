document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the lobby page by looking for the create button
    const createBtn = document.getElementById('create-game-btn');
    
    if (createBtn) {
        // --- LOBBY LOGIC ---
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
            createBtn.disabled = true; // Prevent multiple clicks
            createBtn.innerText = 'Creating...';
            socket.emit('create_game');
        });

        // 2. Listen for the server's response after creation
        socket.on('game_created', (data) => {
            console.log('Game created:', data);
            const roomCode = data.room_code;
            // Construct the full URL using the current window location
            gameRoomUrl = `${window.location.origin}/war/game/${roomCode}`; 
            
            // Create the invitation message
            const invitationMessage = `Let's play War!\n\nJoin Link: ${gameRoomUrl}\n\nOr go to ${window.location.origin}/war/new and enter code: ${roomCode}`;
            
            // Populate and show the modal
            invitationTextEl.textContent = invitationMessage;
            modal.style.display = "block";

            // Reset create button
             createBtn.disabled = false;
             createBtn.innerText = 'Create Game';
        });

        // 3. Handle Joining by Code
        joinBtn.addEventListener('click', () => {
            const code = codeInput.value.trim().toLowerCase(); // Normalize code
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
                console.error('Copy failed:', err);
            });
        });

        goToGameBtn.addEventListener('click', () => {
            if (gameRoomUrl) {
                window.location.href = gameRoomUrl; // Redirect the creator to the game
            }
        });

        // Close modal if user clicks outside of it
        window.onclick = function(event) {
            if (event.target == modal) {
                 if (gameRoomUrl) {
                     // Redirect if they click outside after game created
                     window.location.href = gameRoomUrl; 
                 }
            }
        }
    }

    // --- GAME LOGIC (to be added later) ---
    const gameBoard = document.getElementById('war-game-board');
    if (gameBoard) {
        // Logic for the actual game page will go here
        console.log('War game page loaded');
    }
});
