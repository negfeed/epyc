import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../drawing/replaying_drawing_pad.dart';
import '../../models/drawing_event.dart';
import '../../models/enums.dart';
import '../../models/game.dart';
import '../../providers/providers.dart';

/// Guess screen: the player watches the previous drawing replay and types a
/// guess for what is being drawn.
///
/// Ports `src/pages/guess/guess.ts`. On entry it marks the atom STARTED
/// (exactly once). On "Submit" it marks the atom DONE with the trimmed guess.
/// Navigation away is driven by the host screen reacting to the game state
/// change — we never navigate manually.
class GuessScreen extends ConsumerStatefulWidget {
  const GuessScreen({
    super.key,
    required this.gameId,
    required this.address,
    required this.drawingKey,
  });

  final String gameId;
  final AtomAddress address;
  final String? drawingKey;

  @override
  ConsumerState<GuessScreen> createState() => _GuessScreenState();
}

class _GuessScreenState extends ConsumerState<GuessScreen> {
  final TextEditingController _controller = TextEditingController();

  /// Guards the started write so it runs exactly once across rebuilds.
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onGuessChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _initOnce());
  }

  Future<void> _initOnce() async {
    if (_initialized) return;
    _initialized = true;

    final gameRepository = ref.read(gameRepositoryProvider);
    final currentUid = ref.read(currentUidProvider);
    await gameRepository.updateAtom(
      widget.gameId,
      widget.address,
      state: GameAtomState.started,
      authorUid: currentUid,
    );
  }

  void _onGuessChanged() => setState(() {});

  bool get _canSubmit => _controller.text.trim().isNotEmpty;

  Future<void> _submit() async {
    if (!_canSubmit) return;
    final gameRepository = ref.read(gameRepositoryProvider);
    final currentUid = ref.read(currentUidProvider);
    await gameRepository.updateAtom(
      widget.gameId,
      widget.address,
      state: GameAtomState.done,
      guess: _controller.text.trim(),
      authorUid: currentUid,
    );
    // Host screen reacts to the DONE state and navigates; nothing more here.
  }

  @override
  void dispose() {
    _controller.removeListener(_onGuessChanged);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final drawingKey = widget.drawingKey;
    final List<DrawingEvent> events = drawingKey == null
        ? const []
        : (ref.watch(drawingEventsProvider(drawingKey)).valueOrNull ??
            const []);

    return Scaffold(
      appBar: AppBar(title: const Text('Guess what is being drawn')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(
                        hintText: 'Enter your guess here',
                      ),
                      onSubmitted: (_) => _submit(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: _canSubmit ? _submit : null,
                    child: const Text('Submit'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ReplayingDrawingPad(events: events),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
