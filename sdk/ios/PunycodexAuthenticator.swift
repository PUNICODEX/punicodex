import Foundation

/// PÚNYCODEX Authenticity Shield — iOS / watchOS / iPadOS SDK
///
/// Lightweight offline classifier for homograph and mixed-script attacks.
/// Mirrors the API contract of the Android Kotlin SDK and the JS SDK so
/// wrappers (React Native, Flutter) can share the same surface.
public final class PunycodexAuthenticator: Sendable {

    public static let shared = PunycodexAuthenticator()

    private let brands: [BrandIdentity]
    private let confusables: [String: String]
    private let invisibleCodePoints: Set<UInt32>
    private let bidiCodePoints: Set<UInt32>
    private let threshold: Double

    public init(threshold: Double = 0.85) {
        self.threshold = threshold
        self.brands = BrandSeed.pack
        self.confusables = ConfusableSeed.map
        self.invisibleCodePoints = InvisibleSeed.codePoints
        self.bidiCodePoints = BidiSeed.codePoints
    }

    // MARK: - Public API

    /// Classify a term (name, domain label, or pasted text).
    public func classify(_ input: String) -> AuthenticityVerdict {
        let raw = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else {
            return AuthenticityVerdict(
                input: raw,
                verdict: .unknown,
                severity: .none,
                label: "Unknown",
                explanation: "No protected identity or spoofing signals detected.",
                recommendations: [],
                targetIdentity: nil,
                safeAlternatives: [],
                reasons: ["Empty input"]
            )
        }

        let decomposition = decompose(raw)
        let (blocked, blockedPattern) = matchBlockedPattern(raw)

        if let blocked {
            return AuthenticityVerdict(
                input: raw,
                verdict: .unsafe,
                severity: .critical,
                label: "Unsafe",
                explanation: "Contains blocked patterns, invisible characters, or bidirectional overrides.",
                recommendations: ["Block or delete this input", "Report it to your security team"],
                targetIdentity: blocked,
                safeAlternatives: blocked.domains.map { "https://\($0)" },
                reasons: ["Matches blocked pattern \"\(blockedPattern ?? "")\" for \(blocked.name)"],
                decomposition: decomposition
            )
        }

        let (exact, bestLookalike, bestScore) = matchIdentity(raw)

        let isCleanExact = exact != nil
            && !decomposition.hasConfusables
            && !decomposition.hasMixedScripts
            && !decomposition.hasInvisibleChars
            && !decomposition.hasBidirectionalOverride

        if isCleanExact, let exact {
            return AuthenticityVerdict(
                input: raw,
                verdict: .styled,
                severity: .low,
                label: "Styled Brand Mention",
                explanation: "Uses legitimate characters that match a protected identity.",
                recommendations: [],
                targetIdentity: exact,
                safeAlternatives: exact.domains.map { "https://\($0)" },
                reasons: ["Exact match for \(exact.name)"],
                decomposition: decomposition
            )
        }

        if bestScore >= threshold, let lookalike = bestLookalike {
            let spoofSignals = decomposition.hasConfusables
                || decomposition.hasMixedScripts
                || decomposition.hasInvisibleChars
                || decomposition.hasBidirectionalOverride

            if spoofSignals {
                return AuthenticityVerdict(
                    input: raw,
                    verdict: .homographSpoof,
                    severity: .high,
                    label: "Homograph Spoof",
                    explanation: "Visually mimics a trusted identity using confusable characters.",
                    recommendations: [
                        "Do not trust this input",
                        "Visit the official site directly",
                    ],
                    targetIdentity: lookalike.identity,
                    safeAlternatives: lookalike.identity.domains.map { "https://\($0)" },
                    reasons: ["Visually similar to \(lookalike.identity.name) with spoofing signals"],
                    decomposition: decomposition,
                    scores: ["similarity": lookalike.score]
                )
            }

            return AuthenticityVerdict(
                input: raw,
                verdict: .recognizedVariant,
                severity: .low,
                label: "Recognized Variant",
                explanation: "A known legitimate variant of a protected identity.",
                recommendations: [],
                targetIdentity: lookalike.identity,
                safeAlternatives: lookalike.identity.domains.map { "https://\($0)" },
                reasons: ["Recognized variant of \(lookalike.identity.name)"],
                decomposition: decomposition,
                scores: ["similarity": lookalike.score]
            )
        }

        if decomposition.hasMixedScripts {
            return AuthenticityVerdict(
                input: raw,
                verdict: .mixedScriptSpoof,
                severity: .high,
                label: "Mixed-Script Spoof",
                explanation: "Combines characters from multiple writing systems.",
                recommendations: ["Inspect every character carefully", "Verify the source"],
                targetIdentity: nil,
                safeAlternatives: [],
                reasons: ["Input mixes scripts from multiple writing systems"],
                decomposition: decomposition
            )
        }

        if decomposition.hasInvisibleChars || decomposition.hasBidirectionalOverride {
            return AuthenticityVerdict(
                input: raw,
                verdict: .unsafe,
                severity: .critical,
                label: "Unsafe",
                explanation: "Contains blocked patterns, invisible characters, or bidirectional overrides.",
                recommendations: ["Block or delete this input", "Report it to your security team"],
                targetIdentity: nil,
                safeAlternatives: [],
                reasons: ["Input contains invisible or bidirectional-override characters"],
                decomposition: decomposition
            )
        }

        if decomposition.hasConfusables {
            return AuthenticityVerdict(
                input: raw,
                verdict: .transliterationUncertain,
                severity: .medium,
                label: "Transliteration Uncertain",
                explanation: "Contains confusable characters but no known brand lookalike.",
                recommendations: ["Inspect every character carefully"],
                targetIdentity: nil,
                safeAlternatives: [],
                reasons: ["Input contains confusable characters but no known brand lookalike"],
                decomposition: decomposition
            )
        }

        return AuthenticityVerdict(
            input: raw,
            verdict: .unknown,
            severity: .none,
            label: "Unknown",
            explanation: "No protected identity or spoofing signals detected.",
            recommendations: [],
            targetIdentity: nil,
            safeAlternatives: [],
            reasons: ["No protected identity or spoofing signals detected"],
            decomposition: decomposition
        )
    }

