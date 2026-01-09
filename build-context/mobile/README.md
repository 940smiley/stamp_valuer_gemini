
# Mobile Build Configuration

This project is configured for iOS and Android using Capacitor.

## Prerequisites
- Node.js & npm
- Xcode (for iOS)
- Android Studio (for Android)

## Setup

1. **Install Capacitor Dependencies** (if not already installed):
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   ```

2. **Initialize Platforms**:
   The `capacitor.config.json` at the root defines the context. To create the native projects:
   ```bash
   npx cap add android
   npx cap add ios
   ```

3. **Build Web Assets**:
   ```bash
   npm run build
   ```

4. **Sync to Mobile**:
   ```bash
   npx cap sync
   ```

5. **Open Native IDEs**:
   ```bash
   npx cap open android
   npx cap open ios
   ```
