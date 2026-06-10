#!/usr/bin/env node
/*
 * Generates golden parity vectors from a faithful port of the original
 * Ionic app's pure logic:
 *   - src/providers/game-model/game-model.ts          (turn rotation + thread build)
 *   - src/providers/game-navigation-controller/...     (state -> screen)
 *   - src/components/replaying-drawing-canvas/...       (replay timeline)
 *   - src/components/drawing-canvas/drawing-canvas.ts   (normalize coords)
 *
 * Output: tools/golden/turn_vectors.json, tools/golden/drawing_vectors.json
 * Both the iOS (EpycCore) and Android (:core) unit tests assert against these,
 * proving the native ports match the legacy behavior exactly.
 */
const fs = require('fs');
const path = require('path');

// ---- enums (integer values preserved from the TS) ----
const GameState = { CREATED: 1, STARTED: 2, ABANDONED: 3, FINISHED: 4 };
const AtomType = { DRAWING: 1, GUESS: 2 };
const AtomState = { NOT_STARTED: 1, STARTED: 2, DONE: 3 };

// ---- game-model.ts ports ----
function buildEmptyThread(playerCount) {
  const atoms = [];
  for (let i = 0; i < playerCount + 1; i++) {
    atoms.push({ type: i % 2 === 0 ? AtomType.DRAWING : AtomType.GUESS, state: AtomState.NOT_STARTED });
  }
  return { word: 'word', gameAtoms: atoms };
}
function buildEmptyThreads(playerCount) {
  const t = [];
  for (let i = 0; i < playerCount; i++) t.push(buildEmptyThread(playerCount));
  return t;
}
function atomPlayerIndex(addr, n) {
  return (addr.threadIndex - addr.atomIndex + n) % n;
}
function* playerAtomAddresses(playerIndex, n) {
  let i = 0;
  while (i < n + 1) {
    yield { threadIndex: (i + playerIndex) % n, atomIndex: i };
    i++;
  }
}
function getNextAtom(game, playerIndex) {
  const n = game.usersOrder.length;
  const it = playerAtomAddresses(playerIndex, n);
  let next = null, allDone = false, ready = false;
  while (true) {
    const r = it.next();
    if (r.done) { allDone = true; break; }
    const a = r.value;
    const thread = game.threads[a.threadIndex];
    const atom = thread.gameAtoms[a.atomIndex];
    const prev = a.atomIndex > 0 ? thread.gameAtoms[a.atomIndex - 1] : null;
    if (atom.state !== AtomState.DONE) {
      next = a;
      if (!prev || prev.state === AtomState.DONE) ready = true;
      break;
    }
  }
  return { address: next, allAtomsDone: allDone, readyToPlay: ready };
}

// ---- game-navigation-controller.ts port (screen decision only) ----
function isGameDone(game) {
  return game.threads.every(t => t.gameAtoms[t.gameAtoms.length - 1].state === AtomState.DONE);
}
function destination(game, playerIndex) {
  if (game.state === GameState.CREATED) return 'WAITING_ROOM';
  if (game.state === GameState.STARTED) {
    if (isGameDone(game)) return 'GAME_RESULTS';
    const na = getNextAtom(game, playerIndex);
    if (na.allAtomsDone) return 'WAIT_GAME_TO_END';
    if (!na.readyToPlay) return 'WAIT_TURN';
    if (na.address) {
      const atom = game.threads[na.address.threadIndex].gameAtoms[na.address.atomIndex];
      return atom.type === AtomType.DRAWING ? 'DRAW' : 'GUESS';
    }
  }
  return 'GAME_RESULTS';
}

// snapshot atom-state matrix for serialization
function stateMatrix(game) {
  return game.threads.map(t => t.gameAtoms.map(a => a.state));
}

