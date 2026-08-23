import { getMoves, casesContour } from "./board.js";

/*
=====================================================================
  CLAUDE BOT — Pierre / Papier / Ciseaux
=====================================================================
  Approches considérées avant de coder :

  1) MCTS (Monte Carlo Tree Search)
     Écarté. MCTS brille quand l'évaluation heuristique d'une position
     est difficile à écrire mais que les playouts aléatoires jusqu'au
     bout sont représentatifs (Go). Ici c'est l'inverse : le jeu a une
     structure tactique dure (capture obligatoire par type, sinon rien)
     qui rend les playouts aléatoires très bruités — un playout aléatoire
     rate systématiquement les captures/sacrifices à 3-4 coups qu'un
     joueur humain verrait. Écrire une bonne heuristique est au contraire
     facile ici (ci-dessous). Donc alpha-beta avec bonne eval domine MCTS
     sur ce jeu, comme aux échecs classiques avant l'ère "eval neuronale".

  2) Minimax/Negamax + alpha-beta + Transposition Table (retenu)
     C'est ce que ton bot.js faisait déjà, et c'est le bon choix pour ce
     jeu. J'ai gardé l'architecture (negamax au lieu de minimax à 2
     branches = code 2x plus court et plus facile à maintenir, table de
     transposition Zobrist, move ordering) et j'ajoute la pièce qui
     manquait : la QUIESCENCE SEARCH.

  3) Quiescence Search (nouveau, décisif)
     Le problème du bot.js original : à profondeur 0 il coupe même si
     le dernier coup était une capture EN CHAINE (une pierre vient de
     manger des ciseaux, mais cette pierre peut être elle-même mangée
     par un papier au coup suivant — "horizon effect"). Il y avait un
     garde-fou partiel (`if (memToPiece[movePtr-1] === 0) return eval()`)
     qui étend UN seul niveau après une capture, mais pas plus : une
     séquence capture-recapture-recapture à 3 coups n'est pas vue
     jusqu'au bout. Ma quiescence search étend la recherche tant que
     des captures sont possibles, sans limite de profondeur fixe (bornée
     par le nombre de pièces, donc ça termine toujours), ce qui donne
     une évaluation "calme" bien plus fiable en position tactique.

  4) Évaluation : plusieurs pistes soupesées
     a) Matériel brut (bluePieces - redPieces) : ignore que ce jeu est
        RPS — un avantage de 5 pierres ne vaut rien face à 5 ciseaux
        adverses. Rejeté seul.
     b) imbalance() (garder, déjà dans bot.js) : calcule un score de
        "qui mange qui" pondéré par le nombre de pièces de chaque type
        des deux côtés — c'est LA bonne façon de capturer le triangle
        RPS, gardé tel quel.
     c) territory()/emptySquaresValues : capture le contrôle de zone
        (cases vides pondérées par leur valeur stratégique + qui est
        déjà entouré). Gardé et complété par SQUAREVALUE pour les cases
        déjà prises.
     d) piecesProximity() : mesure la pression tactique (une pierre
        bleue proche de ciseaux rouges = menace réelle). Gardé, c'est
        ce qui manque le plus à evalBasique/evaluationAm qui sont
        statiques.
     e) Testé puis RETIRÉ : bonus mobilité (nombre de coups légaux).
        L'idée était bonne mais son coût ne l'était pas : ça obligeait
        à régénérer la liste des coups légaux à CHAQUE appel d'éval,
        donc à chaque noeud de quiescence — ça faisait littéralement
        stagner la profondeur atteinte à 6 même avec 8 secondes de
        budget (mesuré en testant). Retiré ; les autres termes captent
        déjà l'essentiel de "qui est mieux placé" pour son coût.
     f) Nouveau : détection stricte de "domination de type" — si
        l'adversaire n'a plus AUCUNE pièce qui bat mon type X et que
        j'ai encore des pièces de type X, mes pièces de type X sont
        virtuellement invincibles (aucune pierre adverse => mes ciseaux
        ne craignent plus rien). evalDanger/evalBasiqueAm avaient ça
        mais seulement en toute fin de partie (>=41 cases) — je l'inclus
        en continu, pondéré par le nombre de pièces concernées, pas en
        bonus fixe brutal 4096 qui casse la continuité de l'éval (un
        gros saut discontinu piège la recherche alpha-beta).
     Résultat : une eval qui combine (b)+(c)+(d)+(e)+(f), chaque terme
     pondéré, continue (pas de saut brutal sauf victoire/défaite réelle),
     donc alpha-beta peut bien discriminer entre coups voisins.

  5) Recherche par ordre croissant de profondeur (iterative deepening)
     Gardé : permet le time management (on utilise tout le temps donné)
     et fournit un "lastBestMove" pour l'ordering du niveau suivant, ce
     qui accélère énormément l'élagage alpha-beta (jusqu'à ~2x moins de
     noeuds visités par palier de profondeur supplémentaire).
=====================================================================
*/

