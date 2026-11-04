import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        // 1. Configure Native macOS Dark Workstation Window
        let screenSize = NSScreen.main?.visibleFrame.size ?? CGSize(width: 1440, height: 900)
        let initialWidth = min(1440, screenSize.width * 0.95)
        let initialHeight = min(920, screenSize.height * 0.95)
        let rect = NSRect(x: (screenSize.width - initialWidth) / 2,
                          y: (screenSize.height - initialHeight) / 2,
                          width: initialWidth,
                          height: initialHeight)

        let styleMask: NSWindow.StyleMask = [
            .titled,
            .closable,
            .miniaturizable,
            .resizable,
            .fullSizeContentView
        ]

        window = NSWindow(contentRect: rect, styleMask: styleMask, backing: .buffered, defer: false)
        window.title = "Autonomous Studio Pro"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.isMovableByWindowBackground = true
        window.backgroundColor = NSColor(red: 0.04, green: 0.05, blue: 0.07, alpha: 1.0)
        window.minSize = NSSize(width: 1080, height: 680)

        // 2. High-Performance WebKit Configuration (Metal Hardware Acceleration)
        let config = WKWebViewConfiguration()
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        // Dev-only toggles: off by default in production to avoid exposing
        // the Web Inspector and cross-origin file:// access to untrusted content.
        let isDevMode = ProcessInfo.processInfo.environment["AUTONOMOUS_STUDIO_DEV"] == "1"
        if isDevMode {
            config.preferences.setValue(true, forKey: "developerExtrasEnabled")
            config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        }

        webView = WKWebView(frame: rect, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")

        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // 3. Load App
        loadWorkspace()
    }

    func loadWorkspace() {
        // Priority 1: Check in App Bundle Resources
        if let bundleDist = Bundle.main.url(forResource: "dist/index", withExtension: "html") {
            let accessDir = bundleDist.deletingLastPathComponent()
            webView.loadFileURL(bundleDist, allowingReadAccessTo: accessDir)
            return
        }

        // Priority 2: Check workspace directory relative to app
        let appDir = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent()
        let workspaceHtml = appDir.appendingPathComponent("apps/desktop/dist/index.html")
        if FileManager.default.fileExists(atPath: workspaceHtml.path) {
            let accessDir = workspaceHtml.deletingLastPathComponent()
            webView.loadFileURL(workspaceHtml, allowingReadAccessTo: accessDir)
            return
        }

        // Fallback: Local dev server
        if let devUrl = URL(string: "http://localhost:5173") {
            webView.load(URLRequest(url: devUrl))
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("Navigation failed: \(error.localizedDescription)")
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

// Entrypoint
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()

