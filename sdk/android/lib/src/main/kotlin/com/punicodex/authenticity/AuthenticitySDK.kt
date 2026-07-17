package com.punicodex.authenticity

import java.net.URL

/**
 * PuniCodex Authenticity Shield — Android SDK
 *
 * Lightweight offline classifier for homograph and mixed-script attacks.
 * Mirrors the API contract of the iOS Swift SDK and the JS SDK.
 */
class AuthenticitySDK @JvmOverloads constructor(
    private val threshold: Double = DEFAULT_THRESHOLD
) {

    companion object {
        const val DEFAULT_THRESHOLD = 0.85

        @JvmStatic
        val shared: AuthenticitySDK by lazy { AuthenticitySDK() }
    }

    private val brands: List<BrandIdentity> = BrandSeed.pack
    private val confusables: Map<String, String> = ConfusableSeed.map
    private val invisibleCodePoints: Set<Int> = InvisibleSeed.codePoints
    private val bidiCodePoints: Set<Int> = BidiSeed.codePoints

    /**
     * Classify a term (name, domain label, or pasted text).
     */
    fun classify(input: String): AuthenticityVerdict {
        val raw = input.trim()
        if (raw.isEmpty()) {
            return AuthenticityVerdict(
                input = raw,
                verdict = Verdict.UNKNOWN,
                severity = Severity.NONE,
                label = "Unknown",
                explanation = "No protected identity or spoofing signals detected.",
                recommendations = emptyList(),
                targetIdentity = null,
                safeAlternatives = emptyList(),
                reasons = listOf("Empty input")
            )
        }

        val decomposition = decompose(raw)
        val (blockedIdentity, blockedPattern) = matchBlockedPattern(raw)

        if (blockedIdentity != null) {
            return AuthenticityVerdict(
                input = raw,
                verdict = Verdict.UNSAFE,
                severity = Severity.CRITICAL,
                label = "Unsafe",
                explanation = "Contains blocked patterns, invisible characters, or bidirectional overrides.",
                recommendations = listOf(
                    "Block or delete this input",
                    "Report it to your security team"
                ),
                targetIdentity = blockedIdentity,
                safeAlternatives = blockedIdentity.domains.map { "https://$it" },
                reasons = listOf(
                    "Matches blocked pattern \"$blockedPattern\" for ${blockedIdentity.name}"
                ),
                decomposition = decomposition
            )
        }

        val (exactIdentity, bestLookalike, bestScore) = matchIdentity(raw)

        val isCleanExact = exactIdentity != null
            && !decomposition.hasConfusables
            && !decomposition.hasMixedScripts
            && !decomposition.hasInvisibleChars
            && !decomposition.hasBidirectionalOverride

        if (isCleanExact && exactIdentity != null) {
            return AuthenticityVerdict(
                input = raw,
                verdict = Verdict.STYLED,
                severity = Severity.LOW,
                label = "Styled Brand Mention",
                explanation = "Uses legitimate characters that match a protected identity.",
                recommendations = emptyList(),
                targetIdentity = exactIdentity,
                safeAlternatives = exactIdentity.domains.map { "https://$it" },
                reasons = listOf("Exact match for ${exactIdentity.name}"),
                decomposition = decomposition
            )
        }

        if (bestScore >= threshold && bestLookalike != null) {
            val spoofSignals = decomposition.hasConfusables
                || decomposition.hasMixedScripts
                || decomposition.hasInvisibleChars
                || decomposition.hasBidirectionalOverride

            return if (spoofSignals) {
                AuthenticityVerdict(
                    input = raw,
                    verdict = Verdict.HOMOGRAPH_SPOOF,
                    severity = Severity.HIGH,
                    label = "Homograph Spoof",
                    explanation = "Visually mimics a trusted identity using confusable characters.",
                    recommendations = listOf(
                        "Do not trust this input",
                        "Visit the official site directly"
                    ),
                    targetIdentity = bestLookalike.identity,
                    safeAlternatives = bestLookalike.identity.domains.map { "https://$it" },
                    reasons = listOf(
                        "Visually similar to ${bestLookalike.identity.name} with spoofing signals"
                    ),
                    decomposition = decomposition,
                    scores = mapOf("similarity" to bestLookalike.score)
                )
            } else {
                AuthenticityVerdict(
                    input = raw,
                    verdict = Verdict.RECOGNIZED_VARIANT,
                    severity = Severity.LOW,
                    label = "Recognized Variant",
                    explanation = "A known legitimate variant of a protected identity.",
                    recommendations = emptyList(),
                    targetIdentity = bestLookalike.identity,
                    safeAlternatives = bestLookalike.identity.domains.map { "https://$it" },
                    reasons = listOf("Recognized variant of ${bestLookalike.identity.name}"),
                    decomposition = decomposition,
                    scores = mapOf("similarity" to bestLookalike.score)
                )
            }
        }

        if (decomposition.hasMixedScripts) {
            return AuthenticityVerdict(
                input = raw,
                verdict = Verdict.MIXED_SCRIPT_SPOOF,
                severity = Severity.HIGH,
                label = "Mixed-Script Spoof",
                explanation = "Combines characters from multiple writing systems.",
                recommendations = listOf(
                    "Inspect every character carefully",
                    "Verify the source"
                ),
                targetIdentity = null,
                safeAlternatives = emptyList(),
                reasons = listOf("Input mixes scripts from multiple writing systems"),
                decomposition = decomposition
            )
        }

        if (decomposition.hasInvisibleChars || decomposition.hasBidirectionalOverride) {
            return AuthenticityVerdict(
                input = raw,
                verdict = Verdict.UNSAFE,
                severity = Severity.CRITICAL,
                label = "Unsafe",
                explanation = "Contains blocked patterns, invisible characters, or bidirectional overrides.",
                recommendations = listOf(
                    "Block or delete this input",
                    "Report it to your security team"
                ),
                targetIdentity = null,
                safeAlternatives = emptyList(),
                reasons = listOf(
                    "Input contains invisible or bidirectional-override characters"
                ),
                decomposition = decomposition
            )
        }

        if (decomposition.hasConfusables) {
            return AuthenticityVerdict(
                input = raw,
                verdict = Verdict.TRANSLITERATION_UNCERTAIN,
                severity = Severity.MEDIUM,
                label = "Transliteration Uncertain",
                explanation = "Contains confusable characters but no known brand lookalike.",
                recommendations = listOf("Inspect every character carefully"),
                targetIdentity = null,
                safeAlternatives = emptyList(),
                reasons = listOf(
                    "Input contains confusable characters but no known brand lookalike"
                ),
                decomposition = decomposition
            )
        }

        return AuthenticityVerdict(
            input = raw,
            verdict = Verdict.UNKNOWN,
            severity = Severity.NONE,
            label = "Unknown",
            explanation = "No protected identity or spoofing signals detected.",
            recommendations = emptyList(),
            targetIdentity = null,
            safeAlternatives = emptyList(),
            reasons = listOf("No protected identity or spoofing signals detected"),
            decomposition = decomposition
        )
    }

    /**
     * Classify a full URL, extracting the hostname for analysis.
     */
    fun checkUrl(urlString: String): AuthenticityVerdict {
        val host = try {
            URL(urlString).host
        } catch (_: Exception) {
            null
        }
        return if (host.isNullOrEmpty()) {
            classify(urlString)
        } else {
            classify(host).copy(
                input = urlString,
                reasons = listOf("Analyzed host: $host") + classify(host).reasons
            )
        }
    }

    /**
     * Evaluate a verdict against a policy to decide the final action.
     */
    fun decideAction(verdict: AuthenticityVerdict, policy: Policy = Policy()): Action {
        if (policy.allowlist?.contains(verdict.input) == true) {
            return Action(ActionType.ALLOW, "allowlist", policy.uiTheme)
        }
        if (policy.blocklist?.contains(verdict.input) == true) {
            return Action(ActionType.BLOCK, "blocklist", policy.uiTheme)
        }
        val severityAction = policy.severityActions[verdict.severity] ?: policy.defaultAction
        return Action(severityAction, "severity", policy.uiTheme)
    }

    /**
     * Validate an app-attestation token to help prevent SDK tampering.
     */
    fun validateAttestation(token: ByteArray): Boolean {
        // Production implementations should verify the token with Play Integrity
        // or SafetyNet. This stub accepts non-empty tokens.
        return token.isNotEmpty()
    }

    // Internal helpers

    private fun matchBlockedPattern(raw: String): Pair<BrandIdentity?, String?> {
        val lower = raw.lowercase()
        for (identity in brands) {
            for (pattern in identity.blockedPatterns) {
                if (pattern.toRegex().containsMatchIn(lower)) {
                    return identity to pattern
                }
            }
        }
        return null to null
    }

    private fun matchIdentity(raw: String): Triple<BrandIdentity?, Lookalike?, Double> {
        val lower = raw.lowercase()
        var exact: BrandIdentity? = null
        var bestLookalike: Lookalike? = null
        var bestScore = 0.0

        for (identity in brands) {
            for (alias in identity.aliases) {
                if (lower == alias.lowercase()) {
                    exact = identity
                    break
                }
                val score = skeletonSimilarity(raw, alias)
                if (score > bestScore) {
                    bestScore = score
                    bestLookalike = Lookalike(identity, alias, score)
                }
            }
            if (exact != null) break
        }

        return Triple(exact, bestLookalike, bestScore)
    }

    private fun skeletonSimilarity(a: String, b: String): Double {
        val sa = foldSkeleton(a)
        val sb = foldSkeleton(b)
        if (sa == sb) return 1.0
        if (sa.isEmpty() || sb.isEmpty()) return 0.0
        val longer = if (sa.length > sb.length) sa else sb
        val shorter = if (sa.length > sb.length) sb else sa
        var matches = 0
        for (i in shorter.indices) {
            if (shorter[i] == longer[i]) matches++
        }
        return matches.toDouble() / longer.length
    }

    private fun foldSkeleton(input: String): String {
        val folded = buildString {
            for (char in input) {
                append(confusables[char.toString()] ?: char.toString())
            }
        }
        return folded
            .replace("rn", "m")
            .replace("vv", "w")
            .replace("cl", "d")
            .replace("nn", "m")
            .replace("lI", "U")
            .lowercase()
    }

    private fun decompose(input: String): Decomposition {
        val chars = mutableListOf<CharAttestation>()
        val scripts = mutableSetOf<String>()
        var hasConfusables = false
        var hasInvisibleChars = false
        var hasBidiOverride = false

        for (codePoint in input.codePoints()) {
            val char = String(Character.toChars(codePoint))
            val script = scriptOf(codePoint)
            scripts.add(script)
            val isConfusable = confusables.containsKey(char)
            val isInvisible = invisibleCodePoints.contains(codePoint)
            val isBidi = bidiCodePoints.contains(codePoint)

            if (isConfusable) hasConfusables = true
            if (isInvisible) hasInvisibleChars = true
            if (isBidi) hasBidiOverride = true

            chars.add(
                CharAttestation(
                    char = char,
                    codePoint = codePoint,
                    script = script,
                    confusableTarget = if (isConfusable) confusables[char] else null,
                    isInvisible = isInvisible,
                    isBidiOverride = isBidi
                )
            )
        }

        val meaningful = scripts.filter { it != "Other" }
        val hasMixedScripts = meaningful.size > 1
            || (meaningful.contains("Latin") && meaningful.any { it != "Latin" })

        return Decomposition(
            chars = chars,
            scripts = scripts.toList(),
            hasConfusables = hasConfusables,
            hasInvisibleChars = hasInvisibleChars,
            hasBidirectionalOverride = hasBidiOverride,
            hasMixedScripts = hasMixedScripts
        )
    }

    private fun scriptOf(codePoint: Int): String {
        return when (codePoint) {
            in 0x41..0x5a, in 0x61..0x7a, in 0x00c0..0x024f -> "Latin"
            in 0x0400..0x04ff -> "Cyrillic"
            in 0x0370..0x03ff -> "Greek"
            in 0x0530..0x058f -> "Armenian"
            in 0x10a0..0x10ff -> "Georgian"
            in 0x0600..0x06ff -> "Arabic"
            in 0x0900..0x097f -> "Devanagari"
            in 0x4e00..0x9fff, in 0x3040..0x309f, in 0x30a0..0x30ff -> "CJK"
            else -> "Other"
        }
    }
}

