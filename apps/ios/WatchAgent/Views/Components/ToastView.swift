import SwiftUI

struct ToastView: View {
    let message: String
    let isSuccess: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: isSuccess ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                .foregroundStyle(isSuccess ? Theme.success : Theme.destructive)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(radius: 4)
    }
}

struct ToastModifier: ViewModifier {
    @Binding var isPresented: Bool
    let message: String
    let isSuccess: Bool

    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if isPresented {
                ToastView(message: message, isSuccess: isSuccess)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                            withAnimation { isPresented = false }
                        }
                    }
            }
        }
        .animation(.spring(duration: 0.3), value: isPresented)
    }
}

extension View {
    func toast(isPresented: Binding<Bool>, message: String, isSuccess: Bool = true) -> some View {
        modifier(ToastModifier(isPresented: isPresented, message: message, isSuccess: isSuccess))
    }
}