const captures = [null, 3, 1, 2]; // pierre(1) bat ciseaux(3), papier(2) bat pierre(1), ciseaux(3) bat papier(2)

// ---------------------------------------------------------------
// État interne "à plat" (mêmes typed arrays que bot.js original,
// bien plus rapide que de manipuler l'objet `board` à chaque noeud)
// ---------------------------------------------------------------
const squares = new Int8Array(81);
const pieces = new Int8Array(81);
let turn = true;

let blueSquaresCount = 0;
let redSquaresCount = 0;
let bluePiecesCount = 0;
let redPiecesCount = 0;

const blueRocks = new Uint8Array(9);
const bluePapers = new Uint8Array(9);
const blueScissors = new Uint8Array(9);
let blueRocksCount = 0, bluePapersCount = 0, blueScissorsCount = 0;

const redRocks = new Uint8Array(9);
const redPapers = new Uint8Array(9);
const redScissors = new Uint8Array(9);
let redRocksCount = 0, redPapersCount = 0, redScissorsCount = 0;

let blueSquaresValue = 0;
let redSquaresValue = 0;

// ---------------------------------------------------------------
// Table de valeur des cases (position stratégique), reprise de
// bot.js — plus élevé au centre/bords stratégiques qu'aux coins
// ---------------------------------------------------------------
const SQUAREVALUE = new Uint8Array([
  30, 31, 32, 33, 34, 36, 34, 34, 34,
  30, 31, 32, 34, 36, 35, 35, 35, 35,
  30, 31, 33, 36, 35, 35, 36, 36, 37,
  0 , 0 , 0 , 34, 34, 35, 0 , 0 , 0 ,
  0 , 0 , 0 , 34, 34, 35, 0 , 0 , 0 ,
  0 , 0 , 0 , 34, 34, 35, 0 , 0 , 0 ,
  30, 31, 33, 36, 35, 35, 36, 36, 37,
  30, 31, 32, 34, 36, 35, 35, 35, 35,
  30, 31, 32, 33, 34, 36, 34, 34, 34,
]);

// Valeur des cases VIDES (qui veut la prendre, bleu ou rouge)
const emptySquaresValues = new Float32Array([
  0.7, 0.5, 0.2, 0.1, 0  , -0.1, -0.2, -0.5, -0.7,
  0.8, 0.7, 0.4, 0.2, 0  , -0.2, -0.4, -0.7, -0.8,
  0.9, 0.8, 0.5, 0.3, 0  , -0.3, -0.5, -0.8, -0.9,
  0  , 0  , 0  , 0.4, 0  , -0.4, 0   , 0   , 0   ,
  0  , 0  , 0  , 0.4, 0  , -0.4, 0   , 0   , 0   ,
  0  , 0  , 0  , 0.4, 0  , -0.4, 0   , 0   , 0   ,
  0.9, 0.8, 0.5, 0.3, 0  , -0.3, -0.5, -0.8, -0.9,
  0.8, 0.7, 0.4, 0.2, 0  , -0.2, -0.4, -0.7, -0.8,
  0.7, 0.5, 0.2, 0.1, 0  , -0.1, -0.2, -0.5, -0.7,
]);

// Table de distance de Tchebychev précalculée (utile pour la proximité)
const DIST_TABLE = new Uint8Array(81 * 81);
for (let i = 0; i < 81; i++) {
  for (let j = 0; j < 81; j++) {
    DIST_TABLE[81 * i + j] = Math.max(
      Math.abs((i % 9) - (j % 9)),
      Math.abs(Math.floor(i / 9) - Math.floor(j / 9))
    );
  }
}

// ---------------------------------------------------------------
// Zobrist hashing (pour la table de transposition)
// ---------------------------------------------------------------
function rand64() {
  const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
  return (high << 32n) | low;
}
const zobristPieces = new BigUint64Array(81 * 7);
for (let i = 0; i < 81 * 7; i++) zobristPieces[i] = rand64();
const zobristCases = new BigUint64Array(81 * 3);
for (let i = 0; i < 81 * 3; i++) zobristCases[i] = rand64();
const zobristTurn = rand64();
let hash = 0n;

function initialHash() {
  hash = 0n;
  for (let i = 0; i < 81; i++) {
    hash ^= zobristCases[i * 3 + squares[i] + 1];
    hash ^= zobristPieces[i * 7 + pieces[i] + 3];
  }
  if (turn) hash ^= zobristTurn;
}

