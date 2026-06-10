package com.negfeed.epyc.core

/**
 * Pure port of `src/providers/game-model/game-model.ts` turn/thread logic.
 * Behavior is asserted against `tools/golden/turn_vectors.json` (the same vectors
 * the iOS EpycCore tests use).
 */
object TurnEngine {

    /** One thread per player; `playerCount + 1` atoms alternating DRAWING/GUESS, all NOT_STARTED. */
    fun buildEmptyThread(playerCount: Int, word: String): GameThread {
        val atoms = (0 until playerCount + 1).map { i ->
            GameAtom(
                type = if (i % 2 == 0) GameAtomType.DRAWING else GameAtomType.GUESS,
                state = GameAtomState.NOT_STARTED,
            )
        }
        return GameThread(word = word, gameAtoms = atoms)
    }

    fun buildEmptyThreads(playerCount: Int, words: List<String>): List<GameThread> =
        (0 until playerCount).map { buildEmptyThread(playerCount, words[it % words.size]) }

    /** `(threadIndex - atomIndex + n) % n` (kept non-negative). */
    fun atomPlayerIndex(address: AtomAddress, playersCount: Int): Int {
        val n = playersCount
        return (((address.threadIndex - address.atomIndex) % n) + n) % n
    }

    /** For `i` in `0..playersCount`: `{ thread: (i + playerIndex) % n, atom: i }`. */
    fun playerAtomAddresses(playerIndex: Int, playersCount: Int): List<AtomAddress> {
        val n = playersCount
        val result = ArrayList<AtomAddress>(n + 1)
        var i = 0
        while (i < n + 1) {
            result.add(AtomAddress(threadIndex = (i + playerIndex) % n, atomIndex = i))
            i++
        }
        return result
    }

    fun getNextAtom(threads: List<GameThread>, usersOrder: List<String>, userId: String): NextAtom {
        val playerIndex = usersOrder.indexOf(userId)
        return getNextAtom(threads, usersOrder.size, playerIndex)
    }

    fun getNextAtom(threads: List<GameThread>, playersCount: Int, playerIndex: Int): NextAtom {
        for (address in playerAtomAddresses(playerIndex, playersCount)) {
            val thread = threads[address.threadIndex]
            val atom = thread.gameAtoms[address.atomIndex]
            val prev = if (address.atomIndex > 0) thread.gameAtoms[address.atomIndex - 1] else null
            if (atom.state != GameAtomState.DONE) {
                val ready = prev == null || prev.state == GameAtomState.DONE
                return NextAtom(address = address, readyToPlay = ready, allAtomsDone = false)
            }
        }
        return NextAtom(address = null, readyToPlay = false, allAtomsDone = true)
    }

    /** True when the last atom of every thread is DONE. */
    fun isGameDone(threads: List<GameThread>): Boolean =
        threads.all { it.gameAtoms.lastOrNull()?.state == GameAtomState.DONE }
}
