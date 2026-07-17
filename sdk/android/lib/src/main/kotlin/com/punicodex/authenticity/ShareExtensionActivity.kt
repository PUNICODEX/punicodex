package com.punicodex.authenticity

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast

/**
 * Android share-extension entry point.
 *
 * Register this activity with an intent filter for ACTION_SEND / text/plain
 * so users can share any link from Safari, Mail, Messages, or other apps into
 * the PuniCodex Authenticity Checker.
 */
class ShareExtensionActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            val shared = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
            val result = AuthenticitySDK.shared.classifyUrl(shared)
            val message = buildResultMessage(result)
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }

        finish()
    }

    private fun buildResultMessage(result: AuthenticityVerdict): String {
        return when (result.severity) {
            Severity.CRITICAL, Severity.HIGH ->
                "⚠️ ${result.label}: ${result.input} looks like ${result.targetIdentity?.name ?: "a trusted site"}"
            Severity.MEDIUM ->
                "⚡ ${result.label}: ${result.input}"
            else ->
                "✅ ${result.label}: ${result.input}"
        }
    }
}