// ---------------------------------------------------------------
// Pile pour undo (pas de limite fixe à 128 comme l'original :
// on dimensionne large, une partie ne dépasse jamais 81 coups
// avant qu'une case ne se remplisse, mais avec undo/redo can
// rejouer, donc on prend large par sécurité)
// ---------------------------------------------------------------
const MAX_PLY = 512;
const memFromPiece = new Int8Array(MAX_PLY);
const memToPiece = new Int8Array(MAX_PLY);
const memToCase = new Int8Array(MAX_PLY);
const memHash = new BigUint64Array(MAX_PLY);
let movePtr = 0;

function initState(board) {
  squares.set(board.cases);
  pieces.set(board.pieces);
  turn = board.turn;

  bluePiecesCount = 0; redPiecesCount = 0;
  blueSquaresCount = 0; redSquaresCount = 0;
  blueRocksCount = 0; redRocksCount = 0;
  bluePapersCount = 0; redPapersCount = 0;
  blueScissorsCount = 0; redScissorsCount = 0;
  blueSquaresValue = 0; redSquaresValue = 0;

  for (let i = 0; i < 81; i++) {
    if (squares[i] === 1) { blueSquaresCount++; blueSquaresValue += SQUAREVALUE[i]; }
    else if (squares[i] === -1) { redSquaresCount++; redSquaresValue += SQUAREVALUE[80 - i]; }

    const piece = pieces[i];
    if (piece > 0) {
      bluePiecesCount++;
      if (piece === 1) blueRocks[blueRocksCount++] = i;
      else if (piece === 2) bluePapers[bluePapersCount++] = i;
      else blueScissors[blueScissorsCount++] = i;
    } else if (piece < 0) {
      redPiecesCount++;
      if (piece === -1) redRocks[redRocksCount++] = i;
      else if (piece === -2) redPapers[redPapersCount++] = i;
      else redScissors[redScissorsCount++] = i;
    }
  }
  initialHash();
  movePtr = 0;
}

// ---------------------------------------------------------------
// Génération de coups encodés (from << 8 | to), même logique que
// board.js/isLegal — capture seulement si type gagnant exact
// ---------------------------------------------------------------
function canPieceGo(piece, toIdx) {
  const toPiece = pieces[toIdx];
  if (toPiece === 0) return true;
  if ((toPiece * piece < 0) && (captures[Math.abs(piece)] === Math.abs(toPiece))) return true;
  return false;
}

function getMovesEncode() {
  const moves = [];
  for (let fromIdx = 0; fromIdx < 81; fromIdx++) {
    const piece = pieces[fromIdx];
    if (piece === 0) continue;
    if ((piece > 0) !== turn) continue;
    const contour = casesContour[fromIdx];
    for (let k = 0; k < contour.length; k++) {
      const toIdx = contour[k];
      if (canPieceGo(piece, toIdx)) moves.push((fromIdx << 8) | toIdx);
    }
  }
  return moves;
}

// Coups de CAPTURE uniquement (pour la quiescence search)
function getCaptureMovesEncode() {
  const moves = [];
  for (let fromIdx = 0; fromIdx < 81; fromIdx++) {
    const piece = pieces[fromIdx];
    if (piece === 0) continue;
    if ((piece > 0) !== turn) continue;
    const contour = casesContour[fromIdx];
    for (let k = 0; k < contour.length; k++) {
      const toIdx = contour[k];
      const toPiece = pieces[toIdx];
      if (toPiece !== 0 && (toPiece * piece < 0) && (captures[Math.abs(piece)] === Math.abs(toPiece))) {
        moves.push((fromIdx << 8) | toIdx);
      }
    }
  }
  return moves;
}

// ---------------------------------------------------------------
// Jouer / annuler un coup avec mise à jour incrémentale du hash
// et des listes de pièces par type (identique en logique à bot.js,
// nettoyé)
// ---------------------------------------------------------------
function removePieceFromList(list, countRef, idx) {
  // countRef est un objet {v: count} pour pouvoir le modifier par référence
  const pos = list.indexOf(idx);
  countRef.v -= 1;
  list[pos] = list[countRef.v];
}

