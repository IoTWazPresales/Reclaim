#!/usr/bin/env bash
# Usage: shot.sh <name> — capture emulator screen to .eif/audit/N-0073/renders/<name>.png (+ UI dump xml)
export MSYS_NO_PATHCONV=1
ADB="/c/Users/warren_eliason/AppData/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" shell screencap -p /sdcard/n0073.png && "$ADB" pull /sdcard/n0073.png "C:/Reclaim/.eif/audit/N-0073/renders/$1.png" >/dev/null && "$ADB" shell rm /sdcard/n0073.png
"$ADB" shell uiautomator dump /sdcard/n0073.xml >/dev/null 2>&1 && "$ADB" pull /sdcard/n0073.xml "C:/Reclaim/.eif/audit/N-0073/ui.xml" >/dev/null 2>&1
