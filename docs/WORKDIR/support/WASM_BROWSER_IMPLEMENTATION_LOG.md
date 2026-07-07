# WASM Browser Implementation Log

Date: 2026-07-07

## Objective
Start practical browser/WASM bring-up work (not just scoping), keep a persistent implementation log for continuation.

## Changes Made

### 1) Added Emscripten scope tooling/preset scaffolding
- Added: [cmake/toolchains/emscripten-wasm32.cmake](cmake/toolchains/emscripten-wasm32.cmake)
- Updated: [CMakePresets.json](CMakePresets.json)
  - Added configure/build preset: `wasm-emscripten-scope`
  - Tuned preset cache variables for wasm bring-up:
    - `SAGE_USE_SDL3=ON`
    - `SAGE_USE_DX8=OFF`
    - `SAGE_USE_OPENAL=OFF`
    - `SAGE_USE_MINIAUDIO=OFF`
    - `RTS_BUILD_OPTION_FFMPEG=OFF`
    - `SAGE_UPDATE_CHECK=OFF` (avoid CURL requirement)
    - `SAGE_USE_GLM=ON`

### 2) Fixed SDL3 Emscripten config blocker
- Updated: [cmake/sdl3.cmake](cmake/sdl3.cmake)
- Problem:
  - Emscripten SDL configure failed: `SDL_SHARED and SDL_STATIC cannot both be disabled`
- Fix:
  - For `EMSCRIPTEN`: force `SDL_SHARED=OFF`, `SDL_STATIC=ON`, `BUILD_SHARED_LIBS=OFF`

### 3) Made SDL3_image setup cross-configure safe for Emscripten
- Updated: [cmake/sdl3.cmake](cmake/sdl3.cmake)
- Problem:
  - Host PNG discovery logic in this repo expected native host libpng and broke cross-configure assumptions
- Fix:
  - Skip host PNG discovery path when `EMSCRIPTEN`
  - Disable external codec toggles for Emscripten scope path (`JPG/PNG/TIF/WEBP/XCUR` off)

### 4) Fixed desktop-only font dependency in WW3D2 for Emscripten
- Updated: [Core/Libraries/Source/WWVegas/WW3D2/CMakeLists.txt](Core/Libraries/Source/WWVegas/WW3D2/CMakeLists.txt)
- Problem:
  - `if(UNIX)` pulled in Freetype/Fontconfig on Emscripten
- Fix:
  - Changed to `if(UNIX AND NOT EMSCRIPTEN)` for desktop font package discovery

### 5) Enabled GLM resolution for Emscripten CompatLib
- Updated: [GeneralsMD/Code/CompatLib/CMakeLists.txt](GeneralsMD/Code/CompatLib/CMakeLists.txt)
- Problem:
  - `find_package(glm CONFIG REQUIRED)` failed under Emscripten (no vcpkg config path)
- Fix:
  - For `EMSCRIPTEN`, use `FetchContent` to pull GLM (`g-truc/glm` tag `1.0.1`)
  - Skip GLI package requirement for Emscripten

## Current Status

### Configure status
- `cmake --preset wasm-emscripten-scope` now **succeeds**.

### Build status
- `cmake --build build/wasm-emscripten-scope -j 4` starts, then fails in SDL3 Emscripten sources.

### Active blocker (current stop point)
- SDL3 compile errors in Emscripten backend files, e.g.:
  - `SDL_emscriptenaudio.c`
  - `SDL_sysmain_runapp.c`
  - `SDL_sysurl.c`
- Symptom:
  - `EM_JS_DEPS(...): error: expected identifier`
- Likely cause:
  - Version incompatibility between system Emscripten (`3.1.6` from apt) and SDL `3.4.2` source expectations.

## Repro Commands

```bash
cd /workspaces/GeneralsWASM
cmake --preset wasm-emscripten-scope
cmake --build build/wasm-emscripten-scope -j 4
```

## Next Recommended Steps

1. Resolve SDL/Emscripten version mismatch:
- Option A: upgrade Emscripten toolchain to a newer version compatible with SDL 3.4.2.
- Option B: pin SDL3 FetchContent to a version known to compile with Emscripten 3.1.6.

2. After SDL compiles, continue collecting first-party compile/link blockers in GeneralsX code.

3. Keep iterating in small patches and update this log after each blocker/fix cycle.

## Notes
- This is active bring-up work, not complete browser support.
- Multiplayer/GameSpy, FFmpeg video, and DXVK replacement remain larger-phase tasks beyond this initial compile enablement.

---

## Continuation Log (same session)

