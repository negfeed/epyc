package com.negfeed.epyc.core

import kotlinx.serialization.Serializable
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

@Serializable private data class ApiRow(val n: Int, val threadIndex: Int, val atomIndex: Int, val playerIndex: Int)
@Serializable private data class Addr(val threadIndex: Int, val atomIndex: Int)
@Serializable private data class PlayerSnap(
    val playerIndex: Int,
    val nextAtom: Addr? = null,
    val readyToPlay: Boolean,
    val allAtomsDone: Boolean,
    val destination: String,
)
@Serializable private data class Round(val states: List<List<Int>>, val players: List<PlayerSnap>)
@Serializable private data class Sim(
    val playersCount: Int,
    val atomCountPerThread: Int,
    val addressSeqs: Map<String, List<Addr>>,
    val rounds: List<Round>,
)
@Serializable private data class TurnVectors(val atomPlayerIndex: List<ApiRow>, val simulations: List<Sim>)

class TurnEngineTest {

    private val vectors: TurnVectors =
        GoldenLoader.json.decodeFromString(TurnVectors.serializer(), GoldenLoader.read("turn_vectors.json"))

    @Test fun atomPlayerIndexMatchesGolden() {
        assertTrue(vectors.atomPlayerIndex.isNotEmpty())
        for (r in vectors.atomPlayerIndex) {
            val got = TurnEngine.atomPlayerIndex(AtomAddress(r.threadIndex, r.atomIndex), r.n)
            assertEquals(r.playerIndex, got, "atomPlayerIndex(n=${r.n}, t=${r.threadIndex}, a=${r.atomIndex})")
        }
    }

    @Test fun playerAtomAddressesMatchGolden() {
        for (sim in vectors.simulations) {
            for ((key, expected) in sim.addressSeqs) {
                val p = key.toInt()
                val got = TurnEngine.playerAtomAddresses(p, sim.playersCount)
                assertEquals(expected.size, got.size)
                expected.forEachIndexed { i, e ->
                    assertEquals(e.threadIndex, got[i].threadIndex)
                    assertEquals(e.atomIndex, got[i].atomIndex)
                }
            }
        }
    }

    private fun threadsFrom(states: List<List<Int>>): List<GameThread> =
        states.map { atomStates ->
            GameThread("word", atomStates.mapIndexed { i, s ->
                GameAtom(if (i % 2 == 0) GameAtomType.DRAWING else GameAtomType.GUESS, GameAtomState.from(s))
            })
        }

    @Test fun getNextAtomAndDestinationAcrossFullSimulations() {
        var rounds = 0
        for (sim in vectors.simulations) {
            val usersOrder = (0 until sim.playersCount).map { "u$it" }
            for (round in sim.rounds) {
                rounds++
                val threads = threadsFrom(round.states)
                for (snap in round.players) {
                    val uid = "u${snap.playerIndex}"
                    val next = TurnEngine.getNextAtom(threads, usersOrder, uid)
                    assertEquals(snap.readyToPlay, next.readyToPlay, "ready states=${round.states} p=${snap.playerIndex}")
                    assertEquals(snap.allAtomsDone, next.allAtomsDone, "allDone p=${snap.playerIndex}")
                    val e = snap.nextAtom
                    if (e != null) {
                        assertEquals(e.threadIndex, next.address?.threadIndex)
                        assertEquals(e.atomIndex, next.address?.atomIndex)
                    } else {
                        assertNull(next.address)
                    }
                    val dest = GameNavigation.destination(GameState.STARTED, threads, usersOrder, uid)
                    assertEquals(snap.destination, dest.value, "destination states=${round.states} p=${snap.playerIndex}")
                }
            }
        }
        assertTrue(rounds > 0)
    }

    @Test fun buildEmptyThreadsShape() {
        for (n in 2..5) {
            val threads = TurnEngine.buildEmptyThreads(n, Words.pick(n))
            assertEquals(n, threads.size)
            for (t in threads) {
                assertEquals(n + 1, t.gameAtoms.size)
                t.gameAtoms.forEachIndexed { i, a ->
                    assertEquals(if (i % 2 == 0) GameAtomType.DRAWING else GameAtomType.GUESS, a.type)
                    assertEquals(GameAtomState.NOT_STARTED, a.state)
                }
            }
        }
    }

    @Test fun wordListCount() {
        assertEquals(121, Words.easyWords.size)
    }

    @Test fun createdStateRoutesToWaitingRoom() {
        assertEquals(Destination.WAITING_ROOM, GameNavigation.destination(GameState.CREATED, emptyList(), emptyList(), "x"))
    }
}
