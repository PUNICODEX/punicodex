package com.punicodex.authenticity.wear

import com.punicodex.authenticity.AuthenticitySDK

/**
 * Lightweight Wear OS service that classifies notification text before it is
 * shown on the watch face.
 */
class AuthenticityWatchService {

    private val sdk = AuthenticitySDK.shared

    /**
     * Returns a user-facing summary for a notification that contains a URL.
     */
    fun classifyNotification(input: String): Pair<Boolean, String> {
        val result = sdk.classifyUrl(input)
        return when (result.severity) {
            Severity.CRITICAL, Severity.HIGH ->
                false to "⚠️ ${result.label}: may spoof ${result.targetIdentity?.name ?: "a trusted site"}"
            Severity.MEDIUM ->
                true to "⚡ ${result.label}: review carefully"
            else ->
                true to "✅ ${result.label}: looks safe"
        }
    }
}
