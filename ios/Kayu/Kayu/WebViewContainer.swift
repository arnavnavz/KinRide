import SwiftUI
import WebKit
import Intents

struct WebViewContainer: UIViewRepresentable {
    var initialPath: String?

    private static let baseURL: String = {
        if let url = Bundle.main.object(forInfoDictionaryKey: "KAYU_BASE_URL") as? String, !url.isEmpty {
            return url
        }
        return "https://app.kayu.com"
    }()

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        let userContentController = WKUserContentController()
        userContentController.add(context.coordinator, name: "kayuBridge")
        config.userContentController = userContentController

        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        context.coordinator.webView = webView

        let path = initialPath ?? "/rider/request"
        if let url = URL(string: Self.baseURL + path) {
            webView.load(URLRequest(url: url))
        }

        injectLocationBridge(webView: webView)

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let path = initialPath, context.coordinator.lastPath != path {
            context.coordinator.lastPath = path
            let js = "window.location.href = '\(path)';"
            webView.evaluateJavaScript(js)
        }
    }

    private func injectLocationBridge(webView: WKWebView) {
        let js = """
        (function() {
            if (window.__kayuLocationInjected) return;
            window.__kayuLocationInjected = true;
            window.webkit.messageHandlers.kayuBridge.postMessage({type: 'ready'});
        })();
        """
        let script = WKUserScript(source: js, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        webView.configuration.userContentController.addUserScript(script)
    }

    class Coordinator: NSObject, WKScriptMessageHandler {
        weak var webView: WKWebView?
        var lastPath: String?

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard let body = message.body as? [String: Any],
                  let type = body["type"] as? String else { return }

            switch type {
            case "ready":
                print("[Kayu] WebView bridge ready")
                extractAndSaveSession()
            case "addToSiri":
                donateRideShortcut()
            default:
                break
            }
        }

        private func extractAndSaveSession() {
            webView?.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
                let sessionCookies = cookies.filter { $0.name.contains("session") || $0.name.contains("next-auth") }
                let cookieString = sessionCookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
                if !cookieString.isEmpty {
                    SessionManager.shared.saveSessionCookie(cookieString)
                }
            }
        }

        private func donateRideShortcut() {
            let intent = INRequestRideIntent(
                pickupLocation: nil,
                dropOffLocation: nil,
                rideOptionName: nil,
                partySize: nil,
                paymentMethod: nil,
                scheduledPickupTime: nil
            )
            intent.suggestedInvocationPhrase = "Book me a Kayu ride"

            let interaction = INInteraction(intent: intent, response: nil)
            interaction.donate { error in
                if let error = error {
                    print("[Kayu] Shortcut donation error: \(error.localizedDescription)")
                } else {
                    print("[Kayu] Shortcut donated successfully")
                }
            }

            INVoiceShortcutCenter.shared.setShortcutSuggestions([
                INShortcut(intent: intent)!
            ])
        }
    }
}