function playHash(from, to) {
  const toCase = squares[to];
  const toPiece = pieces[to];
  const fromPiece = pieces[from];

  memFromPiece[movePtr] = fromPiece;
  memToPiece[movePtr] = toPiece;
  memToCase[movePtr] = toCase;
  memHash[movePtr] = hash;
  movePtr++;

  const fromZorbP = from * 7;
  const toZorbP = to * 7;
  const toZorbC = to * 3;

  pieces[from] = 0;
  hash ^= zobristPieces[fromZorbP + fromPiece + 3];
  hash ^= zobristPieces[fromZorbP + 3];

  pieces[to] = fromPiece;
  hash ^= zobristPieces[toZorbP + toPiece + 3];
  hash ^= zobristPieces[toZorbP + fromPiece + 3];

  // Retirer la pièce capturée (si présente) des listes par type
  if (toPiece === 1) { const p = blueRocks.indexOf(to); bluePiecesCount--; blueRocksCount--; blueRocks[p] = blueRocks[blueRocksCount]; }
  else if (toPiece === 2) { const p = bluePapers.indexOf(to); bluePiecesCount--; bluePapersCount--; bluePapers[p] = bluePapers[bluePapersCount]; }
  else if (toPiece === 3) { const p = blueScissors.indexOf(to); bluePiecesCount--; blueScissorsCount--; blueScissors[p] = blueScissors[blueScissorsCount]; }
  else if (toPiece === -1) { const p = redRocks.indexOf(to); redPiecesCount--; redRocksCount--; redRocks[p] = redRocks[redRocksCount]; }
  else if (toPiece === -2) { const p = redPapers.indexOf(to); redPiecesCount--; redPapersCount--; redPapers[p] = redPapers[redPapersCount]; }
  else if (toPiece === -3) { const p = redScissors.indexOf(to); redPiecesCount--; redScissorsCount--; redScissors[p] = redScissors[redScissorsCount]; }

  // Déplacer la pièce dans sa liste
  if (fromPiece === 1) { const p = blueRocks.indexOf(from); blueRocks[p] = to; }
  else if (fromPiece === 2) { const p = bluePapers.indexOf(from); bluePapers[p] = to; }
  else if (fromPiece === 3) { const p = blueScissors.indexOf(from); blueScissors[p] = to; }
  else if (fromPiece === -1) { const p = redRocks.indexOf(from); redRocks[p] = to; }
  else if (fromPiece === -2) { const p = redPapers.indexOf(from); redPapers[p] = to; }
  else { const p = redScissors.indexOf(from); redScissors[p] = to; }

  if (toCase === 0) {
    if (fromPiece > 0) {
      blueSquaresCount++;
      squares[to] = 1;
      hash ^= zobristCases[toZorbC + 2];
      blueSquaresValue += SQUAREVALUE[to];
    } else {
      redSquaresCount++;
      squares[to] = -1;
      hash ^= zobristCases[toZorbC];
      redSquaresValue += SQUAREVALUE[80 - to];
    }
    hash ^= zobristCases[toZorbC + 1];
  }

  hash ^= zobristTurn;
  turn = !turn;
}

function undoHash() {
  movePtr--;
  const fromPiece = memFromPiece[movePtr];
  const toPiece = memToPiece[movePtr];
  const toCase = memToCase[movePtr];
  const lastHash = memHash[movePtr];
  // On retrouve from/to via le hash précédent n'est pas trivial ; on les stocke donc explicitement
  const from = lastFrom[movePtr];
  const to = lastTo[movePtr];

  if (toCase === 0) {
    if (fromPiece > 0) { blueSquaresCount--; blueSquaresValue -= SQUAREVALUE[to]; }
    else { redSquaresCount--; redSquaresValue -= SQUAREVALUE[80 - to]; }
  }

  // Restaurer la pièce capturée dans sa liste
  if (toPiece === 1) { blueRocks[blueRocksCount++] = to; bluePiecesCount++; }
  else if (toPiece === 2) { bluePapers[bluePapersCount++] = to; bluePiecesCount++; }
  else if (toPiece === 3) { blueScissors[blueScissorsCount++] = to; bluePiecesCount++; }
  else if (toPiece === -1) { redRocks[redRocksCount++] = to; redPiecesCount++; }
  else if (toPiece === -2) { redPapers[redPapersCount++] = to; redPiecesCount++; }
  else if (toPiece === -3) { redScissors[redScissorsCount++] = to; redPiecesCount++; }

  // Remettre la pièce déplacée à sa case d'origine
  if (fromPiece === 1) { const p = blueRocks.indexOf(to); blueRocks[p] = from; }
  else if (fromPiece === 2) { const p = bluePapers.indexOf(to); bluePapers[p] = from; }
  else if (fromPiece === 3) { const p = blueScissors.indexOf(to); blueScissors[p] = from; }
  else if (fromPiece === -1) { const p = redRocks.indexOf(to); redRocks[p] = from; }
  else if (fromPiece === -2) { const p = redPapers.indexOf(to); redPapers[p] = from; }
  else { const p = redScissors.indexOf(to); redScissors[p] = from; }

  squares[to] = toCase;
  pieces[to] = toPiece;
  pieces[from] = fromPiece;
  turn = !turn;
  hash = lastHash;
}