    /// Classify a full URL, extracting the hostname for analysis.
    public func checkUrl(_ urlString: String) -> AuthenticityVerdict {
        guard let url = URL(string: urlString), let host = url.host else {
            return classify(urlString)
        }
        var result = classify(host)
        result.input = urlString
        result.reasons.insert("Analyzed host: \(host)", at: 0)
        return result
    }

    /// Evaluate a verdict against a policy to decide the final action.
    public func decideAction(_ verdict: AuthenticityVerdict, policy: Policy = Policy()) -> Action {
        if let allowlist = policy.allowlist, allowlist.contains(verdict.input) {
            return Action(action: .allow, reason: "allowlist", uiTheme: policy.uiTheme)
        }
        if let blocklist = policy.blocklist, blocklist.contains(verdict.input) {
            return Action(action: .block, reason: "blocklist", uiTheme: policy.uiTheme)
        }

        let severityAction = policy.severityActions[verdict.severity] ?? policy.defaultAction
        return Action(action: severityAction, reason: "severity", uiTheme: policy.uiTheme)
    }

    /// Validate an app-attestation token to help prevent SDK tampering.
    public func validateAttestation(_ token: Data) -> Bool {
        // Production implementations should verify the token with Apple’s
        // DeviceCheck or App Attest service. This stub accepts non-empty tokens.
        return !token.isEmpty
    }

    // MARK: - Internal helpers

