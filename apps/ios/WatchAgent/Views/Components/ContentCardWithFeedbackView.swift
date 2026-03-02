import SwiftUI

struct ContentCardWithFeedbackView: View {
    let recommendation: Recommendation
    let onFeedback: (FeedbackAction) async -> Void

    @State private var showActions = false
    @State private var isProcessing = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ContentCardView(content: recommendation.content)
                .onLongPressGesture {
                    showActions = true
                }

            if let reason = recommendation.reason {
                Text(reason)
                    .font(.caption2)
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(2)
            }
        }
        .opacity(isProcessing ? 0.5 : 1)
        .confirmationDialog("Feedback", isPresented: $showActions, titleVisibility: .visible) {
            Button("Not Relevant") {
                handleFeedback(.notRelevant)
            }
            Button("Keep") {
                handleFeedback(.keep)
            }
            Button("Add to Watchlist") {
                handleFeedback(.watchlist)
            }
            Button("Already Watched") {
                handleFeedback(.watched)
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func handleFeedback(_ action: FeedbackAction) {
        isProcessing = true
        Task {
            await onFeedback(action)
            isProcessing = false
        }
    }
}