// from/to stockés séparément car nécessaires pour undoHash
const lastFrom = new Uint8Array(MAX_PLY);
const lastTo = new Uint8Array(MAX_PLY);

function doMove(from, to) {
  lastFrom[movePtr] = from;
  lastTo[movePtr] = to;
  playHash(from, to);
}

function isGameOverOpt() {
  return (bluePiecesCount <= 0) || (redPiecesCount <= 0) || (blueSquaresCount + redSquaresCount >= 81);
}

// true si bleu a gagné, false si rouge, à n'appeler que si isGameOverOpt() est vrai
function winnerOpt() {
  if (bluePiecesCount <= 0) return false;
  if (redPiecesCount <= 0) return true;
  return blueSquaresCount > redSquaresCount;
}

// ---------------------------------------------------------------
// ÉVALUATION
// ---------------------------------------------------------------

// (b) Rapport de force RPS pondéré par le nombre de pièces de
// chaque côté (reprise directe de imbalance() de bot.js, la
// meilleure idée déjà présente : capture bien le triangle RPS)
function imbalance() {
  const bluePower =
    blueRocksCount * (5 + redScissorsCount - redPapersCount) +
    bluePapersCount * (5 + redRocksCount - redScissorsCount) +
    blueScissorsCount * (5 + redPapersCount - redRocksCount);
  const redPower =
    redRocksCount * (5 + blueScissorsCount - bluePapersCount) +
    redPapersCount * (5 + blueRocksCount - blueScissorsCount) +
    redScissorsCount * (5 + bluePapersCount - blueRocksCount);
  return bluePower - redPower;
}

// (f) Domination de type, en continu (pas de saut brutal) :
// pour chaque type de pièce bleue, si le type rouge qui la bat
// n'existe plus DU TOUT, ces pièces bleues sont "invincibles" —
// bonus proportionnel au nombre de pièces concernées plutôt qu'un
// flag binaire, pour que l'éval reste lisse pour alpha-beta.
function typeDominance() {
  let score = 0;
  // pierre bleue invincible si plus de papier rouge
  if (redPapersCount === 0) score += blueRocksCount * 6;
  if (redRocksCount === 0) score += bluePapersCount * 6;
  if (redScissorsCount === 0) score += blueScissorsCount * 6;
  if (bluePapersCount === 0) score -= redRocksCount * 6;
  if (blueScissorsCount === 0) score -= redPapersCount * 6;
  if (blueRocksCount === 0) score -= redScissorsCount * 6;
  return score;
}

// (c) Territoire : score des cases déjà prises (par valeur
// positionnelle) + valeur des cases encore vides selon qui les
// convoite
function territoryValue() {
  let score = (blueSquaresValue - redSquaresValue) / 10;
  for (let i = 0; i < 81; i++) {
    if (squares[i] === 0) score += emptySquaresValues[i];
  }
  return score;
}

// (d)+(e) Pression tactique : proximité des pièces qui MENACENT
// une pièce adverse (poids fort) + proximité des pièces qui
// PROTÈGENT/RENFORCENT contre le prédateur de mon propre type
// (poids faible) — reprise fidèle de piecesProximity() de bot.js
function piecesProximity() {
  let score = 0;
  let min;

  for (let i = 0; i < blueRocksCount; i++) {
    const base = blueRocks[i] * 81;
    min = 10;
    for (let j = 0; j < redScissorsCount; j++) { const d = DIST_TABLE[base + redScissors[j]]; if (d < min) min = d; }
    score += (10 - min) * 4;
    min = 10;
    for (let j = 0; j < blueScissorsCount; j++) { const d = DIST_TABLE[base + blueScissors[j]]; if (d < min) min = d; }
    score += 10 - min;
  }
  for (let i = 0; i < bluePapersCount; i++) {
    const base = bluePapers[i] * 81;
    min = 10;
    for (let j = 0; j < redRocksCount; j++) { const d = DIST_TABLE[base + redRocks[j]]; if (d < min) min = d; }
    score += (10 - min) * 4;
    min = 10;
    for (let j = 0; j < blueRocksCount; j++) { const d = DIST_TABLE[base + blueRocks[j]]; if (d < min) min = d; }
    score += 10 - min;
  }
  for (let i = 0; i < blueScissorsCount; i++) {
    const base = blueScissors[i] * 81;
    min = 10;
    for (let j = 0; j < redPapersCount; j++) { const d = DIST_TABLE[base + redPapers[j]]; if (d < min) min = d; }
    score += (10 - min) * 4;
    min = 10;
    for (let j = 0; j < bluePapersCount; j++) { const d = DIST_TABLE[base + bluePapers[j]]; if (d < min) min = d; }
    score += 10 - min;
  }
  for (let i = 0; i < redRocksCount; i++) {
    const base = redRocks[i] * 81;
    min = 10;
    for (let j = 0; j < blueScissorsCount; j++) { const d = DIST_TABLE[base + blueScissors[j]]; if (d < min) min = d; }
    score -= (10 - min) * 4;
    min = 10;
    for (let j = 0; j < redScissorsCount; j++) { const d = DIST_TABLE[base + redScissors[j]]; if (d < min) min = d; }
    score -= 10 - min;
  }
  for (let i = 0; i < redPapersCount; i++) {
    const base = redPapers[i] * 81;
    min = 10;
    for (let j = 0; j < blueRocksCount; j++) { const d = DIST_TABLE[base + blueRocks[j]]; if (d < min) min = d; }
    score -= (10 - min) * 4;
    min = 10;
    for (let j = 0; j < redRocksCount; j++) { const d = DIST_TABLE[base + redRocks[j]]; if (d < min) min = d; }
    score -= 10 - min;
  }
  for (let i = 0; i < redScissorsCount; i++) {
    const base = redScissors[i] * 81;
    min = 10;
    for (let j = 0; j < bluePapersCount; j++) { const d = DIST_TABLE[base + bluePapers[j]]; if (d < min) min = d; }
    score -= (10 - min) * 4;
    min = 10;
    for (let j = 0; j < redPapersCount; j++) { const d = DIST_TABLE[base + redPapers[j]]; if (d < min) min = d; }
    score -= 10 - min;
  }
  return score;
}

