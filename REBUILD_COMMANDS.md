# Rebuild Commands for Windows PowerShell

## Quick Rebuild (Development - Recommended)
```powershell
cd app
npx expo start --clear
```

## Full Clean Rebuild (If Quick Rebuild Doesn't Work)

### Step 1: Clear all caches
```powershell
cd app
npx expo start --clear
# OR if that doesn't work:
Remove-Item -Recurse -Force .expo
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

### Step 2: Reinstall dependencies (if needed)
```powershell
cd app
npm install
```

### Step 3: Clear Metro bundler cache
```powershell
cd app
npx expo start --clear
```

## For Native Build (Development Build)

### Android
```powershell
cd app
npx expo prebuild --clean
npx expo run:android
```

### iOS (Mac only)
```powershell
cd app
npx expo prebuild --clean
npx expo run:ios
```

## Complete Nuclear Rebuild (If Nothing Else Works)

```powershell
cd app

# Remove caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Start with fresh cache
npx expo start --clear
```

