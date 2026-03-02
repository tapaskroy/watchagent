import SwiftUI

struct ChatBubbleView: View {
    let message: String
    let isUser: Bool

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 48) }

            VStack(alignment: isUser ? .trailing : .leading) {
                Text(message)
                    .font(.body)
                    .foregroundStyle(isUser ? .white : Theme.textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(isUser ? Theme.primary : Theme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            if !isUser { Spacer(minLength: 48) }
        }
    }
}
