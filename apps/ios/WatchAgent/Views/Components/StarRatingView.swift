import SwiftUI

struct StarRatingView: View {
    @Binding var rating: Double
    let maxRating: Int
    var starSize: CGFloat = 28
    var interactive: Bool = true

    var body: some View {
        HStack(spacing: 4) {
            ForEach(1...maxRating, id: \.self) { index in
                Image(systemName: starImage(for: index))
                    .font(.system(size: starSize))
                    .foregroundStyle(index <= Int(rating.rounded()) ? .yellow : Theme.textMuted)
                    .onTapGesture {
                        if interactive {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                rating = Double(index)
                            }
                        }
                    }
            }
        }
    }

    private func starImage(for index: Int) -> String {
        let value = rating
        if Double(index) <= value {
            return "star.fill"
        } else if Double(index) - 0.5 <= value {
            return "star.leadinghalf.filled"
        } else {
            return "star"
        }
    }
}

struct ReadOnlyStarRating: View {
    let rating: Double
    let maxRating: Int
    var starSize: CGFloat = 12

    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...maxRating, id: \.self) { index in
                Image(systemName: index <= Int(rating.rounded()) ? "star.fill" : "star")
                    .font(.system(size: starSize))
                    .foregroundStyle(index <= Int(rating.rounded()) ? .yellow : Theme.textMuted)
            }
        }
    }
}
