let players = [];
let gameHistory = []; // To store scores for each game
let currentPlayerIndex = 0;

// --- Player Management ---

function addPlayer() {
    const playerNameInput = document.getElementById('playerNameInput');
    const playerName = playerNameInput.value.trim();

    if (playerName && !players.map(p => p.name).includes(playerName)) {
        players.push({ id: Date.now(), name: playerName, totalScore: 0 });
        renderPlayers();
        playerNameInput.value = '';
    } else if (players.map(p => p.name).includes(playerName)) {
        alert('Player name already exists!');
    } else {
        alert('Please enter a player name.');
    }
}

function removePlayer(id) {
    players = players.filter(player => player.id !== id);
    renderPlayers();
}

function renderPlayers() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';

    players.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="total-score">Total: ${player.totalScore}</span>
            <button onclick="removePlayer(${player.id})" class="remove-button">Remove</button>
        `;
        playerList.appendChild(li);
    });
}

// --- Game Logic ---

function newGame() {
    if (players.length < 2) {
        alert('At least two players are required to start a game.');
        return;
    }
    document.getElementById('gameArea').innerHTML = ''; // Clear previous game area
    document.getElementById('winnerDisplay').innerHTML = ''; // Clear previous winner display

    const gameDiv = document.getElementById('gameArea');
    let gameHtml = `<h3>Game ${gameHistory.length + 1} - Enter Scores</h3>`;
    gameHtml += '<table>';
    gameHtml += '<thead><tr><th>Player</th><th>Points</th></tr></thead>';
    gameHtml += '<tbody>';

    // Initialize scores for the current game if it's the first game or players were added/removed
    if (players.some(p => !p.currentRoundScores)) {
        players.forEach(player => {
            player.currentRoundScores = {};
        });
    }

    players.forEach((player, index) => {
        gameHtml += `
            <tr>
                <td>${player.name}</td>
                <td><input type="number" class="score-input" id="score_${player.id}" min="0" value="0" onchange="updateScore(${player.id}, ${index})"></td>
            </tr>
        `;
    });

    gameHtml += '</tbody></table>';
    gameHtml += `<button onclick="finishRound()">Finish Round</button>`;
    gameDiv.innerHTML = gameHtml;
}

function updateScore(playerId, playerIndex) {
    const scoreInput = document.getElementById(`score_${playerId}`);
    const points = parseInt(scoreInput.value, 10);

    if (!isNaN(points) && points >= 0) {
        // Find player by ID and update their score for the current round
        const player = players.find(p => p.id === playerId);
        if (player) {
            player.currentRoundScores[gameHistory.length] = points;
        }
    } else {
        // Reset to 0 if input is invalid
        scoreInput.value = '0';
        const player = players.find(p => p.id === playerId);
        if (player) {
            player.currentRoundScores[gameHistory.length] = 0;
        }
    }
}

function finishRound() {
    const roundScores = {};
    let allPlayersEntered = true;

    players.forEach(player => {
        const scoreInput = document.getElementById(`score_${player.id}`);
        let points = 0;
        if (scoreInput) {
            points = parseInt(scoreInput.value, 10);
            if (isNaN(points) || points < 0) {
                points = 0; // Default to 0 if input is invalid
                scoreInput.value = '0';
            }
        } else {
            // If input element doesn't exist (e.g., player was removed mid-game)
            points = 0;
        }

        player.currentRoundScores[gameHistory.length] = points; // Store score for this round
        roundScores[player.id] = points;
        player.totalScore += points;
    });

    gameHistory.push(roundScores); // Save scores for this round
    renderPlayers(); // Update total scores displayed
    checkForWinner();

    // Clear current round scores for next game
    players.forEach(player => {
        player.currentRoundScores = {};
    });
}


function checkForWinner() {
    const winnerDisplay = document.getElementById('winnerDisplay');
    let potentialWinner = null;
    let allPlayersFinished = true;

    players.forEach(player => {
        if (player.totalScore >= 201) {
            // This player has exceeded 200 points
        } else {
            allPlayersFinished = false; // There's at least one player under 201
            potentialWinner = player; // Keep track of the last player under 201
        }
    });

    if (allPlayersFinished && players.length > 0) {
        // All players are under or at 200 and at least one player exists
        players.sort((a, b) => a.totalScore - b.totalScore); // Sort by total score ascending

        if (players.length > 0 && players[0].totalScore <= 200) {
             winnerDisplay.innerHTML = `Congratulations ${players[0].name}, you are the winner!`;
        } else {
            // This case might happen if all players somehow reach exactly 201 or more in the final round
            winnerDisplay.innerHTML = "It's a tie or no clear winner this round!";
        }

        // Reset for a new session after winner is declared
        // players = [];
        // gameHistory = [];
        // renderPlayers();
        // document.getElementById('gameArea').innerHTML = ''; (optional: clear game area too)
    }
}

// Initial render
renderPlayers();