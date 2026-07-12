// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ExcessorizeEngine",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "ExcessorizeEngine", targets: ["ExcessorizeEngine"])
    ],
    targets: [
        .target(name: "ExcessorizeEngine", path: "Sources/ExcessorizeEngine"),
        .testTarget(
            name: "ExcessorizeEngineTests",
            dependencies: ["ExcessorizeEngine"],
            path: "Tests/ExcessorizeEngineTests"
        )
    ]
)
