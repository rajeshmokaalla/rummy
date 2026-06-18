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

    players.push({ id: Date.now(), name: playerName, totalScore: 0, contribution: 0 });
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

        let actionBtn = '';
        if (!gameStarted) {
            actionBtn = `<button onclick="removePlayer(${player.id})" class="remove-button">Remove</button>`;
        } else if (isOut) {
            actionBtn = `<button onclick="rejoinPlayer(${player.id})" class="rejoin-button">↩ Re-join</button>`;
        }

        li.innerHTML = `
            <span class="player-name">${player.name}${isOut ? ' 💀 OUT' : ''}</span>
            <span class="total-score ${isOut ? 'score-out' : ''}">Total: ${player.totalScore}</span>
            ${actionBtn}
        `;
        playerList.appendChild(li);
    });
}

// --- Re-join Logic ---

function rejoinPlayer(id) {
    const player = players.find(p => p.id === id);
    if (!player) return;
    if (!eliminatedPlayers.some(e => e.id === id)) return;

    // Find highest score among active players
    if (activePlayers.length === 0) {
        alert('No active players to re-join against!');
        return;
    }
    const highestScore = Math.max(...activePlayers.map(p => p.totalScore));
    const confirmMsg = `${player.name} will re-join with ${highestScore} points (highest active score). Confirm?`;
    if (!confirm(confirmMsg)) return;

    // Set score and move back to active
    player.totalScore = highestScore;
    eliminatedPlayers = eliminatedPlayers.filter(e => e.id !== id);
    activePlayers.push(player);

    renderPlayers();

    // If a round table is currently displayed, inject a new row for this player
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

    // Show banner
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

    players.forEach(p => { p.totalScore = 0; p.contribution = 0; });
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
    if (activePlayers.length === 1) {
        announceWinner(activePlayers[0]);
        return;
    }
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
            if (activePlayers.length <= 1) {
                if (activePlayers.length === 1) {
                    // Check if all others are eliminated (settlement possible)
                    if (eliminatedPlayers.length > 0) {
                        offerSettlementOrWinner(activePlayers[0]);
                    } else {
                        announceWinner(activePlayers[0]);
                    }
                } else {
                    const winner = [...players].sort((a, b) => a.totalScore - b.totalScore)[0];
                    announceWinner(winner);
                }
            } else {
                // Multiple active players remain, some eliminated — offer settlement option
                renderSettlementButton();
                startNextRound();
            }
        });
    } else {
        if (activePlayers.length === 1) {
            offerSettlementOrWinner(activePlayers[0]);
        } else {
            renderSettlementButton();
            startNextRound();
        }
    }
}

function renderSettlementButton() {
    if (eliminatedPlayers.length === 0) return;
    // Only show button if some are eliminated and some are active
    const gameDiv = document.getElementById('gameArea');
    // Add settlement button after the round HTML if not already there
    if (!document.getElementById('settlementBtn')) {
        const btn = document.createElement('button');
        btn.id = 'settlementBtn';
        btn.className = 'settlement-trigger-btn';
        btn.textContent = '💰 Final Settlement';
        btn.onclick = openSettlement;
        gameDiv.appendChild(btn);
    }
}

