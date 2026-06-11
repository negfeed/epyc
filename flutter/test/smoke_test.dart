import 'package:epyc/src/features/login/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Renders the Login screen in isolation (no Firebase init needed — the screen
/// only touches providers on button press). Booting the full app would require
/// `Firebase.initializeApp()`, so the app-level boot is verified manually via
/// `flutter run` (see README).
void main() {
  testWidgets('Login screen renders its sign-in options', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pump();

    expect(find.text('EPYC'), findsOneWidget);
    expect(find.text('Sign in with Google'), findsOneWidget);
    expect(find.text('Sign in with Apple'), findsOneWidget);
  });
}
