import Foundation
import SwiftUI
import AuthenticationServices
import EpycCore

/// View model for the Login screen. The actual sign-in work lives on `AuthService`
/// (injected into the view); this VM only mediates the calls and surfaces any error
/// for display. RootView swaps away from Login automatically once `auth.user` is set.
@MainActor
final class LoginViewModel: ObservableObject {
    @Published var errorMessage: String?

    func signInWithGoogle(auth: AuthService, presenting: UIViewController) {
        Task { [weak self] in
            do {
                try await auth.signInWithGoogle(presenting: presenting)
            } catch {
                let ns = error as NSError
                NSLog("EPYC_SIGNIN_ERROR domain=\(ns.domain) code=\(ns.code) desc=\(ns.localizedDescription) info=\(ns.userInfo)")
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    func prepareAppleRequest(auth: AuthService, _ request: ASAuthorizationAppleIDRequest) {
        auth.prepareAppleRequest(request)
    }

    func handleAppleCompletion(auth: AuthService, _ result: Result<ASAuthorization, Error>) {
        Task { [weak self] in
            do {
                try await auth.handleAppleCompletion(result)
            } catch {
                self?.errorMessage = error.localizedDescription
            }
        }
    }
}
