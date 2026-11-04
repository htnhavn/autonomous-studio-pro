#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "🚀 Building 100% Pure Native macOS Ventura App (Intel x86_64)"
echo "   Frameworks: SwiftUI + AppKit + Combine (ZERO WebKit, ZERO HTML)"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_NAME="Autonomous Studio Pro"
OUTPUT_DIR="${ROOT_DIR}/dist-native"
APP_BUNDLE="${OUTPUT_DIR}/${APP_NAME}.app"

# 1. Compile Pure Native SwiftUI / AppKit Executable for macOS Ventura
#    Target the host architecture so the binary runs natively on both
#    Apple Silicon (arm64) and Intel (x86_64) machines.
HOST_ARCH="$(uname -m)"
case "${HOST_ARCH}" in
  arm64) TARGET_ARCH="arm64" ;;
  x86_64) TARGET_ARCH="x86_64" ;;
  *) echo "⚠️  Unknown host arch '${HOST_ARCH}', defaulting to arm64"; TARGET_ARCH="arm64" ;;
esac
echo "⚡ Step 1: Compiling Native Mach-O 64-bit Executable (${TARGET_ARCH}) with swiftc..."
mkdir -p "${ROOT_DIR}/native/macos"
swiftc -O -target "${TARGET_ARCH}-apple-macos13.0" \
    "${ROOT_DIR}/native/macos/AutonomousStudioNativeApp.swift" \
    -o "${ROOT_DIR}/native/macos/AutonomousStudioPro" \
    -framework Cocoa \
    -framework SwiftUI \
    -framework Combine \
    -framework AVFoundation

# 2. Create .app Bundle Directory Structure
echo "📂 Step 2: Structuring ${APP_NAME}.app..."
rm -rf "${APP_BUNDLE}"
mkdir -p "${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${APP_BUNDLE}/Contents/Resources"

# 3. Copy Pure Native Executable
echo "📦 Step 3: Installing Mach-O 64-bit Binary..."
cp "${ROOT_DIR}/native/macos/AutonomousStudioPro" "${APP_BUNDLE}/Contents/MacOS/AutonomousStudioPro"
chmod +x "${APP_BUNDLE}/Contents/MacOS/AutonomousStudioPro"

# 4. Generate Info.plist for macOS Ventura
echo "📝 Step 4: Generating Info.plist for macOS Ventura..."
cat << 'EOF' > "${APP_BUNDLE}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AutonomousStudioPro</string>
    <key>CFBundleIdentifier</key>
    <string>com.autonomous.studio.pro</string>
    <key>CFBundleName</key>
    <string>Autonomous Studio Pro</string>
    <key>CFBundleDisplayName</key>
    <string>Autonomous Studio Pro</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.0</string>
    <key>CFBundleVersion</key>
    <string>2</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
</dict>
</plist>
EOF

# 5. Ad-hoc Code Sign for macOS Ventura Gatekeeper
echo "🔐 Step 5: Code signing ad-hoc for local execution..."
codesign --force --deep --sign - "${APP_BUNDLE}"

# 6. Symlink to Root for 1-click access
rm -rf "${ROOT_DIR}/${APP_NAME}.app"
ln -sf "${APP_BUNDLE}" "${ROOT_DIR}/${APP_NAME}.app"

echo "=========================================================="
echo "✅ Pure Native macOS App Build Complete (Zero WebKit/HTML)!"
echo "📍 App Bundle Location: ${APP_BUNDLE}"
echo "📍 Root Shortcut: ${ROOT_DIR}/${APP_NAME}.app"
echo "🖥️ Architecture: $(file "${APP_BUNDLE}/Contents/MacOS/AutonomousStudioPro")"
echo "=========================================================="
