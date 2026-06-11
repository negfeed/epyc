import 'package:flutter/material.dart';

/// Shared "Leave Game" confirmation, ported from
/// `GameNavigationController.leaveGame` (game-navigation-controller.ts:169-193).
///
/// Returns true if the user confirmed they want to leave.
Future<bool> confirmLeaveGame(BuildContext context) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Leave Game'),
      content: const Text('Are you sure you want to leave the game?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('No, keep me here'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text("Yes, I'll return later"),
        ),
      ],
    ),
  );
  return result ?? false;
}
