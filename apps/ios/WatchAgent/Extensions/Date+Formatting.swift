import Foundation

extension String {
    /// Extracts year from "YYYY-MM-DD" date string
    var yearString: String? {
        let prefix = self.prefix(4)
        return prefix.count == 4 ? String(prefix) : nil
    }

    /// Formats ISO 8601 date string to a readable format
    func formattedDate(style: DateFormatter.Style = .medium) -> String? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = iso.date(from: self) else {
            let isoBasic = ISO8601DateFormatter()
            isoBasic.formatOptions = [.withInternetDateTime]
            guard let date = isoBasic.date(from: self) else { return nil }
            return DateFormatter.localizedString(from: date, dateStyle: style, timeStyle: .none)
        }
        return DateFormatter.localizedString(from: date, dateStyle: style, timeStyle: .none)
    }

    /// Returns relative time (e.g. "2 days ago")
    func relativeTime() -> String? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = iso.date(from: self) else { return nil }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
