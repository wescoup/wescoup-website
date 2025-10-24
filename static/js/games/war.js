document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startGameBtn = document.getElementById('start-game');
    const playTurnBtn = document.getElementById('play-turn');
    const autoPlayBtn = document.getElementById('auto-play');
    const gameMessage = document.getElementById('game-message');

    const player1DeckCountEl = document.getElementById('player-1-deck-count');
    const player1PlayPileEl = document.getElementById('player-1-play-pile');
    const player1WarPileEl = document.getElementById('player-war-pile');
    // Removed player1DiscardPileEl

    const player2DeckCountEl = document.getElementById('player-2-deck-count');
    const player2PlayPileEl = document.getElementById('player-2-play-pile');
    const player2WarPileEl = document.getElementById('opponent-war-pile');
    // Removed player2DiscardPileEl

    // New Stat DOM Elements
    const player1AcesEl = document.getElementById('player-1-aces');
    const player1KingsEl = document.getElementById('player-1-kings');
    const player1WarsEl = document.getElementById('player-1-wars');
    const player1CardsLeftEl = document.getElementById('player-1-cards-left');
    const player1HandsEl = document.getElementById('player-1-hands'); // New
    const player1HandsPctEl = document.getElementById('player-1-hands-pct'); // New

    const player2AcesEl = document.getElementById('player-2-aces');
    const player2KingsEl = document.getElementById('player-2-kings');
    const player2WarsEl = document.getElementById('player-2-wars');
    const player2CardsLeftEl = document.getElementById('player-2-cards-left');
    const player2HandsEl = document.getElementById('player-2-hands'); // New
    const player2HandsPctEl = document.getElementById('player-2-hands-pct'); // New

    // --- Game State Variables ---
    const SUITS = ['♥', '♦', '♠', '♣'];
    const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // J=11, Q=12, K=13, A=14
    const VALUE_MAP = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

    let player1Deck, player2Deck;
    let player1Discard, player2Discard;
    let gameInProgress = false;
    let turnInProgress = false;

    let player1WarsWon = 0;
    let player2WarsWon = 0;
    let player1HandsWon = 0; // New
    let player2HandsWon = 0; // New
    let totalHandsPlayed = 0; // New

    let isAutoPlaying = false;
    let autoPlayInterval = null;
    const TURN_DURATION = 750;
    const WAR_PACE_DURATION = 500;
    const DRAMATIC_PAUSE_DURATION = 1000;
    const RECYCLE_PAUSE_DURATION = 1000;

    // --- Utility Functions ---
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    const createDeck = () => {
        const deck = [];
        for (const suit of SUITS) {
            for (const value of VALUES) {
                deck.push({ suit, value });
            }
        }
        return deck;
    };

    const shuffleDeck = (deck) => {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    };

    /**
     * Creates a card element with value and suit.
     */
    const createCardElement = (card, faceUp = true) => {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        if (faceUp) {
            const displayValue = VALUE_MAP[card.value] || card.value;
            // Structure for value and suit
            cardEl.innerHTML = `
                <span class="card-value">${displayValue}</span>
                <span class="card-suit">${card.suit}</span>
            `;
            cardEl.classList.add(card.suit === '♥' || card.suit === '♦' ? 'red' : 'black');
            if (card.value === 14 || card.value === 13) {
                cardEl.classList.add('power-card');
            }
        } else {
            cardEl.classList.add('card-back');
        }
        return cardEl;
    };

    // --- Stat Update Functions ---

    const countPowerCards = (deck, discard) => {
        const allCards = deck.concat(discard);
        return allCards.reduce((acc, card) => {
            if (card.value === 14) acc.aces++;
            if (card.value === 13) acc.kings++;
            return acc;
        }, { aces: 0, kings: 0 });
    };

    /**
     * Updates all stat displays in the DOM.
     */
    const updateAllStats = () => {
        // Calculate Percentages
        const p1Pct = totalHandsPlayed === 0 ? 0 : Math.round((player1HandsWon / totalHandsPlayed) * 100);
        const p2Pct = totalHandsPlayed === 0 ? 0 : Math.round((player2HandsWon / totalHandsPlayed) * 100);

        // Player 1 (Tony) Stats
        const p1Stats = countPowerCards(player1Deck, player1Discard);
        player1AcesEl.innerText = `Aces: ${p1Stats.aces}`;
        player1KingsEl.innerText = `Kings: ${p1Stats.kings}`;
        player1WarsEl.innerText = `Wars Won: ${player1WarsWon}`;
        player1DeckCountEl.innerText = `Cards: ${player1Deck.length + player1Discard.length}`;
        player1CardsLeftEl.innerText = `Cards Left: ${player1Deck.length}`;
        player1HandsEl.innerText = `Hands: ${player1HandsWon}`; // New
        player1HandsPctEl.innerText = `Win %: ${p1Pct}%`; // New

        // Player 2 (Player 1) Stats
        const p2Stats = countPowerCards(player2Deck, player2Discard);
        player2AcesEl.innerText = `Aces: ${p2Stats.aces}`;
        player2KingsEl.innerText = `Kings: ${p2Stats.kings}`;
        player2WarsEl.innerText = `Wars Won: ${player2WarsWon}`;
        player2DeckCountEl.innerText = `Cards: ${player2Deck.length + player2Discard.length}`;
        player2CardsLeftEl.innerText = `Cards Left: ${player2Deck.length}`;
        player2HandsEl.innerText = `Hands: ${player2HandsWon}`; // New
        player2HandsPctEl.innerText = `Win %: ${p2Pct}%`; // New
    };

    // --- Game Logic Functions ---

    const initGame = () => {
        const fullDeck = createDeck();
        shuffleDeck(fullDeck);

        const mid = Math.floor(fullDeck.length / 2);
        player1Deck = fullDeck.slice(0, mid);
        player2Deck = fullDeck.slice(mid);
        player1Discard = [];
        player2Discard = [];

        // Reset all stats
        player1WarsWon = 0;
        player2WarsWon = 0;
        player1HandsWon = 0;
        player2HandsWon = 0;
        totalHandsPlayed = 0;

        gameInProgress = true;
        turnInProgress = false;
        if (isAutoPlaying) {
            toggleAutoPlay();
        }

        playTurnBtn.disabled = false;
        autoPlayBtn.disabled = false;
        gameMessage.innerText = 'Game started! Click Play Turn or Auto Play.';

        clearAllPiles();
        updateAllStats();
    };

    const clearAllPiles = () => {
        player1PlayPileEl.innerHTML = '';
        player2PlayPileEl.innerHTML = '';
        player1WarPileEl.innerHTML = '';
        player2WarPileEl.innerHTML = '';
        // No discard piles to clear visually
    };

    /**
     * Checks if a deck is empty and shuffles the discard pile into it.
     * Returns true if a shuffle occurred, false otherwise.
     */
    const checkDeck = async (playerDeck, playerDiscardPile) => {
        if (playerDeck.length === 0 && playerDiscardPile.length > 0) {
            gameMessage.innerText = 'Shuffling...';
            shuffleDeck(playerDiscardPile);
            playerDeck.push(...playerDiscardPile);
            playerDiscardPile.length = 0; // Clear the discard pile array

            await sleep(RECYCLE_PAUSE_DURATION); // Pause for shuffle effect
            return true; // Deck was recycled
        }
        return false; // Deck was not recycled
    };


    const playTurn = async () => {
        if (!gameInProgress || turnInProgress) return;
        turnInProgress = true;
        playTurnBtn.disabled = true; // Disable during turn
        autoPlayBtn.disabled = true;

        // Clear piles from previous turn/war
        player1PlayPileEl.innerHTML = '';
        player2PlayPileEl.innerHTML = '';
        player1WarPileEl.innerHTML = '';
        player2WarPileEl.innerHTML = '';

        // Check and shuffle decks if empty
        const p1Shuffled = await checkDeck(player1Deck, player1Discard);
        const p2Shuffled = await checkDeck(player2Deck, player2Discard);

        // If either shuffled, update stats immediately to show full 'Cards Left'
        if (p1Shuffled || p2Shuffled) {
             updateAllStats();
        }

        // Check for game over (after potential shuffle)
        if (player1Deck.length === 0) {
            endGame('Player 1'); // Updated name
            return;
        }
        if (player2Deck.length === 0) {
            endGame('Tony');
            return;
        }

        // Update counts before playing card
        updateAllStats();

        const player1Card = player1Deck.pop();
        const player2Card = player2Deck.pop();

        const player1CardEl = createCardElement(player1Card);
        const player2CardEl = createCardElement(player2Card);

        player1PlayPileEl.appendChild(player1CardEl);
        player2PlayPileEl.appendChild(player2CardEl);

        const turnPile = [player1Card, player2Card]; // Cards involved in this specific turn/battle
        
        totalHandsPlayed++; // A hand is played (whether simple win or war)

        // Pause shorter if auto-playing
        await sleep(isAutoPlaying ? TURN_DURATION / 2 : TURN_DURATION);

        if (player1Card.value > player2Card.value) {
            gameMessage.innerText = 'Tony wins the hand!';
            player1HandsWon++; // Increment simple hand win
            collectPiles(player1Discard, turnPile);
        } else if (player2Card.value > player1Card.value) {
            gameMessage.innerText = 'Player 1 wins the hand!'; // Updated name
            player2HandsWon++; // Increment simple hand win
            collectPiles(player2Discard, turnPile);
        } else {
            gameMessage.innerText = 'WAR!';
            // Pause longer before war starts
            await sleep(TURN_DURATION);
            await handleWar(turnPile); // turnPile accumulates all war cards
        }

        // Update stats after turn/war is fully resolved
        updateAllStats();

        // Check for game over again after collecting cards
        // Check includes discard pile - game ends only when a player has ZERO cards total
        if (player1Deck.length === 0 && player1Discard.length === 0) {
            endGame('Player 1'); // Updated name
        } else if (player2Deck.length === 0 && player2Discard.length === 0) {
            endGame('Tony');
        } else {
            // Re-enable buttons if game not over
             turnInProgress = false;
             if (!isAutoPlaying) {
                 playTurnBtn.disabled = false;
                 autoPlayBtn.disabled = false;
             }
        }
    };

    const handleWar = async (turnPile) => {
        gameMessage.innerText = 'WAR!';

        // Check if players *can* play war (need at least 4 cards total)
        const p1TotalCards = player1Deck.length + player1Discard.length;
        const p2TotalCards = player2Deck.length + player2Discard.length;

        // If a player has fewer than 4 cards TOTAL, they can't play war and lose immediately
        if (p1TotalCards < 4) {
            gameMessage.innerText = 'Tony doesn\'t have enough cards for War! Player 1 wins the game!'; // Updated name
            // Give all remaining cards to opponent
            collectPiles(player2Discard, turnPile);
            collectPiles(player2Discard, player1Deck);
            collectPiles(player2Discard, player1Discard);
            player1Deck = [];
            player1Discard = [];
            return; // War ends, let playTurn finish
        }
        if (p2TotalCards < 4) {
            gameMessage.innerText = 'Player 1 doesn\'t have enough cards for War! Tony wins the game!'; // Updated name
            // Give all remaining cards to Tony
            collectPiles(player1Discard, turnPile);
            collectPiles(player1Discard, player2Deck);
            collectPiles(player1Discard, player2Discard);
            player2Deck = [];
            player2Discard = [];
            return; // War ends, let playTurn finish
        }

        // Both players have enough cards, proceed with war sequence
        const player1WarCards = [];
        const player2WarCards = [];

        // Draw 3 spoil cards + 1 battle card for each player
        for (let i = 0; i < 4; i++) {
            await checkDeck(player1Deck, player1Discard);
            if (player1Deck.length > 0) {
                player1WarCards.push(player1Deck.pop());
            } else {
                gameMessage.innerText = 'Tony ran out of cards during War! Player 1 wins!'; // Updated name
                collectPiles(player2Discard, turnPile);
                collectPiles(player2Discard, player1WarCards); 
                collectPiles(player2Discard, player1Discard); 
                player1Deck = []; player1Discard = [];
                return;
            }

            await checkDeck(player2Deck, player2Discard);
            if (player2Deck.length > 0) {
                player2WarCards.push(player2Deck.pop());
            } else {
                gameMessage.innerText = 'Player 1 ran out of cards during War! Tony wins!'; // Updated name
                collectPiles(player1Discard, turnPile);
                collectPiles(player1Discard, player2WarCards);
                collectPiles(player1Discard, player2Discard);
                player2Deck = []; player2Discard = [];
                return;
            }
        }
         // If we reach here, both players successfully drew 4 cards

        // Add all 8 war cards to the main turn pile to be collected by winner
        turnPile.push(...player1WarCards, ...player2WarCards);
        updateAllStats(); // Update counts after drawing

        // --- Visual Staggered Display ---
        let dramaticPauseNeeded = false;
        for (let i = 0; i < 3; i++) { // Loop for 3 spoil cards
            gameMessage.innerText = `War: Playing spoil card ${i + 1}...`;

            // Player 1 Spoil Card
            const p1SpoilCard = player1WarCards[i];
            const p1SpoilEl = createCardElement(p1SpoilCard, true); // FACE UP
            p1SpoilEl.style.left = `${i * 20}px`; // Stagger
            player1WarPileEl.appendChild(p1SpoilEl);

            if (p1SpoilCard.value === 14 || p1SpoilCard.value === 13) {
                 p1SpoilEl.classList.add('highlight-power-card');
                 dramaticPauseNeeded = true;
            }

            await sleep(WAR_PACE_DURATION);

            // Player 2 Spoil Card
            const p2SpoilCard = player2WarCards[i];
            const p2SpoilEl = createCardElement(p2SpoilCard, true); // FACE UP
            p2SpoilEl.style.left = `${i * 20}px`; // Stagger
            player2WarPileEl.appendChild(p2SpoilEl);

            if (p2SpoilCard.value === 14 || p2SpoilCard.value === 13) {
                 p2SpoilEl.classList.add('highlight-power-card');
                 dramaticPauseNeeded = true;
            }

            if (dramaticPauseNeeded) {
                 await sleep(DRAMATIC_PAUSE_DURATION);
                 p1SpoilEl.classList.remove('highlight-power-card');
                 p2SpoilEl.classList.remove('highlight-power-card');
                 dramaticPauseNeeded = false; 
            } else {
                 await sleep(WAR_PACE_DURATION); 
            }
        }

        // --- Play the 4th (Battle) Card ---
        gameMessage.innerText = 'War: Playing BATTLE cards!';
        const player1BattleCard = player1WarCards[3];
        const player2BattleCard = player2WarCards[3];

        const p1BattleEl = createCardElement(player1BattleCard, true);
        p1BattleEl.style.left = `${3 * 20}px`; // Stagger
        player1WarPileEl.appendChild(p1BattleEl);

        const p2BattleEl = createCardElement(player2BattleCard, true);
        p2BattleEl.style.left = `${3 * 20}px`; // Stagger
        player2WarPileEl.appendChild(p2BattleEl);

        await sleep(isAutoPlaying ? TURN_DURATION / 2 : TURN_DURATION); // Pause to see battle cards

        // --- Resolve War ---
        if (player1BattleCard.value > player2BattleCard.value) {
            gameMessage.innerText = 'Tony wins the WAR!';
            player1WarsWon++;
            player1HandsWon++; // <<< FIX IS HERE
            collectPiles(player1Discard, turnPile); // Winner gets ALL cards from turnPile
        } else if (player2BattleCard.value > player1BattleCard.value) {
            gameMessage.innerText = 'Player 1 wins the WAR!'; // Updated name
            player2WarsWon++;
            player2HandsWon++; // <<< FIX IS HERE
            collectPiles(player2Discard, turnPile); // Winner gets ALL cards from turnPile
        } else {
            gameMessage.innerText = 'WAR... AGAIN!';
             // Clear only the war piles visually before the next round of war
             player1WarPileEl.innerHTML = '';
             player2WarPileEl.innerHTML = '';
            await sleep(TURN_DURATION);
            await handleWar(turnPile); // Recursive call - turnPile carries over
        }
    };

    /**
     * Adds all cards from the pile array to the winner's discard array.
     */
    const collectPiles = (winnerDiscard, pile) => {
        winnerDiscard.push(...pile);
    };

    const endGame = (winner) => {
        gameInProgress = false;
        turnInProgress = false;
        if (isAutoPlaying) {
            toggleAutoPlay(); // Stop auto-play
        }
        playTurnBtn.disabled = true;
        autoPlayBtn.disabled = true;
        gameMessage.innerText = `${winner} wins the game! Click Start Game to play again.`;
    };

    const toggleAutoPlay = () => {
        isAutoPlaying = !isAutoPlaying;
        if (isAutoPlaying) {
            autoPlayBtn.innerText = 'Pause Auto';
            autoPlayBtn.classList.add('playing');
            playTurnBtn.disabled = true; // Disable manual play

            const autoPlayLoop = async () => {
                if (isAutoPlaying && gameInProgress && !turnInProgress) { 
                    await playTurn();
                    if(isAutoPlaying) { 
                        autoPlayInterval = setTimeout(autoPlayLoop, 100); 
                    }
                } else if (!isAutoPlaying) {
                    playTurnBtn.disabled = !gameInProgress;
                    autoPlayBtn.disabled = !gameInProgress;
                }
            };
            autoPlayLoop();

        } else {
            autoPlayBtn.innerText = 'Auto Play';
            autoPlayBtn.classList.remove('playing');
            if (autoPlayInterval) {
                clearTimeout(autoPlayInterval);
                autoPlayInterval = null;
            }
             playTurnBtn.disabled = !gameInProgress;
             autoPlayBtn.disabled = !gameInProgress;
             turnInProgress = false; 
        }
    };

    // --- Event Listeners ---
    startGameBtn.addEventListener('click', initGame);
    playTurnBtn.addEventListener('click', () => {
        if (!turnInProgress) playTurn(); 
    });
    autoPlayBtn.addEventListener('click', toggleAutoPlay);

    // Initial setup on load
    initGame(); 
    playTurnBtn.disabled = true; 
    autoPlayBtn.disabled = true;
    gameMessage.innerText = 'Welcome to War! Click Start Game to begin.';
});
