const inputName = document.querySelector("#player-name");
const buttonStart = document.querySelector("#start-game");
const buttonShowRules = document.querySelector("#show-rules");

const screenMenu = document.querySelector("#screen-menu");
const screenGame = document.querySelector("#screen-game");

const spanPlayerName = document.querySelector("#game-player-name");
const spanTimer = document.querySelector("#game-timer");
const spanCurrentLineName = document.querySelector("#current-line-name");

const boardContainer = document.querySelector("#board");
const buttonDrawCard = document.querySelector("#draw-card");
const divCurrentCard = document.querySelector("#current-card");

const divScore = document.querySelector("#score");

let playerName = "";
let elapsedSeconds = 0;
let timerId = null;

let stations = [];
let lines = [];

let lineOrder = [];
let currentLineIndex = 0;
let currentLine = null;

let deck = [];
let drawnCards = 0;
let currentCard = null;

let segments = [];
let lineVisitedStations = new Map(); 
let lineEndpoints = new Map();      

let gameStarted = false;
let gameFinished = false;

const TERMINAL_SCORE_TRACK = [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25];
let roundScores = new Map();
const spanLineOrder = document.querySelector("#line-order-display");

init();

function init() {
    hookEvents();
    loadData();
    showMenu();
}

function hookEvents() {
    buttonStart.addEventListener("click", handleStartGame);
    buttonShowRules.addEventListener("click", handleShowRules);
    buttonDrawCard.addEventListener("click", handleDrawCard);
    boardContainer.addEventListener("click", handleBoardClick);
}

function loadData() {
    Promise.all([
        fetch("stations.json").then(r => r.json()),
        fetch("lines.json").then(r => r.json())
    ]).then(values => {
        stations = values[0];
        lines = values[1];
        prepareLineOrder();
        buildBoard();
    });
}

function showMenu() {
    screenMenu.style.display = "block";
    screenGame.style.display = "none";
}

function showGameScreen() {
    screenMenu.style.display = "none";
    screenGame.style.display = "block";
}

function handleStartGame() {
    const name = inputName.value.trim();
    if (name === "") {
        return;
    }
    playerName = name;
    spanPlayerName.innerText = playerName;

    resetGameState();
    showGameScreen();
    startTimer();
    startNextRound();
}

const RULES_TEXT = `
<h3>Cél</h3>
<p>Építsd meg a 4 budapesti metróvonalat, egyenként 8 húzott kártya felhasználásával.</p>

<h3>Kártyák</h3>
<p>A „Kártya húzása” gombbal kapsz egy állomástípust (A–D vagy Joker).
A húzott betűvel jelölt állomásokra léphetsz, Jokerrel bárhová. A Deák tér minden vonalon speciális csomópontként működik.</p>

<h3>Irányítás</h3>
<p>1. Húzz egy kártyát.<br>
2. Kattints egy, a kártyának megfelelő állomásra.<br>
3. Ha a lépés szabályos, a két állomás automatikusan összekötésre kerül.</p>

<h3>Milyen szakasz érvényes?</h3>
<ul>
<li>Végpontból indul.</li>
<li>Lehet vízszintes, függőleges vagy 45°-os átló.</li>
<li>Nem mehet át másik állomáson.</li>
<li>Nem keresztezhet másik szakaszt középen.</li>
<li>Nem duplikálhat már meglévő szakaszt.</li>
<li>Nem hozhat létre hurkot a saját vonalon.</li>
<li>Joker → bárhova léphetsz.</li>
</ul>

<h3>Fordulók</h3>
<p>Minden metróvonalhoz 8 húzás tartozik. A 8. húzás után a vonal elkészült,
és automatikusan indul a következő metróvonal a saját kezdőállomásáról.</p>

<h3>Pontozás</h3>
<p>A pontszám: <strong>kerületek száma × legnagyobb kerület állomásszáma</strong>.</p>
`;