// Data models

data class AuthenticityVerdict(
    val input: String,
    val verdict: Verdict,
    val severity: Severity,
    val label: String,
    val explanation: String,
    val recommendations: List<String>,
    val targetIdentity: BrandIdentity?,
    val safeAlternatives: List<String>,
    val reasons: List<String>,
    val decomposition: Decomposition? = null,
    val scores: Map<String, Double> = emptyMap()
)

enum class Verdict(val value: String) {
    CANONICAL("canonical"),
    STYLED("styled"),
    RECOGNIZED_VARIANT("recognized-variant"),
    TRANSLITERATION_UNCERTAIN("transliteration-uncertain"),
    LOOKALIKE_DOMAIN("lookalike-domain"),
    HOMOGRAPH_SPOOF("homograph-spoof"),
    MIXED_SCRIPT_SPOOF("mixed-script-spoof"),
    UNSAFE("unsafe"),
    UNKNOWN("unknown"),
}

enum class Severity(val value: String) {
    NONE("none"),
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high"),
    CRITICAL("critical"),
}

enum class ActionType(val value: String) {
    ALLOW("allow"),
    WARN("warn"),
    LOG("log"),
    BLOCK("block"),
}

data class Action(
    val action: ActionType,
    val reason: String,
    val uiTheme: String
)

