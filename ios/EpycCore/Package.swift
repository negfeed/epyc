// swift-tools-version: 5.9
import PackageDescription

// EpycCore — pure, dependency-free domain logic shared by the EPYC iOS app.
// No Firebase / UIKit / SwiftUI imports, so it builds and tests on plain Swift
// (CI, `swift test`) and stays provably in parity with the legacy TS logic via
// golden vectors in <repo>/tools/golden.
let package = Package(
    name: "EpycCore",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "EpycCore", targets: ["EpycCore"])
    ],
    targets: [
        .target(name: "EpycCore"),
        .testTarget(name: "EpycCoreTests", dependencies: ["EpycCore"])
    ]
)