function handleShowRules() {
    const modal = document.querySelector("#rules-modal");
    const textBox = document.querySelector("#rules-text");
    const closeBtn = document.querySelector(".close-btn");

    textBox.innerHTML = RULES_TEXT;
    modal.style.display = "block";

    closeBtn.onclick = () => modal.style.display = "none";
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}

function resetGameState() {
    elapsedSeconds = 0;
    gameStarted = true;
    gameFinished = false;
    segments = [];
    lineVisitedStations = new Map();
    lineEndpoints = new Map();
    currentLineIndex = 0;
    prepareLineOrder();

    divScore.innerHTML = "";
}

function prepareLineOrder() {
    lineOrder = lines.map(line => line.id);
    shuffle(lineOrder);
    renderLineOrder();
}

function buildBoard() {
    boardContainer.innerHTML = "";

    for (let y = 0; y < 10; y++) {
        const row = document.createElement("div");
        row.classList.add("board-row");

        for (let x = 0; x < 10; x++) {

            const cell = document.createElement("div");
            cell.classList.add("board-cell");
            cell.dataset.x = x;
            cell.dataset.y = y;

            const station = findStationByCoord(x, y);
            if (station) {
                cell.classList.add("station");
                cell.dataset.stationId = station.id;
                cell.innerText = station.type === "?" ? "★" : station.type;
            }

            row.appendChild(cell);
        }

        boardContainer.appendChild(row);
    }

    renderLines();
}

function findStationByCoord(x, y) {
    return stations.find(s => s.x === x && s.y === y) || null;
}

function finishGame() {
    gameFinished = true;
    stopTimer();

    let FPsum = 0;
    for (const value of roundScores.values()) {
        FPsum += value;
    }

    const nodePoints = computeNodePoints();
    const { P2, P3, P4 } = nodePoints;

    const pointsP2 = P2 * 2;
    const pointsP3 = P3 * 5;
    const pointsP4 = P4 * 9;

    const nodeSum = pointsP2 + pointsP3 + pointsP4;
    const PP = computeTerminalPoints();
    const total = FPsum + nodeSum + PP;

    divScore.innerHTML = `
        <p><strong>Játék vége!</strong></p>
        <p><strong>Fordulópontok összesen:</strong> ${FPsum}</p>
        <p><strong>Csomópontok:</strong></p>
        <p>2 vonal találkozása (P2): ${P2} → ${pointsP2} pont</p>
        <p>3 vonal találkozása (P3): ${P3} → ${pointsP3} pont</p>
        <p>4 vonal találkozása (P4): ${P4} → ${pointsP4} pont</p>
        <p><strong>Csomópont pontok összesen:</strong> ${nodeSum}</p>
        <p><strong>Pályaudvar pontok (PP):</strong> ${PP}</p>
        <hr>
        <p><strong style="font-size: 1.3em;">Végső összpontszám: ${total}</strong></p>
    `;
}

function updateCurrentLineHeader() {
    if (!currentLine) return;

    spanCurrentLineName.innerText = currentLine.name;
    spanCurrentLineName.style.color = currentLine.color;
}

function highlightLineStart() {
    const startId = currentLine.start;
    const cell = boardContainer.querySelector(`[data-station-id="${startId}"]`);

    if (cell) {
        cell.classList.add("start-station");
        cell.style.backgroundColor = colorWithAlpha(currentLine.color, 0.25);
    }

    lineEndpoints.set(currentLine.id, [startId]);
    lineVisitedStations.set(currentLine.id, new Set([startId]));
}
function colorWithAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildDeck() {
    const cards = [];
    const letters = ["A", "B", "C", "D", "Joker"];

    for (const letter of letters) {
        cards.push({ type: letter, platform: "outer" });
    }
    for (const letter of letters) {
        cards.push({ type: letter, platform: "middle" });
    }
    return cards;
}