data class Policy(
    val defaultAction: ActionType = ActionType.WARN,
    val severityActions: Map<Severity, ActionType> = emptyMap(),
    val allowlist: List<String>? = null,
    val blocklist: List<String>? = null,
    val uiTheme: String = "inline"
)

data class BrandIdentity(
    val id: String,
    val name: String,
    val aliases: List<String>,
    val domains: List<String>,
    val blockedPatterns: List<String>
)

data class CharAttestation(
    val char: String,
    val codePoint: Int,
    val script: String,
    val confusableTarget: String?,
    val isInvisible: Boolean,
    val isBidiOverride: Boolean
)

data class Decomposition(
    val chars: List<CharAttestation>,
    val scripts: List<String>,
    val hasConfusables: Boolean,
    val hasInvisibleChars: Boolean,
    val hasBidirectionalOverride: Boolean,
    val hasMixedScripts: Boolean
)

data class Lookalike(
    val identity: BrandIdentity,
    val alias: String,
    val score: Double
)

// Seed data

private object BrandSeed {
    val pack: List<BrandIdentity> = listOf(
        BrandIdentity(
            id = "apple",
            name = "Apple",
            aliases = listOf("apple", "apple.com", "www.apple.com"),
            domains = listOf("apple.com", "www.apple.com"),
            blockedPatterns = listOf("fake-apple", "evil-apple")
        ),
        BrandIdentity(
            id = "hermes-brand",
            name = "Hermès",
            aliases = listOf("hermès", "hermes", "hermes.com"),
            domains = listOf("hermes.com"),
            blockedPatterns = listOf("fake-hermes")
        ),
        BrandIdentity(
            id = "nike",
            name = "Nike",
            aliases = listOf("nike", "nike.com"),
            domains = listOf("nike.com"),
            blockedPatterns = listOf("fake-nike")
        ),
        BrandIdentity(
            id = "google",
            name = "Google",
            aliases = listOf("google", "google.com"),
            domains = listOf("google.com"),
            blockedPatterns = listOf("fake-google")
        ),
    )
}

private object ConfusableSeed {
    val map: Map<String, String> = mapOf(
        "\u0430" to "a",
        "\u0435" to "e",
        "\u043E" to "o",
        "\u0440" to "p",
        "\u0441" to "c",
        "\u0445" to "x",
        "\u0456" to "i",
        "\u0458" to "j",
        "\u0432" to "b",
        "\u043C" to "m",
        "\u043D" to "n",
        "\u0442" to "t",
        "\u03B1" to "a",
        "\u03B5" to "e",
        "\u03BF" to "o",
        "\u03C1" to "p",
        "\u0585" to "o",
    )
}

private object InvisibleSeed {
    val codePoints: Set<Int> = setOf(
        0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
        0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
        0x2066, 0x2067, 0x2068, 0x2069,
        0x180e, 0x200e, 0x200f, 0x061c, 0x00ad,
    )
}

private object BidiSeed {
    val codePoints: Set<Int> = setOf(
        0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
        0x2066, 0x2067, 0x2068, 0x2069,
        0x200e, 0x200f, 0x061c,
    )
}
