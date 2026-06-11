import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'routing/router.dart';
import 'theme/app_theme.dart';

/// Root of the EPYC Flutter app: Riverpod + go_router + theme. The router's
/// auth redirect and `GameHostScreen` drive the rest of the experience.
///
/// When [firebaseReady] is false (no `flutterfire configure` run yet), the app
/// shows a setup screen instead of touching Firebase services, so it can still
/// launch for UI exploration.
class EpycApp extends ConsumerWidget {
  const EpycApp({super.key, this.firebaseReady = true});

  final bool firebaseReady;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!firebaseReady) {
      return const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: _FirebaseSetupScreen(),
      );
    }
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'EPYC',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}

class _FirebaseSetupScreen extends StatelessWidget {
  const _FirebaseSetupScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.splashBackground,
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'EPYC',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 16),
              Text(
                'Firebase is not configured yet.',
                style: TextStyle(color: Colors.white, fontSize: 18),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 12),
              Text(
                'Run  flutterfire configure  for the\n'
                'com.negfeed.epycflutter app, then relaunch.',
                style: TextStyle(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
