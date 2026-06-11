package com.negfeed.epyc.core

// Integer raw values preserved from the legacy TypeScript so the same values
// round-trip through Firestore and the ported logic stays identical.

enum class GameState(val value: Int) {
    CREATED(1), STARTED(2), ABANDONED(3), FINISHED(4);
    companion object { fun from(v: Int) = entries.first { it.value == v } }
}

enum class GameAtomType(val value: Int) {
    DRAWING(1), GUESS(2);
    companion object { fun from(v: Int) = entries.first { it.value == v } }
}

enum class GameAtomState(val value: Int) {
    NOT_STARTED(1), STARTED(2), DONE(3);
    companion object { fun from(v: Int) = entries.first { it.value == v } }
}

data class GameUser(
    val uid: String,
    val displayName: String,
    val photoURL: String? = null,
    val joined: Boolean = false,
)

data class GameAtom(
    val type: GameAtomType,
    val state: GameAtomState = GameAtomState.NOT_STARTED,
    val drawingRef: String? = null,
    val guess: String? = null,
    val authorUid: String? = null,
)

data class GameThread(
    val word: String,
    val gameAtoms: List<GameAtom>,
)

data class Game(
    val id: String,
    val createdAtMs: Double,
    val state: GameState,
    val creatorUid: String,
    val players: List<String> = emptyList(),
    val usersOrder: List<String> = emptyList(),
    val users: Map<String, GameUser> = emptyMap(),
    val threads: List<GameThread> = emptyList(),
)

enum class DrawingEventType(val value: String) {
    POINT("point"), ERASE("erase"), UNDO("undo"), REDO("redo");
    companion object { fun from(v: String) = entries.first { it.value == v } }
}

/** Flat Firestore shape: type, ts, pathName, x, y. */
data class DrawingEvent(
    val type: DrawingEventType,
    val ts: Double,
    val pathName: String? = null,
    val x: Double? = null,
    val y: Double? = null,
)

data class AtomAddress(val threadIndex: Int, val atomIndex: Int)

data class NextAtom(
    val address: AtomAddress?,
    val readyToPlay: Boolean,
    val allAtomsDone: Boolean,
)
