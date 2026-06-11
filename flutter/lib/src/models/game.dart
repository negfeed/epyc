import 'enums.dart';

/// Domain models ported from `src/providers/game-model/game-model.ts`.
///
/// All models are immutable value types with `fromMap`/`toMap` for Firestore
/// and `copyWith` for updates. Map shapes follow the Firestore schema in
/// `MIGRATION_PLAN.md` §3.

/// A participant in a game (stored under `games/{id}/users/{uid}`).
class GameUser {
  const GameUser({
    required this.uid,
    this.displayName,
    this.photoURL,
    this.joined = false,
  });

  final String uid;
  final String? displayName;
  final String? photoURL;
  final bool joined;

  GameUser copyWith({
    String? displayName,
    String? photoURL,
    bool? joined,
  }) =>
      GameUser(
        uid: uid,
        displayName: displayName ?? this.displayName,
        photoURL: photoURL ?? this.photoURL,
        joined: joined ?? this.joined,
      );

  factory GameUser.fromMap(String uid, Map<String, dynamic> map) => GameUser(
        uid: uid,
        displayName: map['displayName'] as String?,
        photoURL: map['photoURL'] as String?,
        joined: (map['joined'] as bool?) ?? false,
      );

  Map<String, dynamic> toMap() => {
        'uid': uid,
        if (displayName != null) 'displayName': displayName,
        if (photoURL != null) 'photoURL': photoURL,
        'joined': joined,
      };
}

/// A single drawing or guess slot within a thread.
class GameAtom {
  const GameAtom({
    required this.type,
    required this.state,
    this.drawingRef,
    this.guess,
    this.authorUid,
  });

  final GameAtomType type;
  final GameAtomState state;

  /// Reference to a document in the `drawings` collection (drawing atoms).
  final String? drawingRef;

  /// The submitted guess (guess atoms).
  final String? guess;

  /// UID of the player who completed this atom.
  final String? authorUid;

  GameAtom copyWith({
    GameAtomType? type,
    GameAtomState? state,
    String? drawingRef,
    String? guess,
    String? authorUid,
  }) =>
      GameAtom(
        type: type ?? this.type,
        state: state ?? this.state,
        drawingRef: drawingRef ?? this.drawingRef,
        guess: guess ?? this.guess,
        authorUid: authorUid ?? this.authorUid,
      );

  factory GameAtom.fromMap(Map<String, dynamic> map) => GameAtom(
        type: GameAtomType.fromValue(map['type'] as int),
        state: GameAtomState.fromValue(map['state'] as int),
        drawingRef: map['drawingRef'] as String?,
        guess: map['guess'] as String?,
        authorUid: map['authorUid'] as String?,
      );

  Map<String, dynamic> toMap() => {
        'type': type.value,
        'state': state.value,
        if (drawingRef != null) 'drawingRef': drawingRef,
        if (guess != null) 'guess': guess,
        if (authorUid != null) 'authorUid': authorUid,
      };
}

/// A thread: an original word plus the chain of alternating atoms.
class GameThread {
  const GameThread({required this.word, required this.atoms});

  final String word;
  final List<GameAtom> atoms;

  GameThread copyWith({String? word, List<GameAtom>? atoms}) =>
      GameThread(word: word ?? this.word, atoms: atoms ?? this.atoms);

  factory GameThread.fromMap(Map<String, dynamic> map) => GameThread(
        word: map['word'] as String,
        atoms: ((map['atoms'] as List?) ?? const [])
            .map((a) => GameAtom.fromMap(Map<String, dynamic>.from(a as Map)))
            .toList(),
      );

  Map<String, dynamic> toMap() => {
        'word': word,
        'atoms': atoms.map((a) => a.toMap()).toList(),
      };
}

/// A full game instance (document `games/{id}`).
class Game {
  const Game({
    required this.id,
    required this.state,
    required this.creator,
    required this.creationTimestampMs,
    this.users = const {},
    this.usersOrder = const [],
    this.threads = const [],
    this.code,
  });

  final String id;
  final GameState state;
  final String creator;
  final int creationTimestampMs;

  /// Short human-friendly join code (e.g. "K7QMP4"), set at creation.
  final String? code;

  /// Map from uid → [GameUser].
  final Map<String, GameUser> users;

  /// Play order, set when the game starts.
  final List<String> usersOrder;

  final List<GameThread> threads;

  int get playerCount => usersOrder.length;

  Game copyWith({
    GameState? state,
    Map<String, GameUser>? users,
    List<String>? usersOrder,
    List<GameThread>? threads,
  }) =>
      Game(
        id: id,
        state: state ?? this.state,
        creator: creator,
        creationTimestampMs: creationTimestampMs,
        users: users ?? this.users,
        usersOrder: usersOrder ?? this.usersOrder,
        threads: threads ?? this.threads,
        code: code,
      );

  factory Game.fromMap(String id, Map<String, dynamic> map) {
    final usersRaw = (map['users'] as Map?) ?? const {};
    final users = <String, GameUser>{};
    usersRaw.forEach((key, value) {
      users[key as String] =
          GameUser.fromMap(key, Map<String, dynamic>.from(value as Map));
    });
    return Game(
      id: id,
      state: GameState.fromValue(map['state'] as int),
      creator: map['creator'] as String,
      creationTimestampMs: (map['creationTimestampMs'] as num?)?.toInt() ?? 0,
      code: map['code'] as String?,
      users: users,
      usersOrder: ((map['usersOrder'] as List?) ?? const [])
          .map((e) => e as String)
          .toList(),
      threads: ((map['threads'] as List?) ?? const [])
          .map((t) => GameThread.fromMap(Map<String, dynamic>.from(t as Map)))
          .toList(),
    );
  }

  Map<String, dynamic> toMap() => {
        'state': state.value,
        'creator': creator,
        'creationTimestampMs': creationTimestampMs,
        if (code != null) 'code': code,
        'users': {for (final u in users.entries) u.key: u.value.toMap()},
        'usersOrder': usersOrder,
        'playerCount': playerCount,
        'threads': threads.map((t) => t.toMap()).toList(),
      };
}

/// The location of an atom within a game (thread index + atom index).
class AtomAddress {
  const AtomAddress({required this.threadIndex, required this.atomIndex});

  final int threadIndex;
  final int atomIndex;

  @override
  bool operator ==(Object other) =>
      other is AtomAddress &&
      other.threadIndex == threadIndex &&
      other.atomIndex == atomIndex;

  @override
  int get hashCode => Object.hash(threadIndex, atomIndex);

  @override
  String toString() => 'AtomAddress(t=$threadIndex, a=$atomIndex)';
}

/// Result of resolving the next atom a player should act on.
class NextAtom {
  const NextAtom({
    required this.address,
    required this.readyToPlay,
    required this.allAtomsDone,
  });

  /// The next not-done atom for the player, or null if all are done.
  final AtomAddress? address;

  /// True only if [address] is the first atom or its predecessor is done.
  final bool readyToPlay;

  /// True if the player has completed every atom assigned to them.
  final bool allAtomsDone;
}
