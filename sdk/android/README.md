# PÚNYCODEX Authenticity SDK — Android

Kotlin SDK for the Name Authenticity Shield.

## Installation

Add the `lib` module to your Android project:

```gradle
implementation project(':sdk:android:lib')
```

## Usage

```kotlin
import com.punycodex.authenticity.AuthenticitySDK

val sdk = AuthenticitySDK.shared
val result = sdk.classify("аpple") // Cyrillic а
println(result.verdict) // HOMOGRAPH_SPOOF

val action = sdk.decideAction(result)
println(action.action) // BLOCK
```

## Share Extension

Register `ShareExtensionActivity` with an `ACTION_SEND` / `text/plain` intent
filter so users can share links from any app into the checker.

## App Attestation

Call `validateAttestation(token)` with a Play Integrity token to guard against
repackaged SDKs.
