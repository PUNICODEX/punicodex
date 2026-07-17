// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PunicodexAuthenticator",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .watchOS(.v8),
        .tvOS(.v15),
        .macCatalyst(.v15),
    ],
    products: [
        .library(
            name: "PunicodexAuthenticator",
            targets: ["PunicodexAuthenticator"]
        ),
    ],
    targets: [
        .target(
            name: "PunicodexAuthenticator",
            path: ".",
            exclude: ["Package.swift", "README.md", "Tests"],
            sources: ["PunicodexAuthenticator.swift"]
        ),
        .testTarget(
            name: "PunicodexAuthenticatorTests",
            dependencies: ["PunicodexAuthenticator"],
            path: "Tests"
        ),
    ]
)
