document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const SUITS = ['♠', '♥', '♦', '♣'];
    const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const CARD_VALUE_MAP = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    // --- DOM Elements ---
    const player1DeckEl = document.getElementById('player-1-deck');
    const player1CardEl = document.getElementById('player-1-card');
    const player1ScoreEl = document.getElementById('player-1-score');

    const player2DeckEl = document.getElementById('player-2-deck');
    const player2CardEl = document.getElementById('player-2-card');
    const player2ScoreEl = document.getElementById('player-2-score');

    const messageBox = document.getElementById('message-box');
    const playHandBtn = document.getElementById('play-hand-btn');
    const resetGameBtn = document.getElementById('reset-game-btn');
    const warPileP1 = document.getElementById('war-pile-p1');
    const warPileP2 = document.getElementById('war-pile-p2');

    // --- Game State ---
    let player1Deck = [];
    let player2Deck = [];
    let warPile = [];
    let inWar = false;

    // --- Game Logic ---

    /**
     * Creates a standard 52-card deck
     */
    function createDeck() {
        const deck = [];
        for (const suit of SUITS) {
            for (const value of VALUES) {
                deck.push({
                    suit: suit,
                    value: value,
                    rank: CARD_VALUE_MAP[value]
                });
            }
        }
        return deck;
    }

    /**
     * Shuffles a deck using the Fisher-Yates algorithm
     */
    function shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    /**
     * Starts or resets the game
     */
    function startGame() {
        const deck = shuffleDeck(createDeck());
        const midPoint = Math.ceil(deck.length / 2);
        player1Deck = deck.slice(0, midPoint);
        player2Deck = deck.slice(midPoint);

        warPile = [];
        inWar = false;

        updateUI();
        messageBox.textContent = "Click 'Play Hand' to Start!";
        playHandBtn.disabled = false;
    }

    /**
     * Plays one hand of War
     */
    function playHand() {
        if (inWar) {
            handleWar();
            return;
        }

        // Check for winner before playing
        if (isGameOver()) {
            declareWinner();
            return;
        }

        const player1Card = player1Deck.pop();
        const player2Card = player2Deck.pop();

        displayCard(player1Card, player1CardEl);
        displayCard(player2Card, player2CardEl);
        
        warPile.push(player1Card, player2Card);

        if (player1Card.rank > player2Card.rank) {
            // Player 1 wins
            player1Deck.unshift(...shuffleDeck(warPile));
            warPile = [];
            messageBox.textContent = `Player 1 wins the hand! (${player1Card.value}${player1Card.suit} > ${player2Card.value}${player2Card.suit})`;
        } else if (player2Card.rank > player1Card.rank) {
            // Player 2 wins
            player2Deck.unshift(...shuffleDeck(warPile));
            warPile = [];
            messageBox.textContent = `Player 2 wins the hand! (${player2Card.value}${player2Card.suit} > ${player1Card.value}${player1Card.suit})`;
        } else {
            // War
            inWar = true;
            messageBox.textContent = `WAR! (${player1Card.value}${player1Card.suit} = ${player2Card.value}${player2Card.suit})`;
        }

        updateUI();

        // Check for winner after playing
        if (isGameOver()) {
            declareWinner();
        }
    }

    /**
     * Handles the "War" scenario
     */
    function handleWar() {
        // Check if players have enough cards for war
        // Need at least 4 cards (3 face down, 1 face up)
        if (player1Deck.length < 4) {
            player2Deck.push(...player1Deck, ...warPile); // P2 gets all cards
            player1Deck = [];
            messageBox.textContent = "Player 1 doesn't have enough cards for War! Player 2 wins!";
            declareWinner();
            return;
        }
        if (player2Deck.length < 4) {
            player1Deck.push(...player2Deck, ...warPile); // P1 gets all cards
            player2Deck = [];
            messageBox.textContent = "Player 2 doesn't have enough cards for War! Player 1 wins!";
            declareWinner();
            return;
        }

        // Add 3 face-down cards from each player to the war pile
        warPile.push(...player1Deck.splice(player1Deck.length - 3, 3));
        warPile.push(...player2Deck.splice(player2Deck.length - 3, 3));

        // Show war pile card backs
        warPileP1.classList.add('visible');
        warPileP2.classList.add('visible');

        // Draw the face-up cards
        const player1WarCard = player1Deck.pop();
        const player2WarCard = player2Deck.pop();

        displayCard(player1WarCard, player1CardEl);
        displayCard(player2WarCard, player2CardEl);

        warPile.push(player1WarCard, player2WarCard);

        if (player1WarCard.rank > player2WarCard.rank) {
            // Player 1 wins the war
            player1Deck.unshift(...shuffleDeck(warPile));
            messageBox.textContent = `Player 1 wins the WAR! (${player1WarCard.value}${player1WarCard.suit} > ${player2WarCard.value}${player2WarCard.suit})`;
        } else if (player2WarCard.rank > player1WarCard.rank) {
            // Player 2 wins the war
            player2Deck.unshift(...shuffleDeck(warPile));
            messageBox.textContent = `Player 2 wins the WAR! (${player2WarCard.value}${player2WarCard.suit} > ${player1WarCard.value}${player1WarCard.suit})`;
        } else {
            // Another war!
            messageBox.textContent = `ANOTHER WAR! (${player1WarCard.value}${player1WarCard.suit} = ${player2WarCard.value}${player2WarCard.suit})`;
            // Cards stay in the war pile, inWar stays true, wait for next button click
            updateUI();
            return; // Exit without resetting inWar or warPile
        }
        
        // Reset war state
        warPile = [];
        inWar = false;
        updateUI();
    }

    /**
     * Checks if a player has run out of cards
     */
    function isGameOver() {
        return player1Deck.length === 0 || player2Deck.length === 0;
    }

    /**
     * Declares the winner
     */
    function declareWinner() {
        playHandBtn.disabled = true;
        if (player1Deck.length > 0) {
            messageBox.textContent = "Player 1 WINS THE GAME! Click Reset to play again.";
        } else {
            messageBox.textContent = "Player 2 WINS THE GAME! Click Reset to play again.";
        }
        updateUI();
    }

    /**
     * Renders a card in the specified DOM element
     */
    function displayCard(card, element) {
        if (!card) {
            element.innerHTML = '';
            element.classList.remove('red', 'black');
            return;
        }
        const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
        element.className = 'card-display ' + color; // Reset classes
        
        // Using textContent to prevent XSS
        const value = card.value;
        const suit = card.suit;
        
        element.innerHTML = `
            <span style="position: absolute; top: 10px; left: 10px; font-size: 1.2rem;">${value}<br>${suit}</span>
            <span style="font-size: 2.5rem;">${suit}</span>
            <span style="position: absolute; bottom: 10px; right: 10px; font-size: 1.2rem; transform: rotate(180deg);">${value}<br>${suit}</span>
        `;
    }

    /**
     * Updates all UI elements based on game state
     */
    function updateUI() {
        player1ScoreEl.textContent = `Cards: ${player1Deck.length}`;
        player2ScoreEl.textContent = `Cards: ${player2Deck.length}`;

        // Update deck visibility
        player1DeckEl.classList.toggle('has-cards', player1Deck.length > 0);
        player2DeckEl.classList.toggle('has-cards', player2Deck.length > 0);

        // Update war pile visibility
        if (!inWar && warPile.length === 0) {
            warPileP1.classList.remove('visible');
            warPileP2.classList.remove('visible');
        }

        // Clear card displays if decks are empty (at end of game)
        if (player1Deck.length === 0 && !inWar) {
             // Don't clear the card that just lost the game
             // displayCard(null, player1CardEl);
        }
        if (player2Deck.length === 0 && !inWar) {
            // displayCard(null, player2CardEl);
        }
        
        if (inWar) {
            playHandBtn.textContent = "Go to War!";
        } else {
            playHandBtn.textContent = "Play Hand";
        }
    }

    // --- Event Listeners ---
    playHandBtn.addEventListener('click', playHand);
    resetGameBtn.addEventListener('click', startGame);

    // --- Initial Game Setup ---
    startGame();
});