    private func decompose(_ input: String) -> Decomposition {
        var chars: [CharAttestation] = []
        var scripts: Set<String> = []
        var hasConfusables = false
        var hasInvisibleChars = false
        var hasBidiOverride = false

        for scalar in input.unicodeScalars {
            let char = String(scalar)
            let script = scriptOf(scalar.value)
            scripts.insert(script)
            let isConfusable = confusables[char] != nil
            let isInvisible = invisibleCodePoints.contains(scalar.value)
            let isBidi = bidiCodePoints.contains(scalar.value)

            if isConfusable { hasConfusables = true }
            if isInvisible { hasInvisibleChars = true }
            if isBidi { hasBidiOverride = true }

            chars.append(CharAttestation(
                char: char,
                codePoint: scalar.value,
                script: script,
                confusableTarget: isConfusable ? confusables[char] : nil,
                isInvisible: isInvisible,
                isBidiOverride: isBidi
            ))
        }

        let meaningful = scripts.filter { $0 != "Other" }
        let hasMixedScripts = meaningful.count > 1
            || (meaningful.contains("Latin") && meaningful.contains { $0 != "Latin" })

        return Decomposition(
            chars: chars,
            scripts: Array(scripts),
            hasConfusables: hasConfusables,
            hasInvisibleChars: hasInvisibleChars,
            hasBidirectionalOverride: hasBidiOverride,
            hasMixedScripts: hasMixedScripts
        )
    }

    private func matchBlockedPattern(_ raw: String) -> (BrandIdentity?, String?) {
        let lower = raw.lowercased()
        for identity in brands {
            for pattern in identity.blockedPatterns {
                if lower.range(of: pattern, options: .regularExpression) != nil {
                    return (identity, pattern)
                }
            }
        }
        return (nil, nil)
    }

    private func matchIdentity(_ raw: String) -> (BrandIdentity?, Lookalike?, Double) {
        let lower = raw.lowercased()
        var exact: BrandIdentity?
        var bestLookalike: Lookalike?
        var bestScore: Double = 0

        for identity in brands {
            for alias in identity.aliases {
                if lower == alias.lowercased() {
                    exact = identity
                    break
                }
                let score = skeletonSimilarity(raw, alias)
                if score > bestScore {
                    bestScore = score
                    bestLookalike = Lookalike(identity: identity, alias: alias, score: score)
                }
            }
            if exact != nil { break }
        }

        return (exact, bestLookalike, bestScore)
    }

    private func skeletonSimilarity(_ a: String, _ b: String) -> Double {
        let sa = foldSkeleton(a)
        let sb = foldSkeleton(b)
        if sa == sb { return 1 }
        if sa.isEmpty || sb.isEmpty { return 0 }
        let longer = sa.count > sb.count ? sa : sb
        let shorter = sa.count > sb.count ? sb : sa
        var matches = 0
        for (i, char) in shorter.enumerated() {
            let idx = longer.index(longer.startIndex, offsetBy: i)
            if longer[idx] == char { matches += 1 }
        }
        return Double(matches) / Double(longer.count)
    }

    private func foldSkeleton(_ input: String) -> String {
        var folded = ""
        for scalar in input.unicodeScalars {
            let char = String(scalar)
            folded += confusables[char] ?? char
        }
        folded = folded
            .replacingOccurrences(of: "rn", with: "m")
            .replacingOccurrences(of: "vv", with: "w")
            .replacingOccurrences(of: "cl", with: "d")
            .replacingOccurrences(of: "nn", with: "m")
            .replacingOccurrences(of: "lI", with: "U")
        return folded.lowercased()
    }

    private func scriptOf(_ codePoint: UInt32) -> String {
        switch codePoint {
        case 0x41...0x5a, 0x61...0x7a, 0x00c0...0x024f:
            return "Latin"
        case 0x0400...0x04ff:
            return "Cyrillic"
        case 0x0370...0x03ff:
            return "Greek"
        case 0x0530...0x058f:
            return "Armenian"
        case 0x10a0...0x10ff:
            return "Georgian"
        case 0x0600...0x06ff:
            return "Arabic"
        case 0x0900...0x097f:
            return "Devanagari"
        case 0x4e00...0x9fff, 0x3040...0x309f, 0x30a0...0x30ff:
            return "CJK"
        default:
            return "Other"
        }
    }
}

// MARK: - Data models

public struct AuthenticityVerdict: Equatable, Sendable {
    public var input: String
    public var verdict: Verdict
    public var severity: Severity
    public var label: String
    public var explanation: String
    public var recommendations: [String]
    public var targetIdentity: BrandIdentity?
    public var safeAlternatives: [String]
    public var reasons: [String]
    public var decomposition: Decomposition?
    public var scores: [String: Double]
}