function renderCurrentCard() {
    if (!currentCard) {
        divCurrentCard.innerText = "–";
        divCurrentCard.style.color = "#888";
        return;
    }

    divCurrentCard.innerText = currentCard.type;

    if (currentCard.type === "Joker") {
        divCurrentCard.style.color = "purple";
    } else {
        divCurrentCard.style.color = "black";
    }
}

function startNextRound() {

    if (currentLineIndex >= lineOrder.length) {
        finishGame();
        return;
    }

    lineEndpoints.delete(currentLine?.id);
    lineVisitedStations.delete(currentLine?.id);

    const lineId = lineOrder[currentLineIndex];
    currentLine = lines.find(l => l.id === lineId);

    drawnCards = 0;
    currentCard = null;
    deck = buildDeck();
    shuffle(deck);

    divCurrentCard.innerText = "–";

    updateCurrentLineHeader();
    renderLineOrder();
    highlightLineStart();
}

function finishCurrentRound() {

    const oldStart = document.querySelector(".start-station");
    if (oldStart) oldStart.classList.remove("start-station");

    const lineId = currentLine.id;
    const lineSegments = segments.filter(s => s.lineId === lineId);

    const FP = scoreLine(lineId, lineSegments);
    roundScores.set(lineId, FP);

    currentLineIndex++;
    startNextRound();
}

function handleDrawCard() {
    if (!gameStarted || gameFinished) return;
    if (!currentLine) return;
    if (drawnCards === 8) {

        currentCard = null;
        renderCurrentCard();
        finishCurrentRound();
        return;
    }

    if (deck.length === 0) return;

    drawnCards++;
    currentCard = deck.pop();
    renderCurrentCard();
}

function handleBoardClick(e) {
    if (gameFinished || !currentCard || !currentLine) return;

    const cell = e.target.closest(".board-cell");
    if (!cell) return;

    const stationId = Number(cell.dataset.stationId);
    if (!stationId) return;

    const station = getStationById(stationId);
    if (!station) return;
    if (!isStationAllowedByCard(station, currentCard)) return;

    const fromId = chooseEndpointForNewSegment(stationId);
    if (fromId === null) return;

    if (wouldCreateLoopForCurrentLine(stationId)) return;

    addSegment(fromId, stationId);
    updateLineEndpointsAfterBuild(fromId, stationId);
    renderLines();
    updateLineVisitedStations(stationId);

    currentCard = null;
    renderCurrentCard();

    if (drawnCards === 8) finishCurrentRound();
}

function wouldCreateLoopForCurrentLine(id) {
    return lineVisitedStations.get(currentLine.id)?.has(id) || false;
}

function isSegmentShapeValid(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return !(dx === 0 && dy === 0) && (dx === 0 || dy === 0 || dx === dy);
}

function wouldSegmentPassThroughOtherStation(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const stepX = dx / steps;
    const stepY = dy / steps;

    let x = a.x;
    let y = a.y;

    for (let i = 1; i < steps; i++) {
        x += stepX;
        y += stepY;

        if (Number.isInteger(x) && Number.isInteger(y)) {
            const station = findStationByCoord(x, y);
            if (station) {
                if (station.id !== a.id && station.id !== b.id) {
                    return true;
                }
            }
        }
    }

    return false;
}

