import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';

/// Login screen with Google and Sign-in-with-Apple flows.
///
/// Navigation on success is handled by the top-level router redirect
/// (auth state change → router re-evaluates); we never call context.go here.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _loadingGoogle = false;
  bool _loadingApple = false;

  bool get _anyLoading => _loadingGoogle || _loadingApple;

  Future<void> _signInWithGoogle() async {
    setState(() => _loadingGoogle = true);
    try {
      await ref.read(authRepositoryProvider).signInWithGoogle();
      // Router redirect handles navigation on successful sign-in.
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingGoogle = false);
    }
  }

  Future<void> _signInWithApple() async {
    setState(() => _loadingApple = true);
    try {
      await ref.read(authRepositoryProvider).signInWithApple();
      // Router redirect handles navigation on successful sign-in.
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingApple = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'EPYC',
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Eat Poop You Cat',
                  style: TextStyle(
                    color: AppColors.dark.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 40),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _anyLoading ? null : _signInWithGoogle,
                    icon: _loadingGoogle
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.login),
                    label: const Text('Sign in with Google'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _anyLoading ? null : _signInWithApple,
                    icon: _loadingApple
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.apple),
                    label: const Text('Sign in with Apple'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
