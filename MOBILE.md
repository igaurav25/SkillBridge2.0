# SkillBridge 2.0 — Mobile Architecture, PWA & Native App Guide

This document details the mobile architecture, Progressive Web App (PWA) configuration, Capacitor native bridge setup, and Android/iOS build workflows for SkillBridge.

---

## 1. Architectural Decision: Ionic Angular vs. Capacitor-Only

```
1. Weight & Bundle Overhead: Ionic Angular injects ~450 KB of heavy UI web components, while Capacitor-only adds < 15 KB.
2. Angular 19 Signals & Standalone: Capacitor directly wraps our Angular 19 standalone architecture with zero compilation friction.
3. Design System Preservation: Our bespoke AAA cinematic design tokens, glassmorphism, and Three.js 3D hero remain 100% intact.
4. No Component Rewrites: Ionic requires rewriting all DOM elements into <ion-*>, whereas Capacitor enhances native WebViews cleanly.
5. Native Plugin Parity: Capacitor provides first-party hardware back-button, camera, secure storage, and push notifications directly.
Decision: Capacitor-only was chosen to maintain maximum performance, zero framework bloat, and full Angular 19 compatibility.
```

---

## 2. Real Mobile Shell Architecture

SkillBridge implements a mobile-first responsive shell:
- **Role-Aware Bottom Navigation (`BottomNavComponent`)**:
  - Dynamically renders tailored tabs according to the authenticated user's role:
    - **Student**: Home (`/student/dashboard`), Jobs (`/jobs`), Roadmap (`/learning-roadmap`), Tests (`/assessments`), Profile (`/profile`).
    - **Recruiter**: Pipeline (`/recruiter/applications`), Post Job (`/recruiter/post-job`), Overview (`/recruiter/dashboard`), Talent (`/recruiter/candidates`), Profile (`/profile`).
    - **Admin**: Control (`/admin/dashboard`), Users (`/admin/users`), Jobs (`/admin/jobs`), Reports (`/admin/reports`), Security (`/admin/dashboard`).
    - **Guest**: Home (`/`), Jobs (`/jobs`), Explore (`/career-explorer`), Roadmaps (`/learning-roadmap`), Sign In (`/login`).
  - Haptic tactile feedback on tab clicks.
  - Full safe-area insets padding (`env(safe-area-inset-bottom)`).
- **Touch Targets (44px+ Minimum)**:
  - All mobile navigation tabs, buttons, form controls, and select elements enforce `min-height: 44px; min-width: 44px;` complying with WCAG 2.1 AA target size criteria.
- **iOS Safari Auto-Zoom Prevention**:
  - On viewports `<= 768px`, all `input`, `select`, and `textarea` elements enforce `font-size: 16px !important`, preventing iOS Safari from automatically zooming in and displacing layout margins upon focus.
- **Bottom-Sheet Modals (`@media (max-width: 640px)`)**:
  - Desktop centered dialogs transition on mobile to native-feel bottom sheets with rounded top corners, swipe-handle indicator bar, and smooth `slideUpBottomSheet` animation.
- **Android Hardware Back-Button Handling**:
  - Managed by `MobileNativeService`:
    1. Dismisses any active modal or bottom-sheet drawer first.
    2. At root routes (`/`, `/student/dashboard`, `/recruiter/dashboard`, `/admin/dashboard`), displays a toast: *"Press back again to exit SkillBridge"*. A double tap within 2 seconds cleanly exits the application.
    3. At sub-routes, navigates back in browser history.
- **Pull-To-Refresh (`PullToRefreshComponent`)**:
  - Interactive touch pull gesture with spring damping, visual directional arrow, rotation spinner, and haptic feedback on threshold release.

---

## 3. Installable Progressive Web App (PWA)

- **Web App Manifest (`frontend/public/manifest.json`)**:
  - `start_url`: `/`
  - `display`: `standalone`
  - `display_override`: `["window-controls-overlay", "standalone", "minimal-ui"]`
  - `background_color`: `#0B1020`
  - `theme_color`: `#6366F1`
  - High-res vector and raster app icons with `maskable` and `any` purposes.
  - App shortcuts for quick jumps to Dashboard, Jobs, and Roadmaps.
