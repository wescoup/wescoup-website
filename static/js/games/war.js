document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startGameBtn = document.getElementById('start-game');
    const playTurnBtn = document.getElementById('play-turn');
    const autoPlayBtn = document.getElementById('auto-play');
    const gameMessage = document.getElementById('game-message');

    const player1DeckCountEl = document.getElementById('player-1-deck-count');
    const player1PlayPileEl = document.getElementById('player-1-play-pile');
    const player1WarPileEl = document.getElementById('player-war-pile');
    const player1DiscardPileEl = document.getElementById('player-1-discard-pile');

    const player2DeckCountEl = document.getElementById('player-2-deck-count');
    const player2PlayPileEl = document.getElementById('player-2-play-pile');
    const player2WarPileEl = document.getElementById('opponent-war-pile');
    const player2DiscardPileEl = document.getElementById('player-2-discard-pile');

    // New Stat DOM Elements
    const player1AcesEl = document.getElementById('player-1-aces');
    const player1KingsEl = document.getElementById('player-1-kings');
    const player1WarsEl = document.getElementById('player-1-wars');
    const player2AcesEl = document.getElementById('player-2-aces');
    const player2KingsEl = document.getElementById('player-2-kings');
    const player2WarsEl = document.getElementById('player-2-wars');

    // --- Game State Variables ---
    const SUITS = ['♥', '♦', '♠', '♣'];
    const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // J=11, Q=12, K=13, A=14
    
    let player1Deck, player2Deck;
    let player1Discard, player2Discard;
    let gameInProgress = false;
    let turnInProgress = false;

    // New Stats Variables
    let player1WarsWon = 0;
    let player2WarsWon = 0;

    // New Auto-Play Variables
    let isAutoPlaying = false;
    let autoPlayInterval = null;
    const TURN_DURATION = 750; // ms for a regular turn
    const WAR_PACE_DURATION = 500; // ms between each war card
    const DRAMATIC_PAUSE_DURATION = 1000; // ms for Ace/King reveal
    const RECYCLE_PAUSE_DURATION = 1000; // ms for shuffling discard
    
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

    const createCardElement = (card, faceUp = true) => {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        if (faceUp) {
            const valueMap = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
            cardEl.innerText = valueMap[card.value] || card.value;
            cardEl.classList.add(card.suit === '♥' || card.suit === '♦' ? 'red' : 'black');
            if (card.value === 14 || card.value === 13) {
                cardEl.classList.add('power-card'); // Just a marker
            }
        } else {
            cardEl.classList.add('card-back');
        }
        return cardEl;
    };

    // --- Stat Update Functions ---

    /**
     * Counts Aces and Kings in a player's entire card collection (deck + discard).
     */
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
        // Player 1 (Tony) Stats
        const p1Stats = countPowerCards(player1Deck, player1Discard);
        player1AcesEl.innerText = `Aces: ${p1Stats.aces}`;
        player1KingsEl.innerText = `Kings: ${p1Stats.kings}`;
        player1WarsEl.innerText = `Wars Won: ${player1WarsWon}`;
        player1DeckCountEl.innerText = `Cards: ${player1Deck.length + player1Discard.length}`;
        
        // Player 2 (Opponent) Stats
        const p2Stats = countPowerCards(player2Deck, player2Discard);
        player2AcesEl.innerText = `Aces: ${p2Stats.aces}`;
        player2KingsEl.innerText = `Kings: ${p2Stats.kings}`;
        player2WarsEl.innerText = `Wars Won: ${player2WarsWon}`;
        player2DeckCountEl.innerText = `Cards: ${player2Deck.length + player2Discard.length}`;
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

        player1WarsWon = 0;
        player2WarsWon = 0;

        gameInProgress = true;
        turnInProgress = false;
        if (isAutoPlaying) {
            toggleAutoPlay(); // Stop auto-play if it was running
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
        player1DiscardPileEl.innerHTML = '';
        player2DiscardPileEl.innerHTML = '';
    };

    const checkDeck = async (playerDeck, playerDiscardPile) => {
        if (playerDeck.length === 0 && playerDiscardPile.length > 0) {
            gameMessage.innerText = 'Shuffling discard pile...';
            shuffleDeck(playerDiscardPile);
            playerDeck.push(...playerDiscardPile);
            playerDiscardPile.length = 0; // Clear the discard pile array
            
            // Visually clear discard pile element
            const discardEl = (playerDeck === player1Deck) ? player1DiscardPileEl : player2DiscardPileEl;
            discardEl.innerHTML = '';
            
            await sleep(RECYCLE_PAUSE_DURATION); // Pause for shuffle
            return true; // Deck was recycled
        }
        return false; // Deck was not recycled
    };

    const playTurn = async () => {
        if (!gameInProgress || turnInProgress) return;
        turnInProgress = true;

        // Clear piles from previous turn
        player1PlayPileEl.innerHTML = '';
        player2PlayPileEl.innerHTML = '';
        player1WarPileEl.innerHTML = '';
        player2WarPileEl.innerHTML = '';

        // Check and shuffle decks if empty
        await checkDeck(player1Deck, player1Discard);
        await checkDeck(player2Deck, player2Discard);

        // Check for game over
        if (player1Deck.length === 0) {
            endGame('Opponent');
            return;
        }
        if (player2Deck.length === 0) {
            endGame('Tony');
            return;
        }
        
        updateAllStats(); // Update counts before playing

        const player1Card = player1Deck.pop();
        const player2Card = player2Deck.pop();

        const player1CardEl = createCardElement(player1Card);
        const player2CardEl = createCardElement(player2Card);

        player1PlayPileEl.appendChild(player1CardEl);
        player2PlayPileEl.appendChild(player2CardEl);

        const turnPile = [player1Card, player2Card];

        await sleep(TURN_DURATION); // Pause to see cards

        if (player1Card.value > player2Card.value) {
            gameMessage.innerText = 'Tony wins the hand!';
            collectPiles(player1Discard, turnPile);
        } else if (player2Card.value > player1Card.value) {
            gameMessage.innerText = 'Opponent wins the hand!';
            collectPiles(player2Discard, turnPile);
        } else {
            gameMessage.innerText = 'WAR!';
            await sleep(TURN_DURATION); // Pause before war
            await handleWar(turnPile);
        }

        // Update stats after turn is resolved
        updateAllStats();
        
        // Add played cards to visual discard piles (if they exist)
        updateVisualDiscard(player1Discard, player1DiscardPileEl);
        updateVisualDiscard(player2Discard, player2DiscardPileEl);

        turnInProgress = false;

        // Check for game over again after turn
        if (player1Deck.length === 0 && player1Discard.length === 0) {
            endGame('Opponent');
        } else if (player2Deck.length === 0 && player2Discard.length === 0) {
            endGame('Tony');
        }
    };

    const handleWar = async (turnPile) => {
        // Ensure both players have enough cards for war
        const p1CardsNeeded = Math.min(4, player1Deck.length + player1Discard.length);
        const p2CardsNeeded = Math.min(4, player2Deck.length + player2Discard.length);

        // If a player can't play, they lose
        if (p1CardsNeeded < 4) {
            gameMessage.innerText = 'Tony doesn\'t have enough cards for War! Opponent wins!';
            collectPiles(player2Discard, turnPile);
            collectPiles(player2Discard, player1Deck);
            collectPiles(player2Discard, player1Discard);
            player1Deck = [];
            player1Discard = [];
            return; // War ends
        }
        if (p2CardsNeeded < 4) {
            gameMessage.innerText = 'Opponent doesn\'t have enough cards for War! Tony wins!';
            collectPiles(player1Discard, turnPile);
            collectPiles(player1Discard, player2Deck);
            collectPiles(player1Discard, player2Discard);
            player2Deck = [];
            player2Discard = [];
            return; // War ends
        }

        // Both players have enough cards, proceed
        const warSpoils = [];

        // Draw 3 spoil cards + 1 battle card for each player
        const player1WarCards = [];
        const player2WarCards = [];

        for (let i = 0; i < 4; i++) {
            await checkDeck(player1Deck, player1Discard);
            player1WarCards.push(player1Deck.pop());
            await checkDeck(player2Deck, player2Discard);
            player2WarCards.push(player2Deck.pop());
        }

        // Add all 8 cards to the main turn pile
        turnPile.push(...player1WarCards, ...player2WarCards);

        // --- Visual Staggered Display ---
        for (let i = 0; i < 3; i++) { // Loop for 3 spoil cards
            gameMessage.innerText = `War: Playing spoil card ${i + 1}...`;
            
            // Player 1 Spoil Card
            const p1SpoilCard = player1WarCards[i];
            const p1SpoilEl = createCardElement(p1SpoilCard, true); // FACE UP
            p1SpoilEl.style.left = `${i * 20}px`; // Stagger
            player1WarPileEl.appendChild(p1SpoilEl);
            
            if (p1SpoilCard.value === 14 || p1SpoilCard.value === 13) {
                p1SpoilEl.classList.add('highlight-power-card');
                await sleep(DRAMATIC_PAUSE_DURATION); // Dramatic pause!
                p1SpoilEl.classList.remove('highlight-power-card');
            }

            await sleep(WAR_PACE_DURATION);

            // Player 2 Spoil Card
            const p2SpoilCard = player2WarCards[i];
            const p2SpoilEl = createCardElement(p2SpoilCard, true); // FACE UP
            p2SpoilEl.style.left = `${i * 20}px`; // Stagger
            player2WarPileEl.appendChild(p2SpoilEl);

            if (p2SpoilCard.value === 14 || p2SpoilCard.value === 13) {
                p2SpoilEl.classList.add('highlight-power-card');
                await sleep(DRAMATIC_PAUSE_DURATION); // Dramatic pause!
                p2SpoilEl.classList.remove('highlight-power-card');
            }
            
            await sleep(WAR_PACE_DURATION);
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
        
        await sleep(TURN_DURATION); // Pause to see battle cards

        // --- Resolve War ---
        if (player1BattleCard.value > player2BattleCard.value) {
            gameMessage.innerText = 'Tony wins the WAR!';
            player1WarsWon++; // Increment stat
            collectPiles(player1Discard, turnPile);
        } else if (player2BattleCard.value > player1BattleCard.value) {
            gameMessage.innerText = 'Opponent wins the WAR!';
            player2WarsWon++; // Increment stat
            collectPiles(player2Discard, turnPile);
        } else {
            gameMessage.innerText = 'WAR... AGAIN!';
            await sleep(TURN_DURATION);
            await handleWar(turnPile); // Recursive call for another war
        }
    };

    const collectPiles = (winnerDiscard, pile) => {
        winnerDiscard.push(...pile);
        pile.length = 0; // Clear the temporary pile
    };

    /**
     * Updates the visual discard pile (shows top card).
     */
    const updateVisualDiscard = (discardPile, discardEl) => {
        if (discardPile.length > 0) {
            const topCard = discardPile[discardPile.length - 1];
            // Simple visual: just show the top card, face up
            discardEl.innerHTML = ''; // Clear previous
            discardEl.appendChild(createCardElement(topCard, true));
        } else {
            discardEl.innerHTML = ''; // Empty
        }
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
            
            // Start the loop
            const autoPlayLoop = async () => {
                if (isAutoPlaying && gameInProgress) {
                    await playTurn();
                    // Schedule the next turn. Using setTimeout ensures
                    // we wait for the (async) playTurn to complete.
                    if(isAutoPlaying) {
                        autoPlayInterval = setTimeout(autoPlayLoop, 100); // Short delay between turns
                    }
                }
            };
            autoPlayLoop();

        } else {
            autoPlayBtn.innerText = 'Auto Play';
            autoPlayBtn.classList.remove('playing');
            playTurnBtn.disabled = false; // Re-enable manual play
            if (autoPlayInterval) {
                clearTimeout(autoPlayInterval);
                autoPlayInterval = null;
            }
        }
    };

    // --- Event Listeners ---
    startGameBtn.addEventListener('click', initGame);
    playTurnBtn.addEventListener('click', playTurn);
    autoPlayBtn.addEventListener('click', toggleAutoPlay);
});
