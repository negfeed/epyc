import 'package:flutter/material.dart';

/// Color palette and theme ported from the Ionic app's
/// `src/theme/variables.scss`.
abstract class AppColors {
  static const Color primary = Color(0xFF387EF5); // Ionic blue
  static const Color secondary = Color(0xFF32DB64); // Ionic green
  static const Color danger = Color(0xFFF53D3D); // Ionic red
  static const Color light = Color(0xFFF4F4F4);
  static const Color dark = Color(0xFF222222);
  static const Color splashBackground = Color(0xFF000080); // navy splash
}

abstract class AppTheme {
  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      error: AppColors.danger,
      brightness: Brightness.light,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: Colors.white,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
    );
  }
}
