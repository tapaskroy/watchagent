import SwiftUI

struct PosterGridView<Item: Identifiable>: View {
    let items: [Item]
    let columns: Int
    let destination: (Item) -> ContentDestination?
    let cardContent: (Item) -> ContentCardView

    private var gridColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 12), count: columns)
    }

    var body: some View {
        LazyVGrid(columns: gridColumns, spacing: 16) {
            ForEach(items) { item in
                if let dest = destination(item) {
                    NavigationLink(value: dest) {
                        cardContent(item)
                    }
                    .buttonStyle(.plain)
                } else {
                    cardContent(item)
                }
            }
        }
    }
}