// ---- simulate a full game per player count, snapshotting each round ----
function simulate(n) {
  const game = {
    state: GameState.STARTED,
    usersOrder: Array.from({ length: n }, (_, i) => 'u' + i),
    threads: buildEmptyThreads(n),
  };
  const rounds = [];
  // record the static address sequences too
  const addressSeqs = {};
  for (let p = 0; p < n; p++) addressSeqs[p] = [...playerAtomAddresses(p, n)];

  let guard = 0;
  while (!isGameDone(game) && guard++ < 1000) {
    const snap = {
      states: stateMatrix(game),
      players: [],
    };
    for (let p = 0; p < n; p++) {
      const na = getNextAtom(game, p);
      snap.players.push({
        playerIndex: p,
        nextAtom: na.address ? { threadIndex: na.address.threadIndex, atomIndex: na.address.atomIndex } : null,
        readyToPlay: na.readyToPlay,
        allAtomsDone: na.allAtomsDone,
        destination: destination(game, p),
      });
    }
    rounds.push(snap);

    // advance: mark DONE every currently ready+addressed atom (simultaneous play)
    const toFinish = [];
    for (let p = 0; p < n; p++) {
      const na = getNextAtom(game, p);
      if (na.address && na.readyToPlay) toFinish.push(na.address);
    }
    if (toFinish.length === 0) break;
    for (const a of toFinish) game.threads[a.threadIndex].gameAtoms[a.atomIndex].state = AtomState.DONE;
  }
  // final snapshot (game done)
  const finalSnap = { states: stateMatrix(game), players: [] };
  for (let p = 0; p < n; p++) {
    const na = getNextAtom(game, p);
    finalSnap.players.push({
      playerIndex: p,
      nextAtom: na.address ? { threadIndex: na.address.threadIndex, atomIndex: na.address.atomIndex } : null,
      readyToPlay: na.readyToPlay,
      allAtomsDone: na.allAtomsDone,
      destination: destination(game, p),
    });
  }
  rounds.push(finalSnap);

  return { playersCount: n, atomCountPerThread: n + 1, addressSeqs, rounds };
}

// ---- atomPlayerIndex exhaustive table ----
function atomPlayerIndexTable() {
  const rows = [];
  for (let n = 2; n <= 6; n++) {
    for (let t = 0; t < n; t++) {
      for (let a = 0; a < n + 1; a++) {
        rows.push({ n, threadIndex: t, atomIndex: a, playerIndex: atomPlayerIndex({ threadIndex: t, atomIndex: a }, n) });
      }
    }
  }
  return rows;
}

// ---- replaying-drawing-canvas.ts ports ----
const MAX_GAP = 1000, PERIOD = 33;
function normalizeTimestamps(events) {
  const out = [];
  let prev = null;
  events.forEach((e, i) => {
    const copy = Object.assign({}, e);
    if (i === 0) copy.timestamp = 0;
    else {
      let d = e.timestamp - events[i - 1].timestamp;
      if (d > MAX_GAP) d = MAX_GAP;
      copy.timestamp = out[i - 1].timestamp + d;
    }
    out.push(copy);
    prev = copy;
  });
  return out;
}
function replayProgress(events) {
  // returns the cumulative count of events drawn at each period tick (touchCount==0 path)
  const norm = normalizeTimestamps(events);
  const last = norm.length ? norm[norm.length - 1].timestamp : 0;
  const totalPeriods = Math.ceil(last / PERIOD);
  const ticks = [];
  let drawingIndex = 0;
  for (let counter = 0; counter <= totalPeriods; counter++) {
    const cur = counter * PERIOD;
    while (drawingIndex < norm.length && norm[drawingIndex].timestamp <= cur) drawingIndex++;
    ticks.push({ period: counter, elapsedMs: cur, drawnCount: drawingIndex });
  }
  return { totalPeriods, normalizedTimestamps: norm.map(e => e.timestamp), ticks };
}

