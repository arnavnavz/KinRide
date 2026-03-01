import SwiftUI

struct ContentView: View {
    @State private var initialPath: String? = nil

    var body: some View {
        WebViewContainer(initialPath: initialPath)
            .ignoresSafeArea()
            .onOpenURL { url in
                if url.scheme == "kayu", let path = url.host {
                    initialPath = "/" + path + (url.path.isEmpty ? "" : url.path)
                    if let query = url.query {
                        initialPath! += "?" + query
                    }
                }
            }
    }
}
