import Foundation

extension String {
    var isValidEmail: Bool {
        let regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        return self.wholeMatch(of: regex) != nil
    }

    var isValidPassword: Bool {
        count >= 8
        && contains(where: \.isUppercase)
        && contains(where: \.isLowercase)
        && contains(where: \.isNumber)
    }

    var isValidUsername: Bool {
        let regex = /^[A-Za-z0-9_]{3,50}$/
        return self.wholeMatch(of: regex) != nil
    }
}
