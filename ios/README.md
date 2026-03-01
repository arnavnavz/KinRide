# Kayu iOS App

A thin native iOS shell app that wraps the Kayu PWA in a WKWebView with SiriKit integration for voice-activated ride booking.

## Architecture

```
Siri: "Book me a Kayu ride" 
  → KayuIntents (SiriKit Extension) 
    → POST /api/rides/request
    → Ride booked

App Launch:
  → WKWebView loads PWA at /rider/request
  → JS bridge communicates with Swift
  → Session cookies shared via Keychain + App Groups
```

## Project Structure

```
ios/Kayu/
├── Kayu.xcodeproj/          # Xcode project file
├── Kayu/                    # Main app target
│   ├── KayuApp.swift        # SwiftUI app entry point
│   ├── ContentView.swift    # Root view with deep link handling
│   ├── WebViewContainer.swift # WKWebView + JS bridge + Siri donation
│   ├── SessionManager.swift # Keychain/App Groups session sharing
│   ├── Info.plist           # App config, permissions
│   ├── Kayu.entitlements    # Siri, App Groups, Keychain
│   └── Assets.xcassets/     # App icon and assets
└── KayuIntents/             # SiriKit Intent Extension
    ├── IntentHandler.swift  # Handles ride booking intents
    ├── SessionManager.swift # Shared session manager
    ├── Info.plist           # Supported intents declaration
    └── KayuIntents.entitlements
```

## Supported Siri Commands

- **"Book me a Kayu ride to [destination]"** — Books a ride via `INRequestRideIntent`
- **"What's the status of my Kayu ride?"** — Gets ride status via `INGetRideStatusIntent`
- **"Cancel my Kayu ride"** — Cancels active ride via `INCancelRideIntent`

## Setup

1. Open `ios/Kayu/Kayu.xcodeproj` in Xcode
2. Set your development team in Signing & Capabilities
3. Update `KAYU_BASE_URL` in `Info.plist` to your server URL
4. Add the `KAYU_API_KEY` to your server `.env` file
5. Enable the Siri capability in your Apple Developer account
6. Build and run on a physical device (Siri requires a real device)

## URL Scheme

The app registers the `kayu://` URL scheme for deep linking:
- `kayu://rider/ai?q=ride+to+mcdonalds` — Opens AI chat with pre-filled query

## Session Sharing

The main app extracts NextAuth session cookies from the WKWebView and stores them in the Keychain (shared via App Groups). The SiriKit extension reads these cookies to authenticate API calls.
