import 'package:flutter/services.dart';

/// PÚNYCODEX — Flutter wrapper for the Name Authenticity Shield.
///
/// The core classifier runs through a platform channel into the native iOS or
/// Android SDK. Pure-Dart fallback methods are provided for testing.
class PunycodexAuthenticity {
  static const MethodChannel _channel =
      MethodChannel('com.punycodex.authenticity');

  /// Classify a term (name, domain label, or pasted text).
  static Future<Map<String, dynamic>> classify(String input) async {
    try {
      final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
        'classify',
        {'input': input},
      );
      return _castMap(result ?? {});
    } on MissingPluginException {
      // Fallback when running outside a plugin host (e.g. unit tests).
      return _fallbackClassify(input);
    }
  }

  /// Classify a full URL, extracting the hostname for analysis.
  static Future<Map<String, dynamic>> classifyUrl(String url) async {
    try {
      final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
        'classifyUrl',
        {'url': url},
      );
      return _castMap(result ?? {});
    } on MissingPluginException {
      return _fallbackClassify(url);
    }
  }

  /// Validate an app-attestation token to help prevent SDK tampering.
  static Future<bool> validateAttestation(List<int> token) async {
    try {
      return await _channel.invokeMethod<bool>(
            'validateAttestation',
            {'token': token},
          ) ??
          false;
    } on MissingPluginException {
      return token.isNotEmpty;
    }
  }

  static Map<String, dynamic> _fallbackClassify(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      return {
        'input': trimmed,
        'verdict': 'unknown',
        'severity': 'none',
        'label': 'Unknown',
      };
    }
    return {
      'input': trimmed,
      'verdict': 'unknown',
      'severity': 'none',
      'label': 'Unknown',
      'explanation': 'Flutter fallback: native SDK not available.',
    };
  }

  static Map<String, dynamic> _castMap(Map<dynamic, dynamic> input) {
    return input.map((key, value) => MapEntry(key.toString(), value));
  }
}