// fixed drawing fixtures (raw timestamps include a >1s gap to exercise the cap)
const drawingFixtures = [
  {
    name: 'simple_stroke',
    events: [
      { type: 'point', timestamp: 1000, pathName: '1', point: { x: 0.10, y: 0.10 } },
      { type: 'point', timestamp: 1040, pathName: '1', point: { x: 0.20, y: 0.20 } },
      { type: 'point', timestamp: 1080, pathName: '1', point: { x: 0.30, y: 0.25 } },
      { type: 'point', timestamp: 1120, pathName: '1', point: { x: 0.40, y: 0.20 } },
    ],
  },
  {
    name: 'gap_and_erase_undo',
    events: [
      { type: 'point', timestamp: 0, pathName: '1', point: { x: 0.5, y: 0.5 } },
      { type: 'point', timestamp: 50, pathName: '1', point: { x: 0.6, y: 0.5 } },
      // 5s gap -> capped to 1000ms
      { type: 'erase', timestamp: 5050, pathName: '2', point: { x: 0.6, y: 0.5 } },
      { type: 'undo', timestamp: 5083 },
      { type: 'redo', timestamp: 5116 },
    ],
  },
];

// min-processing-distance threshold port (recording-drawing-canvas.ts)
const MIN_DIST = 6;
function beyondMinDistance(last, cur) {
  const dx = last.x - cur.x, dy = last.y - cur.y;
  return Math.pow(MIN_DIST, 2) < dx * dx + dy * dy;
}
function distanceTable() {
  const cases = [
    [{ x: 0, y: 0 }, { x: 5, y: 0 }],   // 25 < 36 -> false
    [{ x: 0, y: 0 }, { x: 6, y: 0 }],   // 36 < 36 -> false
    [{ x: 0, y: 0 }, { x: 7, y: 0 }],   // 49 < 36 -> true
    [{ x: 0, y: 0 }, { x: 5, y: 5 }],   // 50 < 36 -> true
    [{ x: 1, y: 1 }, { x: 1, y: 1 }],   // 0  -> false
  ];
  return cases.map(([a, b]) => ({ last: a, cur: b, beyond: beyondMinDistance(a, b) }));
}

// coordinate normalize/denormalize (drawing-canvas.ts) with a representative side
function coordTable() {
  const side = 360;
  const pts = [{ x: 0, y: 0 }, { x: 180, y: 90 }, { x: 360, y: 360 }, { x: 36, y: 3.6 }];
  return { side, cases: pts.map(p => ({ screen: p, normalized: { x: p.x / side, y: p.y / side } })) };
}

// ---- write outputs ----
const outDir = path.join(__dirname, 'golden');
fs.mkdirSync(outDir, { recursive: true });

const turn = {
  meta: { source: 'src/providers/game-model + game-navigation-controller', generated_from: 'tools/gen_golden.js' },
  enums: { GameState, AtomType, AtomState },
  atomPlayerIndex: atomPlayerIndexTable(),
  simulations: [2, 3, 4, 5].map(simulate),
};
fs.writeFileSync(path.join(outDir, 'turn_vectors.json'), JSON.stringify(turn, null, 2));

const drawing = {
  meta: { source: 'src/components/replaying-drawing-canvas + drawing-canvas + recording-drawing-canvas', generated_from: 'tools/gen_golden.js' },
  constants: { MAX_GAP_MS: MAX_GAP, REPLAY_PERIOD_MS: PERIOD, MIN_PROCESSING_DISTANCE_PX: MIN_DIST },
  replays: drawingFixtures.map(f => ({ name: f.name, events: f.events, ...replayProgress(f.events) })),
  minDistance: distanceTable(),
  coordinates: coordTable(),
};
fs.writeFileSync(path.join(outDir, 'drawing_vectors.json'), JSON.stringify(drawing, null, 2));

console.log('Wrote', path.join(outDir, 'turn_vectors.json'));
console.log('Wrote', path.join(outDir, 'drawing_vectors.json'));
console.log('simulations:', turn.simulations.map(s => `${s.playersCount}p:${s.rounds.length}rounds`).join(', '));
