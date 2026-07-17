# Native integration samples — PuniCodex Authenticity Shield V2

These pseudocode samples show how to call the Authenticity API from native app shells. They are intended as starting points for platform-specific integrations.

## Shared API contract

```http
GET https://punicodex.com/api/v2/authenticity/check?input={input}&type={type}
Authorization: Bearer {apiKey}
```

Response shape:

```json
{
  "success": true,
  "data": {
    "input": "аpple.com",
    "verdict": "homograph-spoof",
    "severity": "high",
    "label": "Homograph Spoof",
    "explanation": "...",
    "targetIdentity": { "name": "Apple" },
    "safeAlternatives": ["https://www.apple.com"]
  }
}
```

## iOS — WKWebView navigation delegate

```swift
class AuthenticityWebViewController: UIViewController, WKNavigationDelegate {
    var webView: WKWebView!
    let apiBase = "https://punicodex.com/api/v2"
    let apiKey = "..."

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        checkAuthenticity(url.absoluteString) { [weak self] verdict in
            guard let self = self else {
                decisionHandler(.allow)
                return
            }

            if verdict.severity == "critical" {
                let interstitial = URL(string: "https://punicodex.com/interstitial.html")!
                    .appending(queryItems: [
                        URLQueryItem(name: "url", value: url.absoluteString),
                        URLQueryItem(name: "verdict", value: verdict.verdict),
                        URLQueryItem(name: "severity", value: verdict.severity),
                        URLQueryItem(name: "reason", value: verdict.explanation),
                    ])
                self.webView.load(URLRequest(url: interstitial))
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }

    func checkAuthenticity(_ input: String, completion: @escaping (Verdict) -> Void) {
        var components = URLComponents(string: "\(apiBase)/authenticity/check")!
        components.queryItems = [
            URLQueryItem(name: "input", value: input),
            URLQueryItem(name: "type", value: "url"),
        ]
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, _, _ in
            // Parse JSON, map to Verdict model, call completion on main queue.
        }.resume()
    }
}
```

## Android — Custom Tabs

```kotlin
class AuthenticityTabsHelper(private val activity: Activity) {
    private val apiBase = "https://punicodex.com/api/v2"

    suspend fun launchIfSafe(url: String) {
        val verdict = checkAuthenticity(url)
        if (verdict.severity == "critical" || verdict.severity == "high") {
            val interstitial = Uri.parse("https://punicodex.com/interstitial.html").buildUpon()
                .appendQueryParameter("url", url)
                .appendQueryParameter("verdict", verdict.verdict)
                .appendQueryParameter("severity", verdict.severity)
                .appendQueryParameter("reason", verdict.explanation)
                .build()
            CustomTabsIntent.Builder().build().launchUrl(activity, interstitial)
        } else {
            CustomTabsIntent.Builder().build().launchUrl(activity, Uri.parse(url))
        }
    }

    private suspend fun checkAuthenticity(input: String): Verdict {
        val client = HttpClient(Android)
        return client.get("$apiBase/authenticity/check") {
            parameter("input", input)
            parameter("type", "url")
            header("Authorization", "Bearer ...")
        }.body()
    }
}
```

## macOS — NetworkExtension

For per-app or system-wide filtering, implement an `NEPacketTunnelProvider` or `NEFilterDataProvider` and forward hostname decisions to the Authenticity API:

```swift
class AuthenticityFilterProvider: NEFilterDataProvider {
    let apiBase = "https://punicodex.com/api/v2"

    override func handleNewFlow(_ flow: NEFilterFlow) -> NEFilterNewFlowVerdict {
        guard let hostname = flow.url?.host else { return .allow() }

        let verdict = syncCheckAuthenticity(hostname)
        if verdict.severity == "critical" {
            return .drop()
        }
        if verdict.severity == "high" {
            // Notify user, then allow or drop based on policy.
            notifyUser(verdict)
            return .allow()
        }
        return .allow()
    }

    func syncCheckAuthenticity(_ input: String) -> Verdict {
        // Dispatch to an async Authenticity API call and block briefly,
        // or maintain a local cache updated in the background.
    }
}
```

## Windows — WebView2

```csharp
public partial class AuthenticityWebWindow : Window
{
    private readonly WebView2 _webView = new();
    private const string ApiBase = "https://punicodex.com/api/v2";

    public AuthenticityWebWindow()
    {
        InitializeComponent();
        _webView.CoreWebView2InitializationCompleted += (s, e) =>
        {
            _webView.CoreWebView2.NavigationStarting += async (sender, args) =>
            {
                var verdict = await CheckAuthenticityAsync(args.Uri);
                if (verdict.Severity is "critical" or "high")
                {
                    args.Cancel = true;
                    var interstitial = $"https://punicodex.com/interstitial.html?" +
                        $"url={Uri.EscapeDataString(args.Uri)}" +
                        $"&verdict={Uri.EscapeDataString(verdict.Verdict)}" +
                        $"&severity={Uri.EscapeDataString(verdict.Severity)}" +
                        $"&reason={Uri.EscapeDataString(verdict.Explanation)}";
                    _webView.Source = new Uri(interstitial);
                }
            };
        };
    }

    private async Task<Verdict> CheckAuthenticityAsync(string input)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "...");
        var url = $"{ApiBase}/authenticity/check?input={Uri.EscapeDataString(input)}&type=url";
        var json = await client.GetStringAsync(url);
        // Deserialize and return Verdict.
    }
}
```

## Notes

- Cache verdicts for at least 5 minutes per URL to reduce API load and improve responsiveness.
- For offline operation, embed the `@punicodex/authenticity-sdk` offline classifier in the app’s JavaScript bridge or port the pure-JS logic to the native language.
- Always show the user the original target URL and the reason for the block.
- Provide a clear “Proceed at your own risk” path unless enterprise policy forbids it.