function offerSettlementOrWinner(winner) {
    if (eliminatedPlayers.length > 0) {
        // Show winner but also offer settlement
        document.getElementById('gameArea').innerHTML = '';
        gameStarted = false;
        renderPlayers();

        const banner = document.getElementById('winnerDisplay');
        banner.className = 'winner-display winner-final';
        banner.innerHTML = `
            🏆 <strong>${winner.name} wins!</strong><br>
            <span style="font-size:0.9em">Final score: ${winner.totalScore} pts &nbsp;|&nbsp; ${roundNumber} rounds played</span><br>
            <div style="margin-top:14px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="resetGame()">🔄 Play Again</button>
                <button onclick="openSettlement()" class="settlement-btn-winner">💰 Final Settlement</button>
            </div>
        `;
    } else {
        announceWinner(winner);
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
    players.forEach(p => { p.totalScore = 0; p.contribution = 0; });
    activePlayers = [...players];
    eliminatedPlayers = [];
    gameHistory = [];
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
    renderSettlementStep1();
}

function closeSettlement() {
    const modal = document.getElementById('settlementModal');
    if (modal) modal.classList.add('hidden');
}

function renderSettlementStep1() {
    const body = document.getElementById('settlementBody');

    // Determine winners (active) and losers (eliminated)
    const winners = activePlayers.length > 0 ? activePlayers : players.filter(p => !eliminatedPlayers.some(e => e.id === p.id));
    const losers = eliminatedPlayers;

    let html = `
        <p class="settlement-subtitle">Enter how much each player contributed to the pot.</p>
        <table class="settlement-table">
            <thead><tr><th>Player</th><th>Status</th><th>Contribution</th></tr></thead>
            <tbody>
    `;

    players.forEach(p => {
        const isWinner = winners.some(w => w.id === p.id);
        html += `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${isWinner ? '<span class="tag-winner">✅ In</span>' : '<span class="tag-loser">💀 Out</span>'}</td>
                <td><input type="number" class="contrib-input" id="contrib_${p.id}" min="0" value="${p.contribution || 0}" placeholder="0"></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;

    if (winners.length > 1) {
        html += `
            <div class="split-mode-section">
                <p><strong>Split mode for winners:</strong></p>
                <label><input type="radio" name="splitMode" value="equal" checked onchange="togglePercentageInputs(false)"> Equal split</label>
                &nbsp;&nbsp;
                <label><input type="radio" name="splitMode" value="percentage" onchange="togglePercentageInputs(true)"> Percentage split</label>
                <div id="percentageSection" class="hidden percentage-section">
                    <p class="pct-note">Enter each winner's share % (must total 100):</p>
                    <table class="settlement-table">
                        <thead><tr><th>Winner</th><th>Share %</th></tr></thead>
                        <tbody>
                            ${winners.map(w => `
                                <tr>
                                    <td>${w.name}</td>
                                    <td><input type="number" class="pct-input" id="pct_${w.id}" min="0" max="100" value="${Math.round(100 / winners.length)}" placeholder="0"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    html += `<button onclick="calculateSettlement()" class="calc-btn">Calculate ➜</button>`;
    body.innerHTML = html;
}

function togglePercentageInputs(show) {
    const sec = document.getElementById('percentageSection');
    if (sec) sec.classList.toggle('hidden', !show);
}

function calculateSettlement() {
    // Save contributions
    players.forEach(p => {
        const inp = document.getElementById(`contrib_${p.id}`);
        p.contribution = inp ? (parseFloat(inp.value) || 0) : 0;
    });

    const winners = activePlayers.length > 0 ? [...activePlayers] : players.filter(p => !eliminatedPlayers.some(e => e.id === p.id));
    const losers = [...eliminatedPlayers];

    const totalPot = players.reduce((s, p) => s + p.contribution, 0);

    // Determine winner shares
    let winnerShares = {}; // id -> fraction
    const splitMode = document.querySelector('input[name="splitMode"]:checked');

    if (winners.length === 1 || !splitMode || splitMode.value === 'equal') {
        winners.forEach(w => winnerShares[w.id] = 1 / winners.length);
    } else {
        // Percentage mode
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

    // Net for each player: what they should receive (positive) or pay (negative)
    // Winners: they receive (totalPot * share) - their contribution
    // Losers: they contributed and get nothing back, net = -contribution (already paid)
    // But we need a transaction list: who pays whom
    // Approach: compute balance = finalAmount - contribution
    // winners get totalPot * share, losers get 0

    let balances = players.map(p => {
        const isWinner = winners.some(w => w.id === p.id);
        const receives = isWinner ? totalPot * (winnerShares[p.id] || 0) : 0;
        return { id: p.id, name: p.name, contribution: p.contribution, receives, net: receives - p.contribution };
    });

    // Build transaction list: payers (net < 0) pay receivers (net > 0)
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

    renderSettlementResult(totalPot, balances, transactions, winners);
}

function renderSettlementResult(totalPot, balances, transactions, winners) {
    const body = document.getElementById('settlementBody');

    let shareRows = balances.map(b => {
        const isWinner = winners.some(w => w.id === b.id);
        const netStr = b.net >= 0
            ? `<span class="pos-net">+${b.net.toFixed(2)}</span>`
            : `<span class="neg-net">${b.net.toFixed(2)}</span>`;
        return `
            <tr>
                <td><strong>${b.name}</strong></td>
                <td>${isWinner ? '<span class="tag-winner">✅ In</span>' : '<span class="tag-loser">💀 Out</span>'}</td>
                <td>${b.contribution.toFixed(2)}</td>
                <td>${b.receives.toFixed(2)}</td>
                <td>${netStr}</td>
            </tr>
        `;
    }).join('');

    let txRows = transactions.length === 0
        ? `<p class="no-tx">No transfers needed — everyone contributed equally!</p>`
        : transactions.map(t => `
            <div class="tx-row">
                <span class="tx-from">💸 ${t.from}</span>
                <span class="tx-arrow">→</span>
                <span class="tx-to">🏦 ${t.to}</span>
                <span class="tx-amt">${t.amount.toFixed(2)}</span>
            </div>
        `).join('');

    body.innerHTML = `
        <div class="result-summary">Total pot: <strong>${totalPot.toFixed(2)}</strong></div>

        <h4>Breakdown</h4>
        <table class="settlement-table">
            <thead><tr><th>Player</th><th>Status</th><th>Contributed</th><th>Receives</th><th>Net</th></tr></thead>
            <tbody>${shareRows}</tbody>
        </table>

        <h4>Who Pays Whom</h4>
        <div class="tx-list">${txRows}</div>

        <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="renderSettlementStep1()" class="back-btn">← Recalculate</button>
            <button onclick="resetGame()">🔄 New Game</button>
        </div>
    `;
}

// Initial render
renderPlayers();
