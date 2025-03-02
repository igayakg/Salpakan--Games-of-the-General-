document.addEventListener("DOMContentLoaded", () => {
    const board = document.getElementById("game-board");
    const startNowButton = document.getElementById("start-now");
    const restartButton = document.getElementById("restart");
    const statusText = document.getElementById("status");
    const timerDisplay = document.getElementById("timer");

    let playerTurn = true;
    let isSetupPhase = true;
    let selectedPiece = null;
    let setupTimer;
    let timeLeft = 30;

    const pieceTypes = [
        { type: "2-star", label: "★2" },
        { type: "1-star", label: "★1" },
        { type: "spy", label: "S" },
        { type: "private", label: "P" },
        { type: "flag", label: "F" }
    ];

    function startSetupTimer() {
        setupTimer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(setupTimer);
                startGame();
            } else {
                timerDisplay.textContent = `Setup Time Left: ${timeLeft} sec`;
                timeLeft--;
            }
        }, 1000);
    }

    function startGame() {
        clearInterval(setupTimer);
        isSetupPhase = false;
        startNowButton.style.display = "none";
        restartButton.style.display = "inline";
        statusText.textContent = "Game started! Your turn.";
        timerDisplay.textContent = "Game in progress...";
    }

    startNowButton.addEventListener("click", () => {
        startGame();
    });

    restartButton.addEventListener("click", () => {
        location.reload();
    });

    function createBoard() {
        board.innerHTML = "";
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                let cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = i;
                cell.dataset.col = j;
                board.appendChild(cell);
            }
        }
        placePlayerPieces();
        placeAIPieces();
    }

    function placePlayerPieces() {
        let availableCells = [...document.querySelectorAll(".cell")].filter(cell => {
            let row = parseInt(cell.dataset.row);
            return row >= 4; // Player's 2x6 setup area
        });

        pieceTypes.forEach(pieceData => {
            let randomIndex = Math.floor(Math.random() * availableCells.length);
            let cell = availableCells.splice(randomIndex, 1)[0];

            let piece = document.createElement("div");
            piece.classList.add("piece", "player");
            piece.dataset.type = pieceData.type;
            piece.textContent = pieceData.label;
            piece.draggable = true;

            piece.addEventListener("dragstart", (event) => {
                if (!isSetupPhase) return;
                selectedPiece = event.target;
            });

            cell.appendChild(piece);
        });

        document.querySelectorAll(".cell").forEach(cell => {
            let row = parseInt(cell.dataset.row);
            if (row >= 4) {
                cell.addEventListener("dragover", (event) => event.preventDefault());
                cell.addEventListener("drop", (event) => {
                    if (!isSetupPhase || !selectedPiece) return;
                    if (!cell.firstChild) {
                        cell.appendChild(selectedPiece);
                    }
                });
            }
        });
    }

    function placeAIPieces() {
        let availableCells = [...document.querySelectorAll(".cell")].filter(cell => {
            let row = parseInt(cell.dataset.row);
            return row <= 1; // AI's 2x6 setup area
        });

        pieceTypes.forEach(pieceData => {
            let randomIndex = Math.floor(Math.random() * availableCells.length);
            let cell = availableCells.splice(randomIndex, 1)[0];

            let piece = document.createElement("div");
            piece.classList.add("piece", "ai", "hidden");
            piece.dataset.type = pieceData.type;
            piece.dataset.owner = "ai";
            piece.textContent = pieceData.label; // Change this to pieceData.label to see ranks

            cell.appendChild(piece);
        });
    }

    function enableMovement() {
        document.querySelectorAll(".cell").forEach(cell => {
            cell.addEventListener("click", () => {
                if (!isSetupPhase) {
                    if (cell.firstChild && cell.firstChild.classList.contains("player") && playerTurn) {
                        selectPiece(cell.firstChild);
                    } else if (selectedPiece && playerTurn) {
                        movePiece(selectedPiece, cell);
                    }
                }
            });
        });
    }

    function selectPiece(piece) {
        selectedPiece = piece;
        document.querySelectorAll(".piece").forEach(p => p.classList.remove("selected"));
        selectedPiece.classList.add("selected");
    }

    function movePiece(piece, targetCell) {
        let oldCell = piece.parentNode;
        let newRow = parseInt(targetCell.dataset.row);
        let newCol = parseInt(targetCell.dataset.col);
        let oldRow = parseInt(oldCell.dataset.row);
        let oldCol = parseInt(oldCell.dataset.col);
    
        if (
            (Math.abs(newRow - oldRow) === 1 && newCol === oldCol) ||  
            (Math.abs(newCol - oldCol) === 1 && newRow === oldRow)     
        ) {
            if (targetCell.firstChild) {
                arbiter(piece, targetCell.firstChild);
            } else {
                targetCell.appendChild(piece);
            }

            if (piece.dataset.type === "flag" && newRow === 0) {
                declareWinner("Player");
                return;
            }

            playerTurn = false;
            statusText.textContent = "AI's turn...";
            setTimeout(aiMove, 1000);
        }
    }

    function arbiter(attacker, defender) {
        let attackerType = attacker.dataset.type;
        let defenderType = defender.dataset.type;

        const ranks = {
            "flag": 0,
            "private": 1,
            "1-star": 2,
            "2-star": 3,
            "spy": 4
        };

        if (attackerType === "flag") {
            declareWinner("Player");
            return;
        }
        if (defenderType === "flag") {
            declareWinner("AI");
            return;
        }
        if (attackerType === "private" && defenderType === "spy") {
            defender.parentNode.removeChild(defender);
            return;
        }
        if (attackerType === "spy" && defenderType === "private") {
            attacker.parentNode.removeChild(attacker);
            return;
        }

        if (ranks[attackerType] > ranks[defenderType]) {
            defender.parentNode.removeChild(defender);
        } else if (ranks[attackerType] < ranks[defenderType]) {
            attacker.parentNode.removeChild(attacker);
        } else {
            attacker.parentNode.removeChild(attacker);
            defender.parentNode.removeChild(defender);
        }
    }

    function aiMove() {
        let aiPieces = [...document.querySelectorAll(".ai")];
        let moved = false;

        while (!moved && aiPieces.length > 0) {
            let randomIndex = Math.floor(Math.random() * aiPieces.length);
            let piece = aiPieces[randomIndex];
            let cell = piece.parentNode;

            let row = parseInt(cell.dataset.row);
            let col = parseInt(cell.dataset.col);
            let possibleMoves = [];

            let directions = [
                { r: -1, c: 0 }, { r: 1, c: 0 },
                { r: 0, c: -1 }, { r: 0, c: 1 }
            ];

            directions.forEach(dir => {
                let newRow = row + dir.r;
                let newCol = col + dir.c;
                let targetCell = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
                if (targetCell && !targetCell.firstChild) {
                    possibleMoves.push(targetCell);
                }
            });

            if (possibleMoves.length > 0) {
                let target = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                target.appendChild(piece);
                moved = true;
                playerTurn = true;
                statusText.textContent = "Your turn!";
            } else {
                aiPieces.splice(randomIndex, 1);
            }
        }
    }

    function declareWinner(winner) {
        alert(`${winner} wins!`);
        location.reload();
    }

    createBoard();
    enableMovement();
    startSetupTimer();
});
