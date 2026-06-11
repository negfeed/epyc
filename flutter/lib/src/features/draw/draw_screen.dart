import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../drawing/recording_drawing_pad.dart';
import '../../models/drawing_event.dart';
import '../../models/enums.dart';
import '../../models/game.dart';
import '../../providers/providers.dart';
import '../../theme/app_theme.dart';

/// Draw screen: the player draws the assigned [word], then submits.
///
/// Ports `src/pages/draw/draw.ts`. On entry it creates a drawing instance and
/// marks the atom STARTED (exactly once), records events via the
/// [RecordingDrawingPad], and on "Next" runs a 5-second countdown before
/// marking the atom DONE. Navigation away is driven by the host screen reacting
/// to the game state change — we never navigate manually.
class DrawScreen extends ConsumerStatefulWidget {
  const DrawScreen({
    super.key,
    required this.gameId,
    required this.address,
    required this.word,
  });

  final String gameId;
  final AtomAddress address;
  final String word;

  @override
  ConsumerState<DrawScreen> createState() => _DrawScreenState();
}

class _DrawScreenState extends ConsumerState<DrawScreen> {
  static const int _countdownInSeconds = 5;

  /// Guards the create/started write so it runs exactly once even across
  /// rebuilds.
  bool _initialized = false;

  /// The drawing instance id, available after the one-time init completes.
  String? _drawingId;

  /// Whether the user has drawn anything yet (gates the Next button).
  bool _somethingIsDrawn = false;

  /// Countdown state, mirroring the original page.
  bool _countdownInProgress = false;
  int _countdownValue = _countdownInSeconds;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    // Defer to after first frame so we can safely read providers and setState.
    WidgetsBinding.instance.addPostFrameCallback((_) => _initOnce());
  }

  Future<void> _initOnce() async {
    if (_initialized) return;
    _initialized = true;

    final drawingRepository = ref.read(drawingRepositoryProvider);
    final gameRepository = ref.read(gameRepositoryProvider);
    final currentUid = ref.read(currentUidProvider);

    final drawingId = await drawingRepository.createInstance();
    await gameRepository.updateAtom(
      widget.gameId,
      widget.address,
      state: GameAtomState.started,
      drawingRef: drawingId,
      authorUid: currentUid,
    );

    if (!mounted) return;
    setState(() => _drawingId = drawingId);
  }

  void _onPersistEvent(DrawingEvent event, int seq) {
    final drawingId = _drawingId;
    if (drawingId == null) return;
    ref.read(drawingRepositoryProvider).appendEvent(drawingId, event, seq);
  }

  void _onContentChanged(bool hasContent) {
    if (_somethingIsDrawn == hasContent) return;
    setState(() => _somethingIsDrawn = hasContent);
  }

  bool get _canSubmit => _somethingIsDrawn;

  void _next() {
    if (!_canSubmit) return;
    if (_countdownInProgress) {
      // Pressing again cancels the countdown (matches original toggle).
      _countdownTimer?.cancel();
      setState(() => _countdownInProgress = false);
    } else {
      setState(() {
        _countdownInProgress = true;
        _countdownValue = _countdownInSeconds;
      });
      _scheduleCountdownStep();
    }
  }

  void _scheduleCountdownStep() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer(const Duration(seconds: 1), _handleCountdown);
  }

  Future<void> _handleCountdown() async {
    if (!_countdownInProgress) return;
    final next = _countdownValue - 1;
    if (next <= 0) {
      final gameRepository = ref.read(gameRepositoryProvider);
      final currentUid = ref.read(currentUidProvider);
      await gameRepository.updateAtom(
        widget.gameId,
        widget.address,
        state: GameAtomState.done,
        authorUid: currentUid,
      );
      // Host screen reacts to the DONE state and navigates; nothing more here.
    } else {
      if (!mounted) return;
      setState(() => _countdownValue = next);
      _scheduleCountdownStep();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color buttonColor = !_canSubmit
        ? AppColors.light
        : (_countdownInProgress ? AppColors.danger : AppColors.primary);
    final String buttonLabel =
        _countdownInProgress ? 'Wait wait ... $_countdownValue' : 'Next';

    return Scaffold(
      appBar: AppBar(title: Text('Draw ${widget.word}')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Expanded(
                child: RecordingDrawingPad(
                  onPersistEvent: _onPersistEvent,
                  onContentChanged: _onContentChanged,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _canSubmit ? _next : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: buttonColor,
                  ),
                  child: Text(buttonLabel),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