- **Universal Service Worker (`frontend/public/sw.js`)**:
  - Pre-caches core App Shell assets: `/`, `/index.html`, `/manifest.json`, `/favicon.ico`, and `/offline.html`.
  - Cache versioning: `skillbridge-pwa-v2.2`.
  - Stale-While-Revalidate caching strategy for static assets.
  - Network-First with offline JSON fallback for `/api/` requests.
  - Dedicated offline page fallback (`/offline.html`) when network connectivity is lost.
- **Install Prompt Banner (`PwaInstallBannerComponent`)**:
  - Listens to `beforeinstallprompt` event on Chromium and Android.
  - Detects iOS Safari and provides 1-click step-by-step instructions: *Tap Share then "Add to Home Screen"*.

---

## 4. Capacitor Android Build Steps

### Prerequisites
- Java Development Kit (JDK) 17 or 21.
- Android Studio Ladybug / Koala or Android SDK Command-line Tools (API Level 34+).
- Environment variables: `JAVA_HOME` and `ANDROID_HOME`.

### Developer Commands
```bash
# 1. Build the Angular production bundle
cd frontend
npx ng build --configuration production

# 2. Synchronize web assets, plugins, and dependencies with Android
npx cap sync android

# 3. Open project in Android Studio (for emulator or device debugging)
npx cap open android
```

### Building Signed APK / AAB via CLI
```bash
cd frontend/android

# Build Debug APK (outputs to frontend/android/app/build/outputs/apk/debug/app-debug.apk)
./gradlew assembleDebug

# Build Release APK (outputs to frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk)
./gradlew assembleRelease

# Build Google Play Android App Bundle (AAB)
./gradlew bundleRelease
```

### Release Signing Configuration
To sign your release build, add the following to `frontend/android/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file("skillbridge-keystore.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "skillbridge"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 5. iOS Project & macOS Requirement

- **Status**: The iOS native project (`frontend/ios/App/App.xcworkspace`) has been generated and configured with all 5 native plugins and Package.swift bindings.
- **Platform Constraint**:
  > **IMPORTANT NOTICE:** Compiling and building iOS apps into an `.ipa` or running the iOS Simulator strictly requires a Mac running macOS (Sonoma 14+ or Sequoia 15+) with Xcode 15+ installed. Because this build environment is Windows, iOS compilation cannot be performed locally.
- **Build Steps on Mac**:
  ```bash
  cd frontend
  npx ng build --configuration production
  npx cap sync ios
  npx cap open ios
  # In Xcode: Select target device/simulator and press Product -> Build / Run (Cmd + R)
  ```

---

## 6. Push Notifications Credentials Checklist

To activate live remote push notifications via `@capacitor/push-notifications`, the following credentials must be configured:

| Platform | Required Credential File / Token | Destination Location |
| :--- | :--- | :--- |
| **Android (FCM)** | `google-services.json` from Firebase Console | `frontend/android/app/google-services.json` |
| **Android (FCM)** | Google Cloud Project Number & Sender ID | Automatically read from `google-services.json` |
| **iOS (APNs)** | Apple Push Notification key (`.p8`) | Uploaded to Firebase Console -> Cloud Messaging |
| **iOS (APNs)** | Team ID & Key ID | Configured in Apple Developer Portal |
| **Backend API** | Firebase Admin SDK Service Account JSON | Set as `FIREBASE_SERVICE_ACCOUNT` in `backend/.env` |

---

## 7. Deep Linking Specification

SkillBridge supports both custom URI schemes and verified App Links:
- **Custom Scheme**: `skillbridge://<route>` (e.g. `skillbridge://jobs/6af72...`)
- **HTTPS App Link**: `https://skillbridge.com/<route>` (verified via `.well-known/assetlinks.json`)
- **App URL Handler**: Automatically dispatches deep links through Angular Router's `navigateByUrl()`.

