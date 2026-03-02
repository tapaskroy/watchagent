import SwiftUI

enum Theme {
    static let primary = Color(hex: 0xE81F24)
    static let background = Color(hex: 0x121212)
    static let cardBackground = Color(hex: 0x1F1F1F)
    static let surfaceBackground = Color(hex: 0x2A2A2A)
    static let textPrimary = Color.white
    static let textSecondary = Color.gray
    static let textMuted = Color(white: 0.5)
    static let divider = Color(white: 0.2)
    static let success = Color.green
    static let warning = Color.orange
    static let destructive = Color.red
}

enum AppConstants {
    static let appName = "WatchAgent"
    static let appVersion = "1.0.0"
    static let keychainServiceName = "me.tapaskroy.watchagent"
    static let accessTokenKey = "accessToken"
    static let refreshTokenKey = "refreshToken"
}