### 6) Cleared DXVK/CompatLib typedef collisions and fallout
- Updated: [Generals/Code/CompatLib/Include/types_compat.h](Generals/Code/CompatLib/Include/types_compat.h)
- Updated: [GeneralsMD/Code/CompatLib/Include/types_compat.h](GeneralsMD/Code/CompatLib/Include/types_compat.h)
- Updated: [Core/Libraries/Source/WWVegas/WWLib/bittype.h](Core/Libraries/Source/WWVegas/WWLib/bittype.h)
- Problem:
  - Repeated `DWORD`/`ULONG` redefinition errors between CompatLib and DXVK `windows_base.h` under Emscripten.
- Fix path:
  - Normalized Emscripten to use fixed-width 32-bit typedef behavior in WWLib (`bittype.h`), matching DXVK expectations.
  - Restored CompatLib `DWORD`/`ULONG` availability as `uint32_t` where required by CompatLib consumers.
- Outcome:
  - Build progressed past earlier hard redefinition failures.

### 7) Fixed Unix helper symbol clash in WWLib
- Updated: [Core/Libraries/Source/WWVegas/WWLib/osdep.h](Core/Libraries/Source/WWVegas/WWLib/osdep.h)
- Problem:
  - Header-level `static strupr` conflicted with existing declaration on Emscripten libc (`static declaration follows non-static declaration`).
- Fix:
  - Switched to internal helper names (`generalsx_strupr`, `generalsx_strrev`) and macro aliases.
- Outcome:
  - Removed this blocker and moved compile frontier forward.

### 8) Scoped wasm preset to avoid desktop-only tools
- Updated: [CMakePresets.json](CMakePresets.json)
- Added to `wasm-emscripten-scope` cache variables:
  - `RTS_BUILD_CORE_TOOLS=OFF`
  - `RTS_BUILD_CORE_EXTRAS=OFF`
  - `RTS_BUILD_GENERALS_TOOLS=OFF`
  - `RTS_BUILD_ZEROHOUR_TOOLS=OFF`
  - `RTS_BUILD_GENERALS_EXTRAS=OFF`
  - `RTS_BUILD_ZEROHOUR_EXTRAS=OFF`
- Problem:
  - Build tried to compile MFC-only tool targets (e.g., DebugWindow with `afxwin.h`) that are not viable in wasm scope.
- Outcome:
  - Toolchain bring-up is now focused on game/runtime libs rather than desktop editors/utilities.

### 9) Fixed Emscripten memory helper and d3dx8 GLI guards
- Updated: [Generals/Code/CompatLib/Include/memory_compat.h](Generals/Code/CompatLib/Include/memory_compat.h)
- Updated: [GeneralsMD/Code/CompatLib/Source/d3dx8_compat.cpp](GeneralsMD/Code/CompatLib/Source/d3dx8_compat.cpp)
- Problems:
  - `GlobalSize` had no Emscripten branch.
  - `d3dx8_compat.cpp` still included GLI on Emscripten despite CMake intentionally not linking GLI.
- Fixes:
  - Added Emscripten `GlobalSize` branch using `malloc_usable_size`.
  - Excluded GLI includes/code paths for `EMSCRIPTEN` the same way as `__APPLE__` fallback path.

### 10) Audio scope decision for current bring-up
- Updated: [CMakePresets.json](CMakePresets.json)
  - Set `SAGE_USE_MINIAUDIO=ON` in `wasm-emscripten-scope`.
- Updated: [Core/Libraries/Source/WWVegas/CMakeLists.txt](Core/Libraries/Source/WWVegas/CMakeLists.txt)
- Updated: [Generals/Code/Libraries/Source/WWVegas/CMakeLists.txt](Generals/Code/Libraries/Source/WWVegas/CMakeLists.txt)
- Updated: [GeneralsMD/Code/Libraries/Source/WWVegas/CMakeLists.txt](GeneralsMD/Code/Libraries/Source/WWVegas/CMakeLists.txt)
- Problem:
  - WWAudio still drags deep Miles-era types/APIs (`mss.h`, `CRITICAL_SECTION`, `HSTREAM`, `AIL_lock/unlock`) that are not wasm-ready.
- Fix for scoping build:
  - Skip `WWAudio` subdirectories entirely under `EMSCRIPTEN` in Core, Generals, and GeneralsMD WWVegas CMake graphs.
  - Keep MiniAudio enabled at preset level for broader modern-audio code paths where applicable.
- Outcome:
  - Build advanced significantly beyond earlier audio include hard-stop and now runs deep into WW3D2 compile stages with warnings.

