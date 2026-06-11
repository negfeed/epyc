import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'firebase_options.dart';
import 'src/app.dart';

/// Initializes Firebase from the generated [DefaultFirebaseOptions] (project
/// `epyc-flutter`). Init is guarded so the app still launches and shows a setup
/// screen rather than crashing if configuration is ever missing.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  var firebaseReady = false;
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    firebaseReady = true;
  } catch (_) {
    firebaseReady = false;
  }
  runApp(ProviderScope(child: EpycApp(firebaseReady: firebaseReady)));
}
