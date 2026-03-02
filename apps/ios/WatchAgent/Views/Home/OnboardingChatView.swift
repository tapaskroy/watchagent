import SwiftUI

struct OnboardingChatView: View {
    @Bindable var viewModel: HomeViewModel

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.chatMessages) { message in
                            ChatBubbleView(
                                message: message.content,
                                isUser: message.role == .user
                            )
                            .id(message.id)
                        }

                        if viewModel.isSendingMessage {
                            HStack {
                                TypingIndicator()
                                Spacer()
                            }
                        }
                    }
                    .padding(16)
                }
                .onChange(of: viewModel.chatMessages.count) {
                    if let last = viewModel.chatMessages.last {
                        withAnimation {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            ChatBarView(
                text: $viewModel.chatInput,
                isLoading: viewModel.isSendingMessage
            ) {
                let text = viewModel.chatInput
                Task { await viewModel.sendMessage(text) }
            }
        }
    }
}

private struct TypingIndicator: View {
    @State private var dotCount = 0
    let timer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Theme.textMuted)
                    .frame(width: 8, height: 8)
                    .opacity(index <= dotCount ? 1 : 0.3)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onReceive(timer) { _ in
            dotCount = (dotCount + 1) % 3
        }
    }
}