public enum Verdict: String, Sendable {
    case canonical
    case styled
    case recognizedVariant = "recognized-variant"
    case transliterationUncertain = "transliteration-uncertain"
    case lookalikeDomain = "lookalike-domain"
    case homographSpoof = "homograph-spoof"
    case mixedScriptSpoof = "mixed-script-spoof"
    case unsafe
    case unknown
}

public enum Severity: String, Sendable {
    case none
    case low
    case medium
    case high
    case critical
}

public enum ActionType: String, Sendable {
    case allow
    case warn
    case log
    case block
}

public struct Action: Equatable, Sendable {
    public let action: ActionType
    public let reason: String
    public let uiTheme: String
}

public struct Policy: Equatable, Sendable {
    public var defaultAction: ActionType
    public var severityActions: [Severity: ActionType]
    public var allowlist: [String]?
    public var blocklist: [String]?
    public var uiTheme: String

    public init(
        defaultAction: ActionType = .warn,
        severityActions: [Severity: ActionType] = [:],
        allowlist: [String]? = nil,
        blocklist: [String]? = nil,
        uiTheme: String = "inline"
    ) {
        self.defaultAction = defaultAction
        self.severityActions = severityActions
        self.allowlist = allowlist
        self.blocklist = blocklist
        self.uiTheme = uiTheme
    }
}

public struct BrandIdentity: Equatable, Sendable {
    public let id: String
    public let name: String
    public let aliases: [String]
    public let domains: [String]
    public let blockedPatterns: [String]
}

public struct CharAttestation: Equatable, Sendable {
    public let char: String
    public let codePoint: UInt32
    public let script: String
    public let confusableTarget: String?
    public let isInvisible: Bool
    public let isBidiOverride: Bool
}

public struct Decomposition: Equatable, Sendable {
    public let chars: [CharAttestation]
    public let scripts: [String]
    public let hasConfusables: Bool
    public let hasInvisibleChars: Bool
    public let hasBidirectionalOverride: Bool
    public let hasMixedScripts: Bool
}

public struct Lookalike: Equatable, Sendable {
    public let identity: BrandIdentity
    public let alias: String
    public let score: Double
}

// MARK: - Seed data

private enum BrandSeed {
    static let pack: [BrandIdentity] = [
        BrandIdentity(
            id: "apple",
            name: "Apple",
            aliases: ["apple", "apple.com", "www.apple.com"],
            domains: ["apple.com", "www.apple.com"],
            blockedPatterns: ["fake-apple", "evil-apple"]
        ),
        BrandIdentity(
            id: "hermes-brand",
            name: "Hermès",
            aliases: ["hermès", "hermes", "hermes.com"],
            domains: ["hermes.com"],
            blockedPatterns: ["fake-hermes"]
        ),
        BrandIdentity(
            id: "nike",
            name: "Nike",
            aliases: ["nike", "nike.com"],
            domains: ["nike.com"],
            blockedPatterns: ["fake-nike"]
        ),
        BrandIdentity(
            id: "google",
            name: "Google",
            aliases: ["google", "google.com"],
            domains: ["google.com"],
            blockedPatterns: ["fake-google"]
        ),
    ]
}

private enum ConfusableSeed {
    static let map: [String: String] = [
        "\u{0430}": "a",
        "\u{0435}": "e",
        "\u{043E}": "o",
        "\u{0440}": "p",
        "\u{0441}": "c",
        "\u{0445}": "x",
        "\u{0456}": "i",
        "\u{0458}": "j",
        "\u{0432}": "b",
        "\u{043C}": "m",
        "\u{043D}": "n",
        "\u{0442}": "t",
        "\u{03B1}": "a",
        "\u{03B5}": "e",
        "\u{03BF}": "o",
        "\u{03C1}": "p",
        "\u{0585}": "o",
    ]
}

private enum InvisibleSeed {
    static let codePoints: Set<UInt32> = [
        0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
        0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
        0x2066, 0x2067, 0x2068, 0x2069,
        0x180e, 0x200e, 0x200f, 0x061c, 0x00ad,
    ]
}

private enum BidiSeed {
    static let codePoints: Set<UInt32> = [
        0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
        0x2066, 0x2067, 0x2068, 0x2069,
        0x200e, 0x200f, 0x061c,
    ]
}
