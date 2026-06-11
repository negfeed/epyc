#!/usr/bin/env node
// Emits a self-contained Kotlin checker (no external deps) that embeds the golden
// vectors and asserts the :core algorithms against them. Used to verify the Kotlin
// port with plain `kotlinc` when Gradle/Android SDK are unavailable. The real
// project verification is `./gradlew :core:test`.
const fs = require('fs');
const path = require('path');
const turn = require('./golden/turn_vectors.json');
const draw = require('./golden/drawing_vectors.json');

const L = [];
const w = (s) => L.push(s);
// Force a Kotlin Double literal (golden ints like 6 must become 6.0).
const dbl = (n) => (Number.isInteger(n) ? `${n}.0` : `${n}`);

w('import com.negfeed.epyc.core.*');
w('');
w('private var checks = 0');
w('private fun eq(a: Any?, b: Any?, msg: String) {');
w('  if (a != b) { System.err.println("FAIL: " + msg + " expected=" + b + " got=" + a); kotlin.system.exitProcess(1) }');
w('  checks++');
w('}');
w('');
w('fun main() {');

// atomPlayerIndex
for (const r of turn.atomPlayerIndex) {
  w(`  eq(TurnEngine.atomPlayerIndex(AtomAddress(${r.threadIndex}, ${r.atomIndex}), ${r.n}), ${r.playerIndex}, "api n=${r.n} t=${r.threadIndex} a=${r.atomIndex}")`);
}

// simulations
turn.simulations.forEach((sim, si) => {
  const n = sim.playersCount;
  // address seqs
  for (const [k, seq] of Object.entries(sim.addressSeqs)) {
    const p = parseInt(k);
    w(`  run {`);
    w(`    val got = TurnEngine.playerAtomAddresses(${p}, ${n})`);
    w(`    eq(got.size, ${seq.length}, "addrlen sim${si} p${p}")`);
    seq.forEach((a, i) => {
      w(`    eq(got[${i}].threadIndex, ${a.threadIndex}, "addr sim${si} p${p} i${i} t")`);
      w(`    eq(got[${i}].atomIndex, ${a.atomIndex}, "addr sim${si} p${p} i${i} a")`);
    });
    w(`  }`);
  }
  // rounds
  sim.rounds.forEach((round, ri) => {
    const statesLit = 'listOf(' + round.states.map(row => 'listOf(' + row.join(', ') + ')').join(', ') + ')';
    w(`  run {`);
    w(`    val states = ${statesLit}`);
    w(`    val threads = states.map { st -> GameThread("w", st.mapIndexed { i, s -> GameAtom(if (i % 2 == 0) GameAtomType.DRAWING else GameAtomType.GUESS, GameAtomState.from(s)) }) }`);
    w(`    val usersOrder = (0 until ${n}).map { "u" + it }`);
    for (const snap of round.players) {
      const uid = `u${snap.playerIndex}`;
      w(`    run {`);
      w(`      val next = TurnEngine.getNextAtom(threads, usersOrder, "${uid}")`);
      w(`      eq(next.readyToPlay, ${snap.readyToPlay}, "ready sim${si} r${ri} p${snap.playerIndex}")`);
      w(`      eq(next.allAtomsDone, ${snap.allAtomsDone}, "allDone sim${si} r${ri} p${snap.playerIndex}")`);
      if (snap.nextAtom) {
        w(`      eq(next.address?.threadIndex, ${snap.nextAtom.threadIndex}, "nt t sim${si} r${ri} p${snap.playerIndex}")`);
        w(`      eq(next.address?.atomIndex, ${snap.nextAtom.atomIndex}, "nt a sim${si} r${ri} p${snap.playerIndex}")`);
      } else {
        w(`      eq(next.address, null, "nt null sim${si} r${ri} p${snap.playerIndex}")`);
      }
      w(`      eq(GameNavigation.destination(GameState.STARTED, threads, usersOrder, "${uid}").value, "${snap.destination}", "dest sim${si} r${ri} p${snap.playerIndex}")`);
      w(`    }`);
    }
    w(`  }`);
  });
});

// words count
w(`  eq(Words.easyWords.size, 121, "wordcount")`);

// drawing constants
w(`  eq(DrawingGeometry.MAX_GAP_MS, ${draw.constants.MAX_GAP_MS}.0, "maxgap")`);
w(`  eq(DrawingGeometry.REPLAY_PERIOD_MS, ${draw.constants.REPLAY_PERIOD_MS}.0, "period")`);
w(`  eq(DrawingGeometry.MIN_PROCESSING_DISTANCE_PX, ${draw.constants.MIN_PROCESSING_DISTANCE_PX}.0, "mindist")`);

// replays
draw.replays.forEach((r, ri) => {
  const tsLit = 'listOf(' + r.events.map(e => `${e.timestamp}.0`).join(', ') + ')';
  const normLit = 'listOf(' + r.normalizedTimestamps.map(t => `${t}.0`).join(', ') + ')';
  w(`  run {`);
  w(`    val norm = DrawingGeometry.normalizedTimestamps(${tsLit})`);
  w(`    eq(norm, ${normLit}, "norm replay${ri}")`);
  w(`    val ticks = DrawingGeometry.replayTicks(norm)`);
  w(`    eq(ticks.size, ${r.ticks.length}, "ticklen replay${ri}")`);
  r.ticks.forEach((t, i) => {
    w(`    eq(ticks[${i}].drawnCount, ${t.drawnCount}, "tick${i} drawn replay${ri}")`);
    w(`    eq(ticks[${i}].period, ${t.period}, "tick${i} period replay${ri}")`);
  });
  w(`  }`);
});

// min distance
draw.minDistance.forEach((c, i) => {
  w(`  eq(DrawingGeometry.isBeyondMinProcessingDistance(DrawingGeometry.Point(${dbl(c.last.x)}, ${dbl(c.last.y)}), DrawingGeometry.Point(${dbl(c.cur.x)}, ${dbl(c.cur.y)})), ${c.beyond}, "mindist${i}")`);
});

// coordinates
const side = draw.coordinates.side;
draw.coordinates.cases.forEach((c, i) => {
  w(`  run {`);
  w(`    val got = DrawingGeometry.normalize(DrawingGeometry.Point(${dbl(c.screen.x)}, ${dbl(c.screen.y)}), ${dbl(side)})`);
  w(`    if (Math.abs(got.x - ${dbl(c.normalized.x)}) > 1e-12 || Math.abs(got.y - ${dbl(c.normalized.y)}) > 1e-12) { System.err.println("FAIL coord${i}"); kotlin.system.exitProcess(1) }`);
  w(`    checks++`);
  w(`  }`);
});

w('  println("OK: " + checks + " Kotlin core checks passed against golden vectors")');
w('}');

const outDir = path.join(__dirname, '.kotlin-verify');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'Check.kt');
fs.writeFileSync(outFile, L.join('\n'));
console.log('Wrote', outFile, '(' + L.length + ' lines)');
