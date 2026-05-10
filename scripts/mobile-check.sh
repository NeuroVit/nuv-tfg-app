#!/usr/bin/env bash
set -euo pipefail

pass() { printf "\033[32m[OK]\033[0m %s\n" "$1"; }
warn() { printf "\033[33m[WARN]\033[0m %s\n" "$1"; }
info() { printf "\033[36m[INFO]\033[0m %s\n" "$1"; }

echo "== Tauri mobile environment check =="
echo

if command -v xcodebuild >/dev/null 2>&1; then
  pass "Xcode installed: $(xcodebuild -version | head -n 1)"
else
  warn "Xcode not found."
fi

if command -v xcrun >/dev/null 2>&1; then
  if xcrun simctl list devices available >/dev/null 2>&1; then
    pass "iOS Simulator service available."
  else
    warn "iOS Simulator service is not responding. Open Xcode and launch Simulator once."
  fi
else
  warn "xcrun not found."
fi

if command -v pod >/dev/null 2>&1; then
  pass "CocoaPods installed: $(pod --version)"
else
  warn "CocoaPods missing (required for iOS). Install with: brew install cocoapods"
fi

if command -v rustup >/dev/null 2>&1; then
  installed_targets="$(rustup target list --installed)"
  for t in aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim; do
    if echo "$installed_targets" | grep -qx "$t"; then
      pass "Rust target installed: $t"
    else
      warn "Rust target missing: $t"
    fi
  done
  for t in aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android; do
    if echo "$installed_targets" | grep -qx "$t"; then
      pass "Rust target installed: $t"
    else
      warn "Rust target missing: $t"
    fi
  done
else
  warn "rustup not found."
fi

if [[ -n "${ANDROID_HOME:-}" ]]; then
  pass "ANDROID_HOME set: $ANDROID_HOME"
else
  warn "ANDROID_HOME not set."
fi

if [[ -n "${NDK_HOME:-}" ]]; then
  pass "NDK_HOME set: $NDK_HOME"
else
  warn "NDK_HOME not set."
fi

if command -v adb >/dev/null 2>&1; then
  pass "adb available: $(adb version | head -n 1)"
else
  warn "adb not found (Android platform-tools missing or not in PATH)."
fi

if command -v emulator >/dev/null 2>&1; then
  pass "Android emulator command available."
else
  info "Android emulator command not in PATH yet (normal until SDK is configured)."
fi

echo
info "Project checks"
if [[ -d "src-tauri/gen/apple" ]]; then
  pass "iOS project initialized (src-tauri/gen/apple)."
else
  warn "iOS project not initialized yet. Run: npm run mobile:ios:init"
fi

if [[ -d "src-tauri/gen/android" ]]; then
  pass "Android project initialized (src-tauri/gen/android)."
else
  warn "Android project not initialized yet. Run: npm run mobile:android:init"
fi

echo
info "Tip: run 'npx tauri info' for a full environment report."
