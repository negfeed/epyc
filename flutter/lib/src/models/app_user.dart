/// Authenticated user info, ported from `AuthUserInfo` in
/// `src/providers/auth/auth.ts`.
class AuthUserInfo {
  const AuthUserInfo({
    required this.uid,
    required this.displayName,
    required this.photoURL,
    this.email,
  });

  final String uid;
  final String? displayName;
  final String? photoURL;
  final String? email;

  /// A human label for the user: display name, else the email's local part,
  /// else a generic fallback.
  String get label {
    final name = displayName?.trim();
    if (name != null && name.isNotEmpty) return name;
    final mail = email?.trim();
    if (mail != null && mail.isNotEmpty) {
      return mail.contains('@') ? mail.split('@').first : mail;
    }
    return 'Player';
  }

  /// A single uppercase initial for avatar fallbacks.
  String get initial {
    final l = label;
    return l.isEmpty ? '?' : l.substring(0, 1).toUpperCase();
  }
}

/// A reference to a game the user has joined, stored under
/// `users/{uid}/games/{gameId}` (ported from `UserModel.Game`).
class UserGameRef {
  const UserGameRef({required this.gameId, required this.joinTimestampMs});

  final String gameId;
  final int joinTimestampMs;

  factory UserGameRef.fromMap(String gameId, Map<String, dynamic> map) =>
      UserGameRef(
        gameId: gameId,
        joinTimestampMs: (map['joinTimestampMs'] as num?)?.toInt() ?? 0,
      );

  Map<String, dynamic> toMap() => {'joinTimestampMs': joinTimestampMs};
}
