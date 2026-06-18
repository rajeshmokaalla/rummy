let players = [];
let activePlayers = []; // Players still in the game
let gameHistory = [];
let roundNumber = 0;

// --- Player Management ---

function addPlayer() {
    const playerNameInput = document.getElementById('playerNameInput');
    const playerName = playerNameInput.value.trim();

    if (playerName && !players.map(p => p.name).includes(playerName)) {
        players.push({ id: Date.now(), name: playerName, totalScore: 0 });
        activePlayers = [...players];
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
    activePlayers = activePlayers.filter(player => player.id !== id);
    renderPlayers();
}

function renderPlayers() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';

    players.forEach(player => {
        const isOut = player.totalScore >= 201;
        const li = document.createElement('li');
        li.className = isOut ? 'player-out' : '';
        li.innerHTML = `
            <span class="player-name">${player.name}${isOut ? ' 💀 OUT' : ''}</span>
            <span class="total-score">Total: ${player.totalScore}</span>
            ${!isOut ? `<button onclick="removePlayer(${player.id})" class="remove-button">Remove</button>` : ''}
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

    // Reset all scores and active players
    players.forEach(p => p.totalScore = 0);
    activePlayers = [...players];
    gameHistory = [];
    roundNumber = 0;

    document.getElementById('winnerDisplay').innerHTML = '';
    renderPlayers();
    startNextRound();
}

function startNextRound() {
    if (activePlayers.length === 1) {
        announceWinner(activePlayers[0]);
        return;
    }
    if (activePlayers.length === 0) {
        document.getElementById('winnerDisplay').innerHTML = "No players remaining!";
        return;
    }

    roundNumber++;
    const gameDiv = document.getElementById('gameArea');
    let gameHtml = `<h3>Round ${roundNumber} — Enter Scores</h3>`;
    gameHtml += '<table>';
    gameHtml += '<thead><tr><th>Player</th><th>Current Total</th><th>Points This Round</th></tr></thead>';
    gameHtml += '<tbody>';

    activePlayers.forEach(player => {
        gameHtml += `
            <tr>
                <td>${player.name}</td>
                <td>${player.totalScore}</td>
                <td><input type="number" class="score-input" id="score_${player.id}" min="0" value="0"></td>
            </tr>
        `;
    });

    gameHtml += '</tbody></table>';
    gameHtml += `<button onclick="finishRound()">Finish Round</button>`;
    gameDiv.innerHTML = gameHtml;
}

function finishRound() {
    const roundScores = {};
    const eliminatedThisRound = [];

    activePlayers.forEach(player => {
        const scoreInput = document.getElementById(`score_${player.id}`);
        let points = 0;
        if (scoreInput) {
            points = parseInt(scoreInput.value, 10);
            if (isNaN(points) || points < 0) points = 0;
        }
        player.totalScore += points;
        roundScores[player.id] = points;
    });

    gameHistory.push(roundScores);

    // Check eliminations
    activePlayers.forEach(player => {
        if (player.totalScore >= 201) {
            eliminatedThisRound.push(player);
        }
    });

    // Remove eliminated players from active list
    activePlayers = activePlayers.filter(p => p.totalScore < 201);

    renderPlayers();

    // Announce eliminations
    if (eliminatedThisRound.length > 0) {
        showEliminationMessage(eliminatedThisRound, () => {
            if (activePlayers.length === 1) {
                announceWinner(activePlayers[0]);
            } else if (activePlayers.length === 0) {
                // Everyone went out in the same round — lowest score wins
                const sorted = [...players].filter(p => p.totalScore >= 201).sort((a, b) => a.totalScore - b.totalScore);
                announceWinner(sorted[0]);
            } else {
                startNextRound();
            }
        });
    } else {
        if (activePlayers.length === 1) {
            announceWinner(activePlayers[0]);
        } else {
            startNextRound();
        }
    }
}

function showEliminationMessage(eliminatedPlayers, callback) {
    const names = eliminatedPlayers.map(p => `${p.name} (${p.totalScore} pts)`).join(', ');
    const winnerDisplay = document.getElementById('winnerDisplay');

    winnerDisplay.className = 'winner-display elimination-display';
    winnerDisplay.innerHTML = `
        🚫 <strong>${names}</strong> ${eliminatedPlayers.length > 1 ? 'are' : 'is'} OUT! (reached 201+)<br>
        <small>Continuing with remaining players...</small>
    `;

    // Auto-dismiss after 3 seconds and continue
    setTimeout(() => {
        winnerDisplay.innerHTML = '';
        winnerDisplay.className = 'winner-display';
        callback();
    }, 3000);
}

function announceWinner(winner) {
    document.getElementById('gameArea').innerHTML = '';
    const winnerDisplay = document.getElementById('winnerDisplay');
    winnerDisplay.className = 'winner-display';
    winnerDisplay.innerHTML = `
        🏆 <strong>${winner.name} wins!</strong><br>
        Final score: ${winner.totalScore} pts after ${roundNumber} rounds.<br>
        <button onclick="newGame()" style="margin-top:12px;">Play Again</button>
    `;
}

// Initial render
renderPlayers();
