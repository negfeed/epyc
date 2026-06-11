package com.negfeed.epyc.data

import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.negfeed.epyc.auth.AuthUser
import com.negfeed.epyc.core.AtomAddress
import com.negfeed.epyc.core.DrawingEvent
import com.negfeed.epyc.core.DrawingEventType
import com.negfeed.epyc.core.Game
import com.negfeed.epyc.core.GameAtomState
import com.negfeed.epyc.core.TurnEngine
import com.negfeed.epyc.core.Words
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/** Centralized Firestore references. */
class FirestoreRefs(val db: FirebaseFirestore = FirebaseFirestore.getInstance()) {
    fun users() = db.collection("users")
    fun user(uid: String) = users().document(uid)
    fun games() = db.collection("games")
    fun game(id: String) = games().document(id)
    fun drawings() = db.collection("drawings")
    fun drawing(id: String) = drawings().document(id)
    fun drawingEvents(id: String) = drawing(id).collection("events")
}

/** Owns Firestore I/O for games (ports game-model.ts + the user-facing parts of user-model.ts). */
class GameRepository(private val refs: FirestoreRefs = FirestoreRefs()) {

    suspend fun createGame(creator: AuthUser): String {
        val ref = refs.games().document()
        ref.set(
            mapOf(
                "createdAtMs" to System.currentTimeMillis().toDouble(),
                "state" to com.negfeed.epyc.core.GameState.CREATED.value,
                "creatorUid" to creator.uid,
                "players" to listOf(creator.uid),
                "usersOrder" to emptyList<String>(),
                "users" to mapOf(
                    creator.uid to mapOf(
                        "displayName" to creator.displayName,
                        "photoURL" to creator.photoURL,
                        "joined" to true,
                    )
                ),
            )
        ).await()
        return ref.id
    }

    fun observeGame(id: String): Flow<Game> = callbackFlow {
        val reg = refs.game(id).addSnapshotListener { snap, err ->
            if (err != null) return@addSnapshotListener
            val game = snap?.takeIf { it.exists() }?.let(GameMapping::fromSnapshot)
            if (game != null) trySend(game)
        }
        awaitClose { reg.remove() }
    }

    fun observeRecentGames(uid: String, limit: Long = 3): Flow<List<Game>> = callbackFlow {
        val reg = refs.games()
            .whereArrayContains("players", uid)
            .orderBy("createdAtMs", Query.Direction.DESCENDING)
            .limit(limit)
            .addSnapshotListener { snap, err ->
                if (err != null) return@addSnapshotListener
                val games = snap?.documents?.mapNotNull(GameMapping::fromSnapshot) ?: emptyList()
                trySend(games)
            }
        awaitClose { reg.remove() }
    }

    suspend fun upsertGameUser(gameId: String, user: AuthUser, joined: Boolean) {
        refs.game(gameId).set(
            mapOf(
                "players" to FieldValue.arrayUnion(user.uid),
                "users" to mapOf(
                    user.uid to mapOf(
                        "displayName" to user.displayName,
                        "photoURL" to user.photoURL,
                        "joined" to joined,
                    )
                ),
            ),
            com.google.firebase.firestore.SetOptions.merge()
        ).await()
    }

    suspend fun setJoined(gameId: String, uid: String, joined: Boolean) {
        refs.game(gameId).update(
            "users.$uid.joined", joined,
            "players", FieldValue.arrayUnion(uid)
        ).await()
    }

    suspend fun start(gameId: String) {
        val snap = refs.game(gameId).get().await()
        val game = GameMapping.fromSnapshot(snap) ?: return
        val joined = game.users.values.filter { it.joined }.map { it.uid }.shuffled()
        val words = Words.pick(joined.size)
        val threads = TurnEngine.buildEmptyThreads(joined.size, words)
        val threadsWire = threads.mapIndexed { i, t -> i.toString() to GameMapping.threadToWire(t) }.toMap()
        refs.game(gameId).update(
            mapOf(
                "state" to com.negfeed.epyc.core.GameState.STARTED.value,
                "usersOrder" to joined,
                "threads" to threadsWire,
            )
        ).await()
    }

