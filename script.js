let players = [];
let activePlayers = [];
let eliminatedPlayers = [];
let gameHistory = [];
let roundNumber = 0;
let gameStarted = false;
let rejoinCounts = {}; // id -> number of times re-joined

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

    // Highest score among currently active (not-out) players
    const highestActiveScore = activePlayers.length > 0
        ? Math.max(...activePlayers.map(p => p.totalScore))
        : 0;
    const rejoinBlocked = gameStarted && highestActiveScore > 180;

    players.forEach(player => {
        const isOut = eliminatedPlayers.some(e => e.id === player.id);
        const rejoins = rejoinCounts[player.id] || 0;
        const li = document.createElement('li');
        li.className = isOut ? 'player-out' : '';

        let actionBtn = '';
        if (!gameStarted) {
            actionBtn = `<button onclick="removePlayer(${player.id})" class="remove-button">Remove</button>`;
        } else if (isOut && !rejoinBlocked) {
            actionBtn = `<button onclick="rejoinPlayer(${player.id})" class="rejoin-button">↩ Re-join</button>`;
        }

        const rejoinBadge = rejoins > 0
            ? `<span class="rejoin-count-badge" title="${rejoins} re-join(s)">↩×${rejoins}</span>`
            : '';

        li.innerHTML = `
            <span class="player-name">${player.name}${isOut ? ' 💀 OUT' : ''}${rejoinBadge}</span>
            <span class="total-score ${isOut ? 'score-out' : ''}">Total: ${player.totalScore}</span>
            ${actionBtn}
        `;
        playerList.appendChild(li);
    });

    // Show or hide the no-rejoin notice at the bottom of the players section
    let notice = document.getElementById('rejoinBlockedNotice');
    if (rejoinBlocked && eliminatedPlayers.length > 0) {
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'rejoinBlockedNotice';
            notice.className = 'rejoin-blocked-notice';
            document.querySelector('.players-section').appendChild(notice);
        }
        notice.innerHTML = `⚠️ Re-join not available — highest active score is <strong>${highestActiveScore}</strong> (above 180). No drop chance remaining.`;
    } else {
        if (notice) notice.remove();
    }
}

// --- Re-join Logic ---

function rejoinPlayer(id) {
    const player = players.find(p => p.id === id);
    if (!player) return;
    if (!eliminatedPlayers.some(e => e.id === id)) return;

    if (activePlayers.length === 0) {
        alert('No active players to re-join against!');
        return;
    }
    const highestScore = Math.max(...activePlayers.map(p => p.totalScore));
    const confirmMsg = `${player.name} will re-join with ${highestScore} points (highest active score). Confirm?`;
    if (!confirm(confirmMsg)) return;

    // Track rejoin
    rejoinCounts[id] = (rejoinCounts[id] || 0) + 1;

    player.totalScore = highestScore;
    eliminatedPlayers = eliminatedPlayers.filter(e => e.id !== id);
    activePlayers.push(player);

    renderPlayers();

    // Inject row into current round table if one is active
    const tbody = document.querySelector('#gameArea table tbody');
    if (tbody) {
        const tr = document.createElement('tr');
        tr.id = `row_${player.id}`;
        tr.className = 'rejoin-row';
        tr.innerHTML = `
            <td><strong>${player.name}</strong> <span class="rejoin-tag">↩ re-joined</span></td>
            <td>${player.totalScore}</td>
            <td><input type="number" class="score-input" id="score_${player.id}" min="0" value="0"></td>
        `;
        tbody.appendChild(tr);
    }

    const banner = document.getElementById('winnerDisplay');
    banner.className = 'winner-display rejoin-display';
    banner.innerHTML = `↩ <strong>${player.name}</strong> has re-joined with <strong>${highestScore} pts</strong>!`;
    setTimeout(() => {
        banner.innerHTML = '';
        banner.className = 'winner-display';
    }, 2500);
}

// --- Game Logic ---

function newGame() {
    if (players.length < 2) {
        alert('At least two players are required to start a game.');
        return;
    }

    players.forEach(p => { p.totalScore = 0; });
    activePlayers = [...players];
    eliminatedPlayers = [];
    gameHistory = [];
    rejoinCounts = {};
    roundNumber = 0;
    gameStarted = true;

    document.getElementById('winnerDisplay').innerHTML = '';
    document.getElementById('winnerDisplay').className = 'winner-display';
    renderPlayers();
    startNextRound();
}

