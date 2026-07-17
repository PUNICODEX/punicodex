import WatchKit

/// Lightweight watchOS classifier for Apple Watch notifications.
///
/// Uses the same offline model as the iOS SDK but keeps the binary small and
/// avoids UIKit dependencies so it runs comfortably on watchOS 8+.
final class PunicodexWatchClassifier {

    private let authenticator = PunicodexAuthenticator()

    /// Classify a URL or domain received in a notification.
    func classifyNotification(_ input: String) -> (safe: Bool, message: String) {
        let result = authenticator.classify(input)
        switch result.severity {
        case .critical, .high:
            return (false, "⚠️ \(result.label): may spoof \(result.targetIdentity?.name ?? "a trusted site")")
        case .medium:
            return (true, "⚡ \(result.label): review carefully")
        default:
            return (true, "✅ \(result.label): looks safe")
        }
    }
}