function wouldSegmentIntersectExisting(a, b) {

    const x1 = a.x, y1 = a.y;
    const x2 = b.x, y2 = b.y;

    for (const seg of segments) {

        if (seg.lineId === currentLine.id &&
            (seg.fromId === a.id || seg.toId === a.id || seg.fromId === b.id || seg.toId === b.id)) {
            continue;
        }

        const sA = getStationById(seg.fromId);
        const sB = getStationById(seg.toId);

        if (!sA || !sB) continue;

        const x3 = sA.x, y3 = sA.y;
        const x4 = sB.x, y4 = sB.y;
        const sharePoint =
            (x1 === x3 && y1 === y3) ||
            (x1 === x4 && y1 === y4) ||
            (x2 === x3 && y2 === y3) ||
            (x2 === x4 && y2 === y4);

        if (sharePoint) continue;

        if (segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4)) {
            return true;
        }
    }

    return false;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {

    function orient(ax, ay, bx, by, cx, cy) {
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    }

    const o1 = orient(x1, y1, x2, y2, x3, y3);
    const o2 = orient(x1, y1, x2, y2, x4, y4);
    const o3 = orient(x3, y3, x4, y4, x1, y1);
    const o4 = orient(x3, y3, x4, y4, x2, y2);

    return (o1 * o2 < 0 && o3 * o4 < 0);

}

function wouldSegmentBeParallelDuplicate(a, b) {
    for (const seg of segments) {

        const sA = getStationById(seg.fromId);
        const sB = getStationById(seg.toId);

        if (!sA || !sB) continue;

        if (
            (sA.id === a.id && sB.id === b.id) ||
            (sA.id === b.id && sB.id === a.id)
        ) return true;
    }
}

function isStationAllowedByCard(station, card) {
    if (card.type === "Joker") return true;
    if (station.id === 30) return true;
    return station.type === card.type;
}

function getStationById(id) {
    return stations.find(s => s.id === id) || null;
}

function addSegment(fromId, toId) {
    segments.push({
        lineId: currentLine.id,
        fromId,
        toId
    });
}

function renderLineOrder() {
    const items = lineOrder.map((lineId, index) => {
        const line = lines.find(l => l.id === lineId);
        return (index === currentLineIndex)
            ? `[${line.name}]`
            : line.name;
    });
    spanLineOrder.innerText = items.join(" → ");
}

function renderLines() {
    const stationCells = boardContainer.querySelectorAll(".station");
    for (const cell of stationCells) {
        if (!cell.classList.contains("start-station")) {
            cell.style.borderColor = "";
            cell.style.backgroundColor = "";
        }
    }

    const svg = document.querySelector("#board-lines");
    if (!svg) {
        return;
    }
    svg.innerHTML = "";

    const boardRect = boardContainer.getBoundingClientRect();
    const width = boardRect.width;
    const height = boardRect.height;

    const stepX = width / 10;
    const stepY = height / 10;

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    for (const seg of segments) {
        const line = lines.find(l => l.id === seg.lineId);
        if (!line) continue;

        const a = getStationById(seg.fromId);
        const b = getStationById(seg.toId);
        if (!a || !b) continue;
        const x1 = (a.x + 0.5) * stepX;
        const y1 = (a.y + 0.5) * stepY;
        const x2 = (b.x + 0.5) * stepX;
        const y2 = (b.y + 0.5) * stepY;

        const lineElem = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineElem.setAttribute("x1", x1);
        lineElem.setAttribute("y1", y1);
        lineElem.setAttribute("x2", x2);
        lineElem.setAttribute("y2", y2);
        lineElem.setAttribute("stroke", line.color);
        lineElem.setAttribute("stroke-width", "6");
        lineElem.setAttribute("stroke-linecap", "round");

        svg.appendChild(lineElem);

        const fromCell = boardContainer.querySelector(`[data-station-id="${seg.fromId}"]`);
        const toCell = boardContainer.querySelector(`[data-station-id="${seg.toId}"]`);
        if (fromCell && !fromCell.classList.contains("start-station")) {
            fromCell.style.borderColor = line.color;
        }
        if (toCell && !toCell.classList.contains("start-station")) {
            toCell.style.borderColor = line.color;
        }
    }
}

