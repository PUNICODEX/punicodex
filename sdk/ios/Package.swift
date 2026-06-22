// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PunycodexAuthenticator",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .watchOS(.v8),
        .tvOS(.v15),
        .macCatalyst(.v15),
    ],
    products: [
        .library(
            name: "PunycodexAuthenticator",
            targets: ["PunycodexAuthenticator"]
        ),
    ],
    targets: [
        .target(
            name: "PunycodexAuthenticator",
            path: ".",
            exclude: ["Package.swift", "README.md", "Tests"],
            sources: ["PunycodexAuthenticator.swift"]
        ),
        .testTarget(
            name: "PunycodexAuthenticatorTests",
            dependencies: ["PunycodexAuthenticator"],
            path: "Tests"
        ),
    ]
)
