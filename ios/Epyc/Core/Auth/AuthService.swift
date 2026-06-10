import Foundation
import AuthenticationServices
import CryptoKit
import UIKit
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

/// The minimal user identity the app needs (ports `AuthUserInfo` from auth.ts).
public struct AuthUserInfo: Equatable, Sendable {
    public let uid: String
    public let displayName: String
    public let photoURL: String?
}

/// Firebase Auth with Sign in with Apple + Google (Facebook removed). Observable so
/// `RootView` can gate between Login and the main app.
@MainActor
final class AuthService: ObservableObject {
    @Published private(set) var user: AuthUserInfo?

    private var handle: AuthStateDidChangeListenerHandle?
    private var currentNonce: String?

    var isSignedIn: Bool { user != nil }

    init() {
        handle = Auth.auth().addStateDidChangeListener { [weak self] _, fbUser in
            self?.user = fbUser.map { Self.map($0) }
        }
    }

    deinit { if let handle { Auth.auth().removeStateDidChangeListener(handle) } }

    private static func map(_ u: FirebaseAuth.User) -> AuthUserInfo {
        AuthUserInfo(uid: u.uid,
                     displayName: u.displayName ?? u.providerData.first?.displayName ?? "Player",
                     photoURL: (u.photoURL ?? u.providerData.first?.photoURL)?.absoluteString)
    }

    // MARK: Google

    func signInWithGoogle(presenting: UIViewController) async throws {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            throw AuthError.missingClientID
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenting)
        guard let idToken = result.user.idToken?.tokenString else { throw AuthError.missingToken }
        let credential = GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: result.user.accessToken.tokenString)
        _ = try await Auth.auth().signIn(with: credential)
    }

    // MARK: Apple

    /// Configure the ASAuthorization request with a hashed nonce.
    func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = Self.randomNonceString()
        currentNonce = nonce
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)
    }

    func handleAppleCompletion(_ result: Result<ASAuthorization, Error>) async throws {
        switch result {
        case .failure(let error):
            throw error
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let nonce = currentNonce,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8) else {
                throw AuthError.missingToken
            }
            let firebaseCredential = OAuthProvider.appleCredential(
                withIDToken: idToken,
                rawNonce: nonce,
                fullName: credential.fullName)
            let authResult = try await Auth.auth().signIn(with: firebaseCredential)
            // Apple only returns the name on first authorization; persist it if present.
            if let given = credential.fullName?.givenName {
                let change = authResult.user.createProfileChangeRequest()
                change.displayName = [given, credential.fullName?.familyName].compactMap { $0 }.joined(separator: " ")
                try? await change.commitChanges()
            }
        }
    }

    // MARK: Sign out

    func signOut() throws {
        GIDSignIn.sharedInstance.signOut()
        try Auth.auth().signOut()
    }

    // MARK: Nonce helpers

    private static func randomNonceString(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            let randoms: [UInt8] = (0..<16).map { _ in
                var byte: UInt8 = 0
                _ = SecRandomCopyBytes(kSecRandomDefault, 1, &byte)
                return byte
            }
            for random in randoms where remaining > 0 {
                if random < charset.count { result.append(charset[Int(random)]); remaining -= 1 }
            }
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    enum AuthError: Error { case missingClientID, missingToken }
}
