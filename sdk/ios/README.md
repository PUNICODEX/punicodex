# PuniCodex Authenticity SDK — iOS

Swift SDK for the Name Authenticity Shield.

## Installation

Add this package to your Xcode project or `Package.swift`:

```swift
.package(url: "https://github.com/PUNICODEX/punicodex.git", from: "2.0.0")
```

## Usage

```swift
import PunicodexAuthenticator

let auth = PunicodexAuthenticator.shared
let result = auth.classify("аpple") // Cyrillic а
print(result.verdict) // .homographSpoof

let action = auth.decideAction(result)
print(action.action) // .block
```

## Share Extension

Use `PunicodexShareViewController` (to be added) to receive links from Safari,
Mail, and Messages.

## App Attestation

Call `validateAttestation(_:)` with an App Attest token to guard against
repackaged SDKs.
