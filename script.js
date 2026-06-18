let players = [];
let activePlayers = [];
let eliminatedPlayers = [];
let gameHistory = [];
let roundNumber = 0;
let gameStarted = false;

// --- Player Management ---

function addPlayer() {
    if (gameStarted) {
        alert('Cannot add players once the game has started!');
        return;
    }
    const playerNameInput = document.getElementById('playerNameInput');
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        alert('Please enter a player name.');
        return;
    }
    if (players.map(p => p.name.toLowerCase()).includes(playerName.toLowerCase())) {
        alert('Player name already exists!');
        return;
    }

    players.push({ id: Date.now(), name: playerName, totalScore: 0 });
    renderPlayers();
    playerNameInput.value = '';
}

function removePlayer(id) {
    if (gameStarted) return;
    players = players.filter(p => p.id !== id);
    renderPlayers();
}

function renderPlayers() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';

    players.forEach(player => {
        const isOut = eliminatedPlayers.some(e => e.id === player.id);
        const li = document.createElement('li');
        li.className = isOut ? 'player-out' : '';
        li.innerHTML = `
            <span class="player-name">${player.name}${isOut ? ' 💀 OUT' : ''}</span>
            <span class="total-score ${isOut ? 'score-out' : ''}">Total: ${player.totalScore}</span>
            ${!gameStarted ? `<button onclick="removePlayer(${player.id})" class="remove-button">Remove</button>` : ''}
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

    // Reset everything
    players.forEach(p => p.totalScore = 0);
    activePlayers = [...players];
    eliminatedPlayers = [];
    gameHistory = [];
    roundNumber = 0;
    gameStarted = true;

    document.getElementById('winnerDisplay').innerHTML = '';
    document.getElementById('winnerDisplay').className = 'winner-display';
    renderPlayers();
    startNextRound();
}

function startNextRound() {
    // If only one remains — they win
    if (activePlayers.length === 1) {
        announceWinner(activePlayers[0]);
        return;
    }
    // Nobody left (all went out in same round) — lowest score wins
    if (activePlayers.length === 0) {
        const winner = [...players].sort((a, b) => a.totalScore - b.totalScore)[0];
        announceWinner(winner);
        return;
    }

    roundNumber++;
    const gameDiv = document.getElementById('gameArea');

    let html = `<h3>Round ${roundNumber}</h3>`;
    html += '<table>';
    html += '<thead><tr><th>Player</th><th>Score So Far</th><th>Points This Round</th></tr></thead><tbody>';

    activePlayers.forEach(player => {
        html += `
            <tr>
                <td><strong>${player.name}</strong></td>
                <td>${player.totalScore}</td>
                <td><input type="number" class="score-input" id="score_${player.id}" min="0" value="0"></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    html += `<button onclick="finishRound()">✔ Finish Round</button>`;
    gameDiv.innerHTML = html;
}

function finishRound() {
    const roundScores = {};
    const knockedOut = [];

    // Add scores
    activePlayers.forEach(player => {
        const input = document.getElementById(`score_${player.id}`);
        let pts = parseInt(input ? input.value : '0', 10);
        if (isNaN(pts) || pts < 0) pts = 0;
        player.totalScore += pts;
        roundScores[player.id] = pts;
    });

    gameHistory.push(roundScores);

    // Find who just hit 201+
    activePlayers.forEach(player => {
        if (player.totalScore >= 201) {
            knockedOut.push(player);
            eliminatedPlayers.push(player);
        }
    });

    // Remove them from active
    activePlayers = activePlayers.filter(p => p.totalScore < 201);

    renderPlayers();

    if (knockedOut.length > 0) {
        showEliminationBanner(knockedOut, () => {
            if (activePlayers.length <= 1) {
                if (activePlayers.length === 1) {
                    announceWinner(activePlayers[0]);
                } else {
                    // All went out same round — lowest score is winner
                    const winner = [...players].sort((a, b) => a.totalScore - b.totalScore)[0];
                    announceWinner(winner);
                }
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

function showEliminationBanner(knocked, callback) {
    const banner = document.getElementById('winnerDisplay');
    const names = knocked.map(p => `<strong>${p.name}</strong> (${p.totalScore} pts)`).join(', ');
    banner.className = 'winner-display elimination-display';
    banner.innerHTML = `
        🚫 ${names} ${knocked.length > 1 ? 'are' : 'is'} <strong>OUT!</strong> — reached 201+<br>
        <small>${activePlayers.length > 0 ? `${activePlayers.length} player(s) continue...` : 'Deciding winner...'}</small>
    `;

    setTimeout(() => {
        banner.innerHTML = '';
        banner.className = 'winner-display';
        callback();
    }, 3000);
}

function announceWinner(winner) {
    document.getElementById('gameArea').innerHTML = '';
    gameStarted = false;
    renderPlayers(); // Re-render to show remove buttons again

    const banner = document.getElementById('winnerDisplay');
    banner.className = 'winner-display winner-final';
    banner.innerHTML = `
        🏆 <strong>${winner.name} wins!</strong><br>
        <span style="font-size:0.9em">Final score: ${winner.totalScore} pts &nbsp;|&nbsp; ${roundNumber} rounds played</span><br>
        <button onclick="resetGame()" style="margin-top:14px;">🔄 Play Again</button>
    `;
}

function resetGame() {
    players.forEach(p => p.totalScore = 0);
    activePlayers = [...players];
    eliminatedPlayers = [];
    gameHistory = [];
    roundNumber = 0;
    gameStarted = false;
    document.getElementById('winnerDisplay').innerHTML = '';
    document.getElementById('winnerDisplay').className = 'winner-display';
    document.getElementById('gameArea').innerHTML = '';
    renderPlayers();
}

// Initial render
renderPlayers();