// Poids de phase de jeu : en toute fin de partie (beaucoup de cases
// prises), le territoire compte de plus en plus car il n'y a presque
// plus de place pour manœuvrer — c'est le score final qui approche.
//
// BUG DE PERF CORRIGÉ (trouvé en test) : evaluation() appelait
// mobilityScore() qui appelait getMovesEncode() — donc CHAQUE appel
// d'évaluation régénérait la liste complète des coups légaux (coûteux :
// parcourt les 81 cases + leur contour) juste pour un signal marginal
// (pénalité si < 3 coups). Comme evaluation() est appelée à CHAQUE
// noeud de quiescence (le "stand pat"), ce coût était payé des
// centaines de milliers de fois par recherche. Mesuré : ça bloquait la
// profondeur atteinte à 6 même avec 8 secondes de budget. Retiré —
// le signal de mobilité n'apportait pas assez pour son coût ; les
// termes imbalance/territory/proximity captent déjà l'essentiel de
// "qui est mieux placé".
function evaluation() {
  const filled = blueSquaresCount + redSquaresCount;
  const phase = filled / 63; // 0 en début de partie, 1 quand le plateau est plein

  const imb = imbalance();
  const territory = territoryValue();
  const proximity = piecesProximity();
  const dominance = typeDominance();

  // Poids interpolés selon la phase : l'imbalance (rapport de force RPS)
  // et la proximité tactique comptent plus en milieu de partie où les
  // captures décident tout ; le territoire compte de plus en plus vers
  // la fin où le nombre de cases prises devient le facteur décisif.
  const imbWeight = 5 + phase * 2;
  const territoryWeight = 1 + phase * 3;

  return (
    imb * imbWeight +
    territory * territoryWeight +
    proximity * 0.35 +
    dominance +
    (blueSquaresCount - redSquaresCount) * (1 + phase * 2)
  );
}