    suspend fun setAtomState(gameId: String, address: AtomAddress, state: GameAtomState) {
        refs.game(gameId).update(
            "threads.${address.threadIndex}.gameAtoms.${address.atomIndex}.state", state.value
        ).await()
    }

    suspend fun setAtomDrawingRef(gameId: String, address: AtomAddress, drawingRef: String) {
        refs.game(gameId).update(
            "threads.${address.threadIndex}.gameAtoms.${address.atomIndex}.drawingRef", drawingRef
        ).await()
    }

    suspend fun finishDrawing(gameId: String, address: AtomAddress, authorUid: String) {
        val base = "threads.${address.threadIndex}.gameAtoms.${address.atomIndex}"
        refs.game(gameId).update(
            "$base.state", GameAtomState.DONE.value,
            "$base.authorUid", authorUid,
        ).await()
    }

    suspend fun finishGuess(gameId: String, address: AtomAddress, guess: String, authorUid: String) {
        val base = "threads.${address.threadIndex}.gameAtoms.${address.atomIndex}"
        refs.game(gameId).update(
            "$base.guess", guess,
            "$base.state", GameAtomState.DONE.value,
            "$base.authorUid", authorUid,
        ).await()
    }
}

/** Owns Firestore I/O for drawings (events subcollection, ordered by sequence id). */
class DrawingRepository(private val refs: FirestoreRefs = FirestoreRefs()) {

    suspend fun createDrawing(authorUid: String): String {
        val ref = refs.drawings().document()
        ref.set(
            mapOf(
                "createdAtMs" to System.currentTimeMillis().toDouble(),
                "authorUid" to authorUid,
            )
        ).await()
        return ref.id
    }

    suspend fun appendEvent(drawingId: String, seq: Int, event: DrawingEvent) {
        val data = buildMap<String, Any?> {
            put("type", event.type.value)
            put("ts", event.ts)
            event.pathName?.let { put("pathName", it) }
            event.x?.let { put("x", it) }
            event.y?.let { put("y", it) }
        }
        refs.drawingEvents(drawingId).document("%08d".format(seq)).set(data).await()
    }

    suspend fun loadEvents(drawingId: String): List<DrawingEvent> {
        val snap = refs.drawingEvents(drawingId).orderBy(FieldPath.documentId()).get().await()
        return snap.documents.mapNotNull(::decode)
    }

    fun observeEvents(drawingId: String): Flow<List<DrawingEvent>> = callbackFlow {
        val reg = refs.drawingEvents(drawingId)
            .orderBy(FieldPath.documentId())
            .addSnapshotListener { snap, err ->
                if (err != null) return@addSnapshotListener
                trySend(snap?.documents?.mapNotNull(::decode) ?: emptyList())
            }
        awaitClose { reg.remove() }
    }

    private fun decode(doc: DocumentSnapshot): DrawingEvent? {
        val type = (doc.getString("type")) ?: return null
        val ts = (doc.get("ts") as? Number)?.toDouble() ?: return null
        return DrawingEvent(
            type = DrawingEventType.from(type),
            ts = ts,
            pathName = doc.getString("pathName"),
            x = (doc.get("x") as? Number)?.toDouble(),
            y = (doc.get("y") as? Number)?.toDouble(),
        )
    }
}

/** Owns Firestore I/O for users (ports user-model.ts profile + check-in). */
class UserRepository(private val refs: FirestoreRefs = FirestoreRefs()) {
    suspend fun upsertProfile(user: AuthUser) {
        refs.user(user.uid).set(
            mapOf(
                "displayName" to user.displayName,
                "photoURL" to user.photoURL,
                "lastCheckinMs" to System.currentTimeMillis().toDouble(),
            ),
            com.google.firebase.firestore.SetOptions.merge()
        ).await()
    }

    suspend fun checkIn(uid: String) {
        refs.user(uid).set(
            mapOf("lastCheckinMs" to System.currentTimeMillis().toDouble()),
            com.google.firebase.firestore.SetOptions.merge()
        ).await()
    }
}