## Latest Build Snapshot

- Command used repeatedly:

```bash
cd /workspaces/GeneralsWASM
cmake --preset wasm-emscripten-scope
cmake --build build/wasm-emscripten-scope -j 1 -- -k 1 2>&1 | tee logs/wasm-build-latest.log
```

- Current observed state:
  - No immediate `error:` markers in latest log scan after the WWAudio exclusion updates.
  - Log tail currently ends in WW3D2 compilation warnings (suggesting build progressed but this capture was likely interrupted before a definitive success/fail footer).

## Next Resume Steps

1. Re-run full build to completion without interruption and record final status line.
2. If it fails, capture first hard error from [logs/wasm-build-latest.log](logs/wasm-build-latest.log) and patch only that blocker.
3. If it completes compile stage, move to first link-stage and runtime packaging blockers.

### 11) Fixed Emscripten float parsing in INI scanner
- Updated: [Core/GameEngine/Source/Common/INI/INI.cpp](Core/GameEngine/Source/Common/INI/INI.cpp)
- Problem:
  - Emscripten libc++ in this environment deletes floating-point `std::from_chars`, causing compile failure in INI token parsing.
  - Error was reported in `scanType<Real>` instantiations (`call to deleted function 'from_chars'`).
- Fix:
  - Added Emscripten to the float fallback path already used for Apple, parsing via `std::strtod`.
  - Refactored `scanType` so the `std::from_chars` call is instantiated only for integral types.
- Outcome:
  - `INI.cpp` no longer blocks build on `from_chars(float)`.

### 12) Disabled crashdump path for wasm scope
- Updated: [CMakePresets.json](CMakePresets.json)
  - Added `RTS_CRASHDUMP_ENABLE=OFF` to `wasm-emscripten-scope`.
- Problem:
  - Build reached `MiniDumper`/debug path requiring Windows-only `FILETIME` in this target configuration.
- Fix:
  - Turned off crashdump support for wasm scoping builds (not needed for browser feasibility bring-up).
- Outcome:
  - Build moved past prior `FILETIME` hard failure and continued compiling.

### 13) Current runtime status while iterating
- Build command currently running in background:

```bash
cd /workspaces/GeneralsWASM
cmake --build build/wasm-emscripten-scope -j 1 -- -k 1 2>&1 | tee logs/wasm-build-latest.log
```

- Most recent observed progress:
  - Build advanced into WW3D2/core library compilation with warning-heavy output and no new hard error observed at last poll.
  - Current polled sample showed progress around `[90/1584]` in the latest run context.

### 14) Full wasm build completion + runtime smoke
- Build completion confirmed with terminal exit code `0` on:

```bash
cmake --build build/wasm-emscripten-scope -j 4 -- -k 1 2>&1 | tee logs/wasm-build-latest.log
```

- Final build line observed: `[1925/1925] Linking CXX executable Generals/GeneralsX.js`.
- Hard-failure scan after completion returned no matches for `FAILED:|error:|fatal error:`.
- Verified generated artifacts:
  - `build/wasm-emscripten-scope/Generals/GeneralsX.js`
  - `build/wasm-emscripten-scope/GeneralsMD/GeneralsXZH.js`

### 15) Runtime smoke test (headless Node loader)
- Initial direct Node launch failed due to Node 24 URL/fetch behavior:

```text
TypeError: Failed to parse URL from /workspaces/GeneralsWASM/build/wasm-emscripten-scope/Generals/GeneralsX.wasm
```

- Smoke workaround used Emscripten filesystem load path by disabling fetch:

```bash
node -e "global.fetch=undefined; require('./build/wasm-emscripten-scope/Generals/GeneralsX.js')"
node -e "global.fetch=undefined; require('./build/wasm-emscripten-scope/GeneralsMD/GeneralsXZH.js')"
```

- Both commands exited cleanly with no output (successful loader-level smoke).

### 16) Warning cleanup pass 1 (override noise)
- Updated:
  - `Core/GameEngineDevice/Include/W3DDevice/GameClient/W3DView.h`
  - `Generals/Code/GameEngineDevice/Include/SDL3Device/GameClient/SDL3Mouse.h`
  - `GeneralsMD/Code/GameEngineDevice/Include/SDL3Device/GameClient/SDL3Mouse.h`
- Added explicit `override` specifiers to methods matching base virtual signatures.
- Validation rebuild succeeded (`10/10` incremental steps).
- Post-pass warning sample reduced to one category in that run (`-Wundefined-var-template`).