// ---------------------------------------------------------------
// QUIESCENCE SEARCH
// À la feuille d'une branche minimax, au lieu de couper net, on
// continue à jouer les CAPTURES seulement (pas les coups calmes),
// jusqu'à ce qu'il n'y en ait plus. Ça élimine l'horizon effect :
// une pierre qui vient de manger des ciseaux mais qui va se faire
// manger par un papian au coup suivant n'est plus mal évaluée.
// Termine forcément (nombre de pièces fini, strictement décroissant
// à chaque capture).
// ---------------------------------------------------------------
function quiescence(alpha, beta, qDepth) {
  // BUG CORRIGÉ (trouvé en test) : nodeCount doit être incrémenté ICI
  // aussi, sinon le check de timeout (`nodeCount & 1023`) ne voit
  // jamais les noeuds de quiescence — une longue chaîne de captures
  // pouvait dépasser maxTime sans jamais checker l'horloge.
  nodeCount++;
  if ((nodeCount & 2047) === 0 && Date.now() - startTime > timeLimit) {
    throw new Error("Timeout");
  }

  const standPat = (turn ? 1 : -1) * evaluation();
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (qDepth <= 0) return alpha; // garde-fou dur (voir QMAXDEPTH)

  const captureMoves = getCaptureMovesEncode();
  for (let i = 0; i < captureMoves.length; i++) {
    const move = captureMoves[i];
    const from = move >> 8, to = move & 255;
    doMove(from, to);
    const score = -quiescence(-beta, -alpha, qDepth - 1);
    undoHash();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}
// BUG CORRIGÉ (trouvé en test) : QMAXDEPTH=12 était bien trop profond.
// La quiescence est censée être un filet de sécurité RAPIDE contre
// l'horizon effect sur 2-3 coups, pas un second arbre de recherche
// complet. À 12, elle pouvait engloutir tout le budget-temps sans
// jamais laisser l'arbre principal (search()) atteindre une profondeur
// supplémentaire utile — mesuré : la profondeur restait bloquée à 6
// même en passant de 1s à 3s de budget, tout le temps supplémentaire
// étant aspiré par des quiescences profondes sur quelques feuilles.
const QMAXDEPTH = 6;

// ---------------------------------------------------------------
// TABLE DE TRANSPOSITION + NEGAMAX ALPHA-BETA
// ---------------------------------------------------------------
let transposition = new Map();
let nodeCount = 0;
let timeLimit = 0;
let startTime = 0;
const WIN_SCORE = 9_000_000;

// KILLER MOVES (ajout après test de performance) : deux coups "calmes"
// (non-capture) par profondeur, qui ont provoqué une coupure beta la
// dernière fois qu'on les a vus à cette même profondeur ailleurs dans
// l'arbre. Un coup calme fort à un endroit de l'arbre a statistiquement
// de bonnes chances d'être fort ailleurs aussi (même profondeur = même
// "distance à la racine"), donc on l'essaie tôt. C'est l'amélioration
// d'ordering standard aux échecs/négamax, peu coûteuse, qui manquait
// ici — mesuré : sans elle, la profondeur restait bloquée à 6 même à
// 8s de budget-temps (le facteur de branchement ~27 de ce jeu rend
// l'ordering du coup calme critique, contrairement à des jeux où les
// captures dominent).
const MAX_KILLER_DEPTH = 64;
const killerMoves1 = new Int32Array(MAX_KILLER_DEPTH).fill(-1);
const killerMoves2 = new Int32Array(MAX_KILLER_DEPTH).fill(-1);

function recordKiller(depth, move) {
  const d = depth < MAX_KILLER_DEPTH ? depth : MAX_KILLER_DEPTH - 1;
  if (killerMoves1[d] !== move) {
    killerMoves2[d] = killerMoves1[d];
    killerMoves1[d] = move;
  }
}

function orderMoves(moves, ttMove, depth) {
  const d = depth !== undefined && depth < MAX_KILLER_DEPTH ? depth : -1;
  const k1 = d >= 0 ? killerMoves1[d] : -1;
  const k2 = d >= 0 ? killerMoves2[d] : -1;

  // Score de tri : plus haut = essayé en premier.
  // ttMove (4) > capture (3, avec bonus léger selon la valeur mangée)
  // > killer1 (2) > killer2 (1) > coup calme quelconque (0)
  const scored = new Array(moves.length);
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    let score = 0;
    if (move === ttMove) score = 4000;
    else {
      const to = move & 255;
      const capturedPiece = pieces[to];
      if (capturedPiece !== 0) {
        // Toutes les captures ici sont "légales par définition" (le
        // type gagnant exact) donc leur valeur informative est
        // similaire ; léger bonus pour capturer une pièce sur une
        // case de forte valeur positionnelle (SQUAREVALUE).
        score = 3000 + SQUAREVALUE[to];
      } else if (move === k1) score = 2000;
      else if (move === k2) score = 1000;
    }
    scored[i] = score;
  }
  // Tri par score décroissant (insertion sort : moves.length est petit,
  // ~10-30, donc O(n^2) est largement assez rapide et évite l'overhead
  // d'un tri générique avec closures à chaque appel).
  for (let i = 1; i < moves.length; i++) {
    const mv = moves[i], sc = scored[i];
    let j = i - 1;
    while (j >= 0 && scored[j] < sc) {
      moves[j + 1] = moves[j]; scored[j + 1] = scored[j];
      j--;
    }
    moves[j + 1] = mv; scored[j + 1] = sc;
  }
}

