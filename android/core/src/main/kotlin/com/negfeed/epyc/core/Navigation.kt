package com.negfeed.epyc.core

/**
 * Where the state-driven router should send a player, ported from
 * `src/providers/game-navigation-controller/game-navigation-controller.ts`.
 * `value` matches the golden vectors' `destination` strings.
 */
enum class Destination(val value: String) {
    WAITING_ROOM("WAITING_ROOM"),
    DRAW("DRAW"),
    GUESS("GUESS"),
    WAIT_TURN("WAIT_TURN"),
    WAIT_GAME_TO_END("WAIT_GAME_TO_END"),
    GAME_RESULTS("GAME_RESULTS"),
}

object GameNavigation {

    fun destination(
        state: GameState,
        threads: List<GameThread>,
        usersOrder: List<String>,
        userId: String,
    ): Destination {
        if (state == GameState.CREATED) return Destination.WAITING_ROOM
        if (state != GameState.STARTED || !usersOrder.contains(userId)) return Destination.GAME_RESULTS
        if (TurnEngine.isGameDone(threads)) return Destination.GAME_RESULTS

        val next = TurnEngine.getNextAtom(threads, usersOrder, userId)
        if (next.allAtomsDone) return Destination.WAIT_GAME_TO_END
        if (!next.readyToPlay) return Destination.WAIT_TURN
        val addr = next.address ?: return Destination.GAME_RESULTS
        val atom = threads[addr.threadIndex].gameAtoms[addr.atomIndex]
        return if (atom.type == GameAtomType.DRAWING) Destination.DRAW else Destination.GUESS
    }

    /** Word a DRAW atom shows: thread word for atom 0, else previous atom's guess. */
    fun drawWord(threads: List<GameThread>, address: AtomAddress): String? {
        val thread = threads[address.threadIndex]
        return if (address.atomIndex == 0) thread.word
        else thread.gameAtoms[address.atomIndex - 1].guess
    }

    /** Drawing a GUESS atom replays: previous atom's drawingRef. */
    fun guessDrawingRef(threads: List<GameThread>, address: AtomAddress): String? {
        if (address.atomIndex <= 0) return null
        return threads[address.threadIndex].gameAtoms[address.atomIndex - 1].drawingRef
    }
}