function chooseEndpointForNewSegment(targetId) {
    const endpoints = lineEndpoints.get(currentLine.id);
    if (!endpoints) return null;

    const target = getStationById(targetId);

    let best = null;
    let bestDist = Infinity;

    for (const endId of endpoints) {
        const end = getStationById(endId);

        if (!isSegmentShapeValid(end, target)) continue;
        if (wouldSegmentPassThroughOtherStation(end, target)) continue;
        if (wouldSegmentIntersectExisting(end, target)) continue;
        if (wouldSegmentBeParallelDuplicate(end, target)) continue;

        const dist = Math.abs(end.x - target.x) + Math.abs(end.y - target.y);

        if (dist < bestDist) {
            bestDist = dist;
            best = endId;
        }
    }
    return best;
}

function updateLineEndpointsAfterBuild(fromId, toId) {
    const endpoints = lineEndpoints.get(currentLine.id);
    if (!endpoints) return;

    if (endpoints.length === 1) {
        endpoints.push(toId);
        return;
    }

    if (endpoints[0] === fromId) {
        endpoints[0] = toId;
    } else if (endpoints[1] === fromId) {
        endpoints[1] = toId;
    } else {
        console.warn("Hiba: from nem végpont volt!");
    }
}

function updateLineVisitedStations(stationId) {
    const visited = lineVisitedStations.get(currentLine.id);
    if (!visited) {
        lineVisitedStations.set(currentLine.id, new Set([stationId]));
    } else {
        visited.add(stationId);
    }
}

function countDistricts(stationIds) {
    return new Set(
        stationIds
            .map(id => getStationById(id)?.district)
            .filter(Boolean)
    ).size;
}

function maxStationsInDistrict(ids) {
    const counts = new Map();

    for (const id of ids) {
        const d = getStationById(id)?.district;
        if (d) counts.set(d, (counts.get(d) || 0) + 1);
    }

    return counts.size ? Math.max(...counts.values()) : 0;
}

function countDanubeCrossings(lineSegments) {
    let crossings = 0;

    for (const seg of lineSegments) {
        const a = getStationById(seg.fromId);
        const b = getStationById(seg.toId);

        if (!a || !b) continue;

        if (a.side !== b.side) crossings++;
    }

    return crossings;
}

function scoreLine(lineId, lineSegments) {
    const stationIds = collectStationsOfLine(lineId, lineSegments);
    const pk = countDistricts(stationIds);
    const pm = maxStationsInDistrict(stationIds);
    const pd = countDanubeCrossings(lineSegments);

    return pk * pm + pd;
}

function collectStationsOfLine(lineId, lineSegments) {
    const ids = new Set();
    for (const seg of lineSegments) {
        ids.add(seg.fromId);
        ids.add(seg.toId);
    }
    return Array.from(ids);
}

function startTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
    }
    timerId = setInterval(function () {
        elapsedSeconds++;
        renderTimer();
    }, 1000);
}

function renderTimer() {
    spanTimer.innerText = elapsedSeconds + " s";
}

function stopTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
}

function collectStationUsage() {
    const usage = new Map();

    for (const seg of segments) {
        if (!usage.has(seg.fromId)) usage.set(seg.fromId, new Set());
        if (!usage.has(seg.toId)) usage.set(seg.toId, new Set());

        usage.get(seg.fromId).add(seg.lineId);
        usage.get(seg.toId).add(seg.lineId);
    }

    return usage;
}

function computeNodePoints() {
    const usage = collectStationUsage();
    let P2 = 0, P3 = 0, P4 = 0;

    for (const set of usage.values()) {
        const c = set.size;
        if (c === 2) P2++;
        else if (c === 3) P3++;
        else if (c === 4) P4++;
    }

    return { P2, P3, P4 };
}

function computeTerminalPoints() {
    let terminalHits = 0;

    for (const seg of segments) {
        const a = getStationById(seg.fromId);
        const b = getStationById(seg.toId);
        if (!a || !b) continue;

        if (a.train) terminalHits++;
        if (b.train) terminalHits++;
    }

    const index = Math.min(terminalHits, TERMINAL_SCORE_TRACK.length - 1);
    return TERMINAL_SCORE_TRACK[index];
}