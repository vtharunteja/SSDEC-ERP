# Mobile Build Guide

This project is prepared for Android and iOS packaging with Capacitor.

## 1. Install tools

Windows / Android:
- Install Node.js LTS
- Install Android Studio
- Install Java SDK through Android Studio

iOS:
- Use a Mac
- Install Node.js LTS
- Install Xcode
- Install CocoaPods

## 2. Install project dependencies

Run in the project root:

```powershell
npm install
```

## 3. Create native projects

```powershell
npm run cap:android:add
npm run cap:ios:add
```

If one platform already exists, skip that command.

## 4. Sync web app into native shells

```powershell
npm run cap:sync
```

## 5. Open native projects

Android:

```powershell
npm run cap:android
```

iOS:

```powershell
npm run cap:ios
```

## 6. Build outputs

Android:
- Generate APK / AAB from Android Studio

iOS:
- Archive and export from Xcode on Mac

## Notes

- The app uses the existing Supabase backend and current static HTML/CSS/JS frontend.
- iOS final build requires Xcode on macOS.
- Re-run `npm run cap:sync` after web code changes.
