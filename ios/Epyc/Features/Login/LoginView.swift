import SwiftUI
import UIKit
import AuthenticationServices
import EpycCore

/// Returns the current top-most view controller, used as the presenting controller
/// for Google Sign-In.
@MainActor func topViewController() -> UIViewController {
    let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
    return scene?.keyWindow?.rootViewController ?? UIViewController()
}

/// Sign-in screen offering Sign in with Apple and Google. On success the auth state
/// listener updates `AuthService.user` and RootView swaps to the main app.
struct LoginView: View {
    @EnvironmentObject private var auth: AuthService
    @StateObject private var viewModel = LoginViewModel()

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            Text("EPYC")
                .font(.system(size: 56, weight: .heavy, design: .rounded))

            Spacer()

            VStack(spacing: 16) {
                SignInWithAppleButton(.signIn) { request in
                    viewModel.prepareAppleRequest(auth: auth, request)
                } onCompletion: { result in
                    viewModel.handleAppleCompletion(auth: auth, result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 48)

                Button {
                    viewModel.signInWithGoogle(auth: auth, presenting: topViewController())
                } label: {
                    Text("Continue with Google")
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 24)

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Spacer()
        }
        .padding()
    }
}
