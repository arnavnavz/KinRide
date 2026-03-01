import Foundation
import Security

/// Manages session sharing between the main app and SiriKit extension via Keychain + App Groups.
final class SessionManager {
    static let shared = SessionManager()

    private let serviceName = "com.kayu.app"
    private let cookieKey = "session-cookie"
    private let suiteName = "group.com.kayu.app"

    private init() {}

    /// Save session cookie from WKWebView for use by Siri extension
    func saveSessionCookie(_ cookie: String) {
        let data = cookie.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: cookieKey,
        ]
        SecItemDelete(query as CFDictionary)

        var newQuery = query
        newQuery[kSecValueData as String] = data
        newQuery[kSecAttrAccessGroup as String] = suiteName
        SecItemAdd(newQuery as CFDictionary, nil)
    }

    /// Retrieve session cookie (used by Siri extension)
    func getSessionCookie() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: cookieKey,
            kSecReturnData as String: true,
            kSecAttrAccessGroup as String: suiteName,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Save base URL for use by extensions
    func saveBaseURL(_ url: String) {
        UserDefaults(suiteName: suiteName)?.set(url, forKey: "baseURL")
    }

    /// Get base URL from shared container
    func getBaseURL() -> String {
        return UserDefaults(suiteName: suiteName)?.string(forKey: "baseURL") ?? "https://app.kayu.com"
    }
}
