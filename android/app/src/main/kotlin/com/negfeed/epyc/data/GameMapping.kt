package com.negfeed.epyc.data

import com.google.firebase.firestore.DocumentSnapshot
import com.negfeed.epyc.core.Game
import com.negfeed.epyc.core.GameAtom
import com.negfeed.epyc.core.GameAtomState
import com.negfeed.epyc.core.GameAtomType
import com.negfeed.epyc.core.GameState
import com.negfeed.epyc.core.GameThread
import com.negfeed.epyc.core.GameUser

/**
 * Maps a Firestore game document (threads/gameAtoms kept as index-keyed maps —
 * see MIGRATION_PLAN.md §3) to the ordered-array domain model in :core.
 */
object GameMapping {

    @Suppress("UNCHECKED_CAST")
    fun fromSnapshot(snapshot: DocumentSnapshot): Game? {
        val data = snapshot.data ?: return null

        val usersMap = (data["users"] as? Map<String, Any?>).orEmptyMap()
        val users = usersMap.mapValues { (uid, raw) ->
            val m = raw as? Map<String, Any?> ?: emptyMap()
            GameUser(
                uid = uid,
                displayName = m["displayName"] as? String ?: "",
                photoURL = m["photoURL"] as? String,
                joined = m["joined"] as? Boolean ?: false,
            )
        }

        val threadsMap = (data["threads"] as? Map<String, Any?>).orEmptyMap()
        val threads = threadsMap.orderedByIntKey().map { (_, raw) ->
            val tm = raw as? Map<String, Any?> ?: emptyMap()
            val atomsMap = (tm["gameAtoms"] as? Map<String, Any?>).orEmptyMap()
            val atoms = atomsMap.orderedByIntKey().map { (_, araw) ->
                val am = araw as? Map<String, Any?> ?: emptyMap()
                GameAtom(
                    type = GameAtomType.from((am["type"] as? Number)?.toInt() ?: 1),
                    state = GameAtomState.from((am["state"] as? Number)?.toInt() ?: 1),
                    drawingRef = am["drawingRef"] as? String,
                    guess = am["guess"] as? String,
                    authorUid = am["authorUid"] as? String,
                )
            }
            GameThread(word = tm["word"] as? String ?: "", gameAtoms = atoms)
        }

        return Game(
            id = snapshot.id,
            createdAtMs = (data["createdAtMs"] as? Number)?.toDouble() ?: 0.0,
            state = GameState.from((data["state"] as? Number)?.toInt() ?: 1),
            creatorUid = data["creatorUid"] as? String ?: "",
            players = (data["players"] as? List<String>) ?: emptyList(),
            usersOrder = (data["usersOrder"] as? List<String>) ?: emptyList(),
            users = users,
            threads = threads,
        )
    }

    /** Encode a thread to the index-keyed wire map (used on game start). */
    fun threadToWire(thread: GameThread): Map<String, Any?> {
        val atoms = thread.gameAtoms.mapIndexed { i, a ->
            i.toString() to buildMap {
                put("type", a.type.value)
                put("state", a.state.value)
                a.drawingRef?.let { put("drawingRef", it) }
                a.guess?.let { put("guess", it) }
                a.authorUid?.let { put("authorUid", it) }
            }
        }.toMap()
        return mapOf("word" to thread.word, "gameAtoms" to atoms)
    }
}

private fun <V> Map<String, V>?.orEmptyMap(): Map<String, V> = this ?: emptyMap()

private fun <V> Map<String, V>.orderedByIntKey(): List<Pair<Int, V>> =
    mapNotNull { (k, v) -> k.toIntOrNull()?.let { it to v } }.sortedBy { it.first }
