#!/usr/bin/env bash
set -e

# Automatically detect Android SDK location
if [ -z "$ANDROID_HOME" ]; then
  if [ -f "android/local.properties" ]; then
    SDK_DIR=$(grep -E '^sdk\.dir=' android/local.properties | cut -d'=' -f2 | tr -d '\r')
    if [ -n "$SDK_DIR" ]; then
      export ANDROID_HOME="$SDK_DIR"
    fi
  fi
fi

if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [ -d "/home/$USER/Android/Sdk" ]; then
    export ANDROID_HOME="/home/$USER/Android/Sdk"
  fi
fi

if [ -n "$ANDROID_HOME" ]; then
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
fi

# Prevent EAS Doctor from blocking builds
export EAS_BUILD_DISABLE_EXPO_DOCTOR_STEP=1

# Redirect temporary folder to persistent user disk (prevents 'Disk quota exceeded' on /tmp tmpfs)
export TMPDIR="${HOME}/.eas-tmp"
mkdir -p "$TMPDIR" 2>/dev/null || true

# Stop stale Gradle daemons that might hold file locks or corrupted caches
(cd android 2>/dev/null && ./gradlew --stop 2>/dev/null || true)

echo "============================================="
echo "   Radical Engineering - Android Builder    "
echo "============================================="
echo "Android SDK: ${ANDROID_HOME:-Not Found}"
echo "Temp Dir:    $TMPDIR"
echo ""

CHOICE=$1

if [ -z "$CHOICE" ]; then
  echo "Select build type:"
  echo "  1) Play Store Bundle (.aab) - Local (EAS)"
  echo "  2) Test APK (.apk) - Local (EAS)"
  echo "  3) Test APK (.apk) - Direct Gradle (Fastest & Low Disk)"
  echo "  4) Play Store Bundle (.aab) - EAS Cloud"
  echo "  5) Exit"
  echo ""
  read -p "Enter choice [1-5]: " CHOICE
fi

case "$CHOICE" in
  1|aab|production)
    echo ""
    echo "▶ Building Play Store Bundle (.aab) locally via EAS..."
    eas build --platform android --profile production --local
    ;;
  2|apk|preview)
    echo ""
    echo "▶ Building Installable APK (.apk) locally via EAS..."
    eas build --platform android --profile preview --local
    ;;
  3|gradle|direct)
    echo ""
    echo "▶ Building Installable APK directly with Gradle..."
    (
      cd android
      chmod +x gradlew
      ./gradlew assembleRelease --no-daemon
    )
    mkdir -p build-output
    APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_SRC" ]; then
      cp "$APK_SRC" build-output/DoctorSurvey-release.apk
      echo ""
      echo "============================================="
      echo "   BUILD SUCCESSFUL! 🎉"
      echo "============================================="
      echo "APK Location: build-output/DoctorSurvey-release.apk"
      echo "File Size:    $(du -h build-output/DoctorSurvey-release.apk | cut -f1)"
      echo "Install via USB: adb install -r build-output/DoctorSurvey-release.apk"
    fi
    ;;
  4|cloud)
    echo ""
    echo "▶ Building on EAS Cloud..."
    eas build --platform android --profile production
    ;;
  5|q|exit)
    echo "Build canceled."
    exit 0
    ;;
  *)
    echo "Invalid option. Use: 1 (EAS AAB), 2 (EAS APK), 3 (Direct Gradle APK), or 4 (Cloud)"
    exit 1
    ;;
esac