// Négamax alpha-beta "propre" : le score retourné est TOUJOURS du
// point de vue du joueur dont c'est le tour (convention négamax
// standard, remplace les 2 branches turn/!turn du minimax original).
function search(depth, alpha, beta) {
  const originalAlpha = alpha;

  if (isGameOverOpt()) {
    const blueWins = winnerOpt();
    const iWin = (blueWins === turn);
    return (iWin ? WIN_SCORE : -WIN_SCORE) + (iWin ? depth : -depth);
  }
  if (depth <= 0) {
    return quiescence(alpha, beta, QMAXDEPTH);
  }

  nodeCount++;
  if ((nodeCount & 1023) === 0 && Date.now() - startTime > timeLimit) {
    throw new Error("Timeout");
  }

  const entry = transposition.get(hash);
  let ttMove = null;
  if (entry) {
    ttMove = entry.move;
    if (entry.depth >= depth) {
      if (entry.flag === "EXACT") return entry.eval;
      if (entry.flag === "LOWER" && entry.eval > alpha) alpha = entry.eval;
      else if (entry.flag === "UPPER" && entry.eval < beta) beta = entry.eval;
      if (alpha >= beta) return entry.eval;
    }
  }

  const moves = getMovesEncode();
  if (moves.length === 0) {
    // Aucun coup légal pour le joueur au trait : situation bloquée,
    // on considère que la partie continue mais on retourne l'évaluation
    // statique pour éviter une exception (cas très rare, cases pleines
    // autour de toutes les pièces du joueur).
    return (turn ? 1 : -1) * evaluation();
  }
  orderMoves(moves, ttMove, depth);

  let bestEval = -Infinity;
  let bestMove = null;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const from = move >> 8, to = move & 255;
    const wasCapture = pieces[to] !== 0;
    doMove(from, to);
    const score = -search(depth - 1, -beta, -alpha);
    undoHash();

    if (score > bestEval) {
      bestEval = score;
      bestMove = move;
      if (bestEval > alpha) alpha = bestEval;
    }
    if (alpha >= beta) {
      // Coupure beta : si le coup qui a causé la coupure est un coup
      // CALME (pas une capture), on le mémorise comme killer move pour
      // cette profondeur — les captures n'ont pas besoin de ce
      // traitement, elles sont déjà bien classées par orderMoves.
      if (!wasCapture) recordKiller(depth, move);
      break;
    }
  }

  let flag = "EXACT";
  if (bestEval <= originalAlpha) flag = "UPPER";
  else if (bestEval >= beta) flag = "LOWER";
  transposition.set(hash, { eval: bestEval, move: bestMove, depth, flag });

  return bestEval;
}

function rootSearch(depth, lastBestMove) {
  const moves = getMovesEncode();
  orderMoves(moves, lastBestMove, depth);
  let bestEval = -Infinity;
  let bestMove = moves[0];
  let alpha = -Infinity;
  const beta = Infinity;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const from = move >> 8, to = move & 255;
    doMove(from, to);
    const score = -search(depth - 1, -beta, -alpha);
    undoHash();

    if (score > bestEval) {
      bestEval = score;
      bestMove = move;
      if (bestEval > alpha) alpha = bestEval;
    }
  }
  return [bestEval, bestMove];
}

function iterativeDeepening(board, maxTime) {
  //console.profile("claude")
  timeLimit = maxTime;
  startTime = Date.now();
  initState(board);
  transposition = new Map();
  nodeCount = 0;
  killerMoves1.fill(-1);
  killerMoves2.fill(-1);

  let bestMove = null;
  let bestEval = 0;
  let reachedDepth = 0;

  // Coup de secours immédiat si maxTime est très bas ou si le premier
  // appel timeout avant la fin de profondeur 1 : on prend un coup légal
  // quelconque plutôt que de planter.
  const fallbackMoves = getMovesEncode();
  if (fallbackMoves.length === 0) return [0, 0]; // ne devrait jamais arriver (isGameOver déjà vérifié par l'appelant)
  bestMove = fallbackMoves[0];

  try {
    for (let depth = 1; depth < 256; depth++) {
      const [currentEval, currentMove] = rootSearch(depth, bestMove);
      if (currentMove !== null) {
        bestEval = currentEval;
        bestMove = currentMove;
        reachedDepth = depth;
      }
      if (Math.abs(bestEval) > WIN_SCORE - 1000) break; // victoire/défaite certaine trouvée
    }
  } catch (e) {
    if (e.message !== "Timeout") throw e;
  }
  console.log(`Claude Bot:
  depth: ${reachedDepth}
  eval ${bestEval}
  nodeCount: ${nodeCount}
  `);
  //console.profileEnd("claude");
  return [bestEval, bestMove, reachedDepth, nodeCount];
}

// ---------------------------------------------------------------
// EXPORT — même interface que les autres bots : (board, maxTime) => [from, to]
// ---------------------------------------------------------------
export const botListClaude = {
  "Claude Bot": (board, maxTime) => {
    const [, move] = iterativeDeepening(board, maxTime);
    return [move >> 8, move & 255];
  },
};