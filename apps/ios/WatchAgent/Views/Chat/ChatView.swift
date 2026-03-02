import SwiftUI

struct ChatView: View {
    @State private var viewModel = ChatViewModel()

    private let searchColumns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView()
                } else {
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

                                    // Search results inline
                                    if let results = viewModel.searchResults, !results.isEmpty {
                                        searchResultsSection(results)
                                    }

                                    Color.clear
                                        .frame(height: 1)
                                        .id("bottom")
                                }
                                .padding(16)
                            }
                            .defaultScrollAnchor(.bottom)
                            .onChange(of: viewModel.chatMessages.count) {
                                withAnimation {
                                    proxy.scrollTo("bottom")
                                }
                            }
                        }

                        ChatBarView(
                            text: $viewModel.chatInput,
                            placeholder: viewModel.onboardingCompleted
                                ? "Search, get recommendations, or just chat..."
                                : "Tell me about your favorite movies or shows...",
                            isLoading: viewModel.isSendingMessage
                        ) {
                            let text = viewModel.chatInput
                            Task { await viewModel.sendMessage(text) }
                        }
                    }
                }
            }
            .navigationTitle("Chat")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .background(Theme.background)
            .navigationDestination(for: ContentDestination.self) { dest in
                ContentDetailView(tmdbId: dest.tmdbId, contentType: dest.type)
            }
        }
        .task {
            await viewModel.loadData()
        }
    }

    @ViewBuilder
    private func searchResultsSection(_ results: [ContentCard]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Results")
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                Spacer()
                Button("Clear") { viewModel.clearSearchResults() }
                    .font(.caption)
                    .foregroundStyle(Theme.primary)
            }

            LazyVGrid(columns: searchColumns, spacing: 12) {
                ForEach(results) { card in
                    NavigationLink(value: ContentDestination(
                        tmdbId: card.tmdbId,
                        type: card.type,
                        title: card.title
                    )) {
                        ContentCardView(content: card)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.top, 8)
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
