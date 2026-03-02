import SwiftUI

extension View {
    func cardStyle() -> some View {
        self
            .padding(16)
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    func shimmer(isActive: Bool) -> some View {
        if isActive {
            self.redacted(reason: .placeholder)
        } else {
            self
        }
    }
}
