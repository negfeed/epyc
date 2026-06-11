import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import '../../models/app_user.dart';

/// Authentication, replacing the Facebook-only flow in
/// `src/providers/auth/auth.ts` with Google + Sign in with Apple.
///
/// Uses `firebase_auth`'s built-in federated provider sign-in
/// ([FirebaseAuth.signInWithProvider]) so no extra `google_sign_in` /
/// `sign_in_with_apple` plugins are required — Firebase opens the native
/// provider flow and exchanges the result for a Firebase credential.
class AuthRepository {
  AuthRepository(this._auth);

  final FirebaseAuth _auth;

  /// Port of the `signedIn` observable (auth.ts:35-40), mapped to user info.
  Stream<AuthUserInfo?> authStateChanges() =>
      _auth.authStateChanges().map(_toInfo);

  AuthUserInfo? get currentUser => _toInfo(_auth.currentUser);

  AuthUserInfo? _toInfo(User? user) {
    if (user == null) return null;
    // The federated `signInWithProvider` flow may leave some top-level profile
    // fields null while populating `providerData` (and vice-versa), so fall
    // back across both sources.
    // FlutterFire often returns "" (empty) rather than null for absent fields,
    // so coalesce blanks to null before falling back.
    String? nz(String? s) => (s != null && s.trim().isNotEmpty) ? s.trim() : null;
    String? name = nz(user.displayName);
    String? photo = nz(user.photoURL);
    String? email = nz(user.email);
    for (final p in user.providerData) {
      name ??= nz(p.displayName);
      photo ??= nz(p.photoURL);
      email ??= nz(p.email);
    }
    return AuthUserInfo(
      uid: user.uid,
      displayName: name,
      photoURL: photo,
      email: email,
    );
  }

  /// Google sign-in via Firebase's provider flow. Port of `doLogin` semantics.
  ///
  /// `prompt: select_account` forces Google to show the account chooser every
  /// time, so after signing out the user can pick a different account instead
  /// of being silently re-authenticated into the previous one.
  Future<AuthUserInfo?> signInWithGoogle() async {
    final provider = GoogleAuthProvider()
      ..addScope('email')
      ..setCustomParameters({'prompt': 'select_account'});
    // `signInWithProvider` is mobile-only; web must use a popup.
    final result = kIsWeb
        ? await _auth.signInWithPopup(provider)
        : await _auth.signInWithProvider(provider);
    return _toInfo(result.user);
  }

  /// Sign in with Apple via Firebase's provider flow.
  Future<AuthUserInfo?> signInWithApple() async {
    final provider = AppleAuthProvider()
      ..addScope('email')
      ..addScope('name');
    final result = kIsWeb
        ? await _auth.signInWithPopup(provider)
        : await _auth.signInWithProvider(provider);
    return _toInfo(result.user);
  }

  /// Port of `doLogout` (auth.ts:83-91).
  Future<void> signOut() => _auth.signOut();
}