function startNextRound() {
    if (activePlayers.length === 1) {
        triggerEndGame();
        return;
    }
    if (activePlayers.length === 0) {
        triggerEndGame();
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

    // Re-attach settlement button if players have already been eliminated
    if (eliminatedPlayers.length > 0) {
        showSettlementButton();
    }
}

function finishRound() {
    const roundScores = {};
    const knockedOut = [];

    activePlayers.forEach(player => {
        const input = document.getElementById(`score_${player.id}`);
        let pts = parseInt(input ? input.value : '0', 10);
        if (isNaN(pts) || pts < 0) pts = 0;
        player.totalScore += pts;
        roundScores[player.id] = pts;
    });

    gameHistory.push(roundScores);

    activePlayers.forEach(player => {
        if (player.totalScore >= 201) {
            knockedOut.push(player);
            eliminatedPlayers.push(player);
        }
    });

    activePlayers = activePlayers.filter(p => p.totalScore < 201);

    renderPlayers();

    if (knockedOut.length > 0) {
        showEliminationBanner(knockedOut, () => {
            afterElimination();
        });
    } else {
        if (activePlayers.length <= 1) {
            triggerEndGame();
        } else {
            startNextRound();
        }
    }
}

// Called after the elimination banner clears.
// If 2+ active players remain, game continues — just show the settlement button.
// If 0 or 1 remain, game is over.
function afterElimination() {
    if (activePlayers.length >= 2) {
        startNextRound();
        showSettlementButton();
    } else {
        triggerEndGame();
    }
}

// Appends the persistent settlement button below the round table.
function showSettlementButton() {
    if (document.getElementById('settlementBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'settlementBtn';
    btn.className = 'settlement-trigger-btn';
    btn.textContent = '💰 Final Settlement';
    btn.onclick = openSettlement;
    document.getElementById('gameArea').appendChild(btn);
}

// Called when game is truly over (0 or 1 active players left).
function triggerEndGame() {
    const winners = activePlayers.length > 0
        ? [...activePlayers]
        : [[...players].sort((a, b) => a.totalScore - b.totalScore)[0]];

    document.getElementById('gameArea').innerHTML = '';
    gameStarted = false;
    renderPlayers();

    const banner = document.getElementById('winnerDisplay');
    banner.className = 'winner-display winner-final';

    if (eliminatedPlayers.length > 0) {
        banner.innerHTML = `
            🏆 <strong>${winners[0].name} wins!</strong><br>
            <span style="font-size:0.9em">Final score: ${winners[0].totalScore} pts &nbsp;|&nbsp; ${roundNumber} rounds played</span><br>
            <div style="margin-top:14px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="resetGame()">🔄 Play Again</button>
                <button onclick="openSettlement()" class="settlement-btn-winner">💰 Final Settlement</button>
            </div>
        `;
    } else {
        banner.innerHTML = `
            🏆 <strong>${winners[0].name} wins!</strong><br>
            <span style="font-size:0.9em">Final score: ${winners[0].totalScore} pts &nbsp;|&nbsp; ${roundNumber} rounds played</span><br>
            <button onclick="resetGame()" style="margin-top:14px;">🔄 Play Again</button>
        `;
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
    renderPlayers();

    const banner = document.getElementById('winnerDisplay');
    banner.className = 'winner-display winner-final';
    banner.innerHTML = `
        🏆 <strong>${winner.name} wins!</strong><br>
        <span style="font-size:0.9em">Final score: ${winner.totalScore} pts &nbsp;|&nbsp; ${roundNumber} rounds played</span><br>
        <button onclick="resetGame()" style="margin-top:14px;">🔄 Play Again</button>
    `;
}

function resetGame() {
    players.forEach(p => { p.totalScore = 0; });
    activePlayers = [...players];
    eliminatedPlayers = [];
    gameHistory = [];
    rejoinCounts = {};
    roundNumber = 0;
    gameStarted = false;
    closeSettlement();
    document.getElementById('winnerDisplay').innerHTML = '';
    document.getElementById('winnerDisplay').className = 'winner-display';
    document.getElementById('gameArea').innerHTML = '';
    renderPlayers();
}

// =============================================
// FINAL SETTLEMENT
// =============================================

function openSettlement() {
    const modal = document.getElementById('settlementModal');
    modal.classList.remove('hidden');
    renderSettlementBetInput();
}

function closeSettlement() {
    const modal = document.getElementById('settlementModal');
    if (modal) modal.classList.add('hidden');
}

function renderSettlementBetInput() {
    const body = document.getElementById('settlementBody');
    const winners = activePlayers.length > 0 ? activePlayers : players.filter(p => !eliminatedPlayers.some(e => e.id === p.id));

    // Build rejoin summary text
    const rejoinSummary = players
        .filter(p => (rejoinCounts[p.id] || 0) > 0)
        .map(p => `${p.name} ×${rejoinCounts[p.id] + 1} bets`)
        .join(', ');

    // Player bet multiplier breakdown
    let playerRows = players.map(p => {
        const isWinner = winners.some(w => w.id === p.id);
        const multiplier = 1 + (rejoinCounts[p.id] || 0);
        const rejoinNote = multiplier > 1 ? `<span class="rejoin-mult">(1 + ${rejoinCounts[p.id]} re-join${rejoinCounts[p.id] > 1 ? 's' : ''})</span>` : '';
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${isWinner ? '<span class="tag-winner">✅ In</span>' : '<span class="tag-loser">💀 Out</span>'}</td>
                <td class="mult-cell">×${multiplier} ${rejoinNote}</td>
            </tr>
        `;
    }).join('');

    let splitSection = '';
    if (winners.length > 1) {
        splitSection = `
            <div class="split-mode-section">
                <p><strong>Split pot among winners:</strong></p>
                <label><input type="radio" name="splitMode" value="equal" checked onchange="togglePercentageInputs(false)"> Equal split</label>
                &nbsp;&nbsp;
                <label><input type="radio" name="splitMode" value="percentage" onchange="togglePercentageInputs(true)"> Percentage split</label>
                <div id="percentageSection" class="hidden percentage-section">
                    <p class="pct-note">Enter each winner's share % (must total 100):</p>
                    <table class="settlement-table">
                        <thead><tr><th>Winner</th><th>Score</th><th>Share %</th></tr></thead>
                        <tbody>
                            ${winners.map(w => `
                                <tr>
                                    <td>${w.name}</td>
                                    <td>${w.totalScore}</td>
                                    <td><input type="number" class="pct-input" id="pct_${w.id}" min="0" max="100" value="${Math.round(100 / winners.length)}" placeholder="0"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    body.innerHTML = `
        <p class="settlement-subtitle">Each player pays 1 bet amount. Re-joins add an extra bet per re-join.</p>

        <div class="bet-input-row">
            <label for="betAmountInput"><strong>Bet amount per entry:</strong></label>
            <input type="number" id="betAmountInput" class="bet-input" min="0" value="" placeholder="e.g. 10">
        </div>

        <h4 style="margin-top:16px;">Bet multipliers</h4>
        <table class="settlement-table">
            <thead><tr><th>Player</th><th>Status</th><th>Bets Owed</th></tr></thead>
            <tbody>${playerRows}</tbody>
        </table>

        ${rejoinSummary ? `<p class="rejoin-note-text">ℹ️ Re-joins: ${rejoinSummary}</p>` : ''}

        ${splitSection}

        <button onclick="calculateSettlement()" class="calc-btn">Calculate ➜</button>
    `;
}

function togglePercentageInputs(show) {
    const sec = document.getElementById('percentageSection');
    if (sec) sec.classList.toggle('hidden', !show);
}

function calculateSettlement() {
    const betInput = document.getElementById('betAmountInput');
    const betAmount = parseFloat(betInput ? betInput.value : 0) || 0;

    if (betAmount <= 0) {
        alert('Please enter a valid bet amount greater than 0.');
        betInput && betInput.focus();
        return;
    }

    const winners = activePlayers.length > 0
        ? [...activePlayers]
        : players.filter(p => !eliminatedPlayers.some(e => e.id === p.id));

    // Each player's total contribution = bet * (1 + rejoins)
    const contributions = players.map(p => ({
        ...p,
        multiplier: 1 + (rejoinCounts[p.id] || 0),
        contributed: betAmount * (1 + (rejoinCounts[p.id] || 0))
    }));

    const totalPot = contributions.reduce((s, p) => s + p.contributed, 0);

    // Winner shares
    let winnerShares = {};
    const splitMode = document.querySelector('input[name="splitMode"]:checked');

    if (winners.length === 1 || !splitMode || splitMode.value === 'equal') {
        winners.forEach(w => winnerShares[w.id] = 1 / winners.length);
    } else {
        let totalPct = 0;
        winners.forEach(w => {
            const pctInp = document.getElementById(`pct_${w.id}`);
            const pct = parseFloat(pctInp ? pctInp.value : 0) || 0;
            winnerShares[w.id] = pct / 100;
            totalPct += pct;
        });
        if (Math.abs(totalPct - 100) > 0.5) {
            alert(`Percentages must total 100% (currently ${totalPct.toFixed(1)}%).`);
            return;
        }
    }

    // Balance = what player receives - what they contributed
    // Losers receive 0, winners receive totalPot * share
    const balances = contributions.map(p => {
        const isWinner = winners.some(w => w.id === p.id);
        const receives = isWinner ? totalPot * (winnerShares[p.id] || 0) : 0;
        return {
            id: p.id,
            name: p.name,
            multiplier: p.multiplier,
            contributed: p.contributed,
            receives,
            net: receives - p.contributed,
            isWinner
        };
    });

    // Minimise transactions: payers pay receivers
    let payers = balances.filter(b => b.net < -0.001).map(b => ({ ...b, owed: -b.net }));
    let receivers = balances.filter(b => b.net > 0.001).map(b => ({ ...b, due: b.net }));

    let transactions = [];
    let i = 0, j = 0;
    while (i < payers.length && j < receivers.length) {
        const amount = Math.min(payers[i].owed, receivers[j].due);
        if (amount > 0.001) {
            transactions.push({ from: payers[i].name, to: receivers[j].name, amount });
        }
        payers[i].owed -= amount;
        receivers[j].due -= amount;
        if (payers[i].owed < 0.001) i++;
        if (receivers[j].due < 0.001) j++;
    }

    renderSettlementResult(betAmount, totalPot, balances, transactions);
}

function renderSettlementResult(betAmount, totalPot, balances, transactions) {
    const body = document.getElementById('settlementBody');

    const shareRows = balances.map(b => {
        const rejoinNote = b.multiplier > 1
            ? `<span class="rejoin-mult-sm">(×${b.multiplier})</span>`
            : '';
        const netStr = b.net >= 0
            ? `<span class="pos-net">+${b.net.toFixed(2)}</span>`
            : `<span class="neg-net">${b.net.toFixed(2)}</span>`;
        return `
            <tr>
                <td><strong>${b.name}</strong>${rejoinNote}</td>
                <td>${b.isWinner ? '<span class="tag-winner">✅ In</span>' : '<span class="tag-loser">💀 Out</span>'}</td>
                <td>${b.contributed.toFixed(2)}</td>
                <td>${b.receives.toFixed(2)}</td>
                <td>${netStr}</td>
            </tr>
        `;
    }).join('');

    const txRows = transactions.length === 0
        ? `<p class="no-tx">No transfers needed!</p>`
        : transactions.map(t => `
            <div class="tx-row">
                <span class="tx-from">💸 ${t.from}</span>
                <span class="tx-arrow">→</span>
                <span class="tx-to">🏦 ${t.to}</span>
                <span class="tx-amt">${t.amount.toFixed(2)}</span>
            </div>
        `).join('');

    body.innerHTML = `
        <div class="result-summary">
            Bet per entry: <strong>${betAmount.toFixed(2)}</strong> &nbsp;|&nbsp; Total pot: <strong>${totalPot.toFixed(2)}</strong>
        </div>

        <h4>Breakdown</h4>
        <table class="settlement-table">
            <thead><tr><th>Player</th><th>Status</th><th>Contributed</th><th>Receives</th><th>Net</th></tr></thead>
            <tbody>${shareRows}</tbody>
        </table>

        <h4>Who Pays Whom</h4>
        <div class="tx-list">${txRows}</div>

        <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="renderSettlementBetInput()" class="back-btn">← Recalculate</button>
            <button onclick="resetGame()">🔄 New Game</button>
        </div>
    `;
}

// Initial render
renderPlayers();
