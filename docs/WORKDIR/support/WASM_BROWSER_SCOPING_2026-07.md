# GeneralsX Browser/WASM Scoping (2026-07-07)

## Goal
Scope what it takes to build and run GeneralsX in browser via Emscripten/WASM, without doing the full port yet.

## 1. Native Baseline First

### What was verified
- Native Linux configure path now works in this container with the project preset:
  - cmake --preset linux64-deploy
- Build dependency blockers encountered and resolved during baseline setup:
  - Missing X11/SDL dependencies (XCURSOR, XTEST)
  - Missing FFmpeg dev packages (libavcodec/libavformat/libavutil/libswscale)
- Full build was started and progressed deeply (thousands of C++ translation units).

### Native runtime validation status
- Runtime launch with game assets is not validated in this container session because legally-owned game data paths are not present in this environment.
- This remains required for a complete baseline signoff on a real dev machine with installed game assets.

## 2. Rendering Backend Boundary Audit (DXVK/D3D Surface)

### Scope size
- 74 source files directly reference D3D/DXVK APIs or symbols (excluding docs/build/vcpkg/references).

### Primary abstraction choke points
- Core wrapper and device abstraction:
  - [Core/Libraries/Source/WWVegas/WW3D2/dx8wrapper.h](Core/Libraries/Source/WWVegas/WW3D2/dx8wrapper.h)
  - [Core/Libraries/Source/WWVegas/WW3D2/dx8wrapper.cpp](Core/Libraries/Source/WWVegas/WW3D2/dx8wrapper.cpp)
  - [Core/Libraries/Source/WWVegas/WW3D2/dx8caps.h](Core/Libraries/Source/WWVegas/WW3D2/dx8caps.h)
  - [Core/Libraries/Source/WWVegas/WW3D2/dx8caps.cpp](Core/Libraries/Source/WWVegas/WW3D2/dx8caps.cpp)
  - [Core/Libraries/Source/WWVegas/WW3D2/surfaceclass.h](Core/Libraries/Source/WWVegas/WW3D2/surfaceclass.h)
  - [Core/Libraries/Source/WWVegas/WW3D2/surfaceclass.cpp](Core/Libraries/Source/WWVegas/WW3D2/surfaceclass.cpp)
- Engine integration points:
  - [Generals/Code/Libraries/Source/WWVegas/WW3D2/ww3d.cpp](Generals/Code/Libraries/Source/WWVegas/WW3D2/ww3d.cpp)
  - [GeneralsMD/Code/Libraries/Source/WWVegas/WW3D2/ww3d.cpp](GeneralsMD/Code/Libraries/Source/WWVegas/WW3D2/ww3d.cpp)
- Rendering call-heavy files using DX8Wrapper state APIs:
  - render2d.cpp / camera.cpp / scene.cpp / mesh material stack

### Full detected file list source
- Generated during audit from code search over Core/Generals/GeneralsMD (available from command history in session).
- Representative list is in [Core/Libraries/Source/WWVegas/WW3D2](Core/Libraries/Source/WWVegas/WW3D2), [Core/GameEngineDevice/Source/W3DDevice/GameClient](Core/GameEngineDevice/Source/W3DDevice/GameClient), and mirrored Generals/GeneralsMD WW3D2 paths.

## 3. Win32-Specific Code Audit

### Observed state
The project has substantial Win32 compatibility scaffolding, but significant Win-style API usage still appears in runtime and large amounts in tooling.

### Runtime-relevant remaining areas (examples)
- Threading/synchronization wrappers and Win-like semantics:
  - [Core/Libraries/Source/WWVegas/WWLib/thread.cpp](Core/Libraries/Source/WWVegas/WWLib/thread.cpp)
  - [Core/Libraries/Source/WWVegas/WWLib/mutex.cpp](Core/Libraries/Source/WWVegas/WWLib/mutex.cpp)
  - [Generals/Code/CompatLib/Include/threads_compat.h](Generals/Code/CompatLib/Include/threads_compat.h)
  - [GeneralsMD/Code/CompatLib/Include/threads_compat.h](GeneralsMD/Code/CompatLib/Include/threads_compat.h)
- Win32 device path still present:
  - [Core/GameEngineDevice/Source/Win32Device](Core/GameEngineDevice/Source/Win32Device)
  - [Generals/Code/GameEngineDevice/Source/Win32Device](Generals/Code/GameEngineDevice/Source/Win32Device)
  - [GeneralsMD/Code/GameEngineDevice/Source/Win32Device](GeneralsMD/Code/GameEngineDevice/Source/Win32Device)
- Network/game services with legacy patterns:
  - [Core/GameEngine/Source/GameNetwork/GameSpy](Core/GameEngine/Source/GameNetwork/GameSpy)

### Tooling-heavy Windows-only zones (likely out-of-scope for v1 browser)
- 3ds Max plugin and legacy tools in [Core/Tools](Core/Tools)
- GUI editor and Windows utility tooling in Generals/GeneralsMD tool paths

## 4. Dependency Portability Verdict (Emscripten)

| Dependency | Verdict | Notes |
|---|---|---|
| SDL3 | Yellow | Emscripten supports SDL; this project currently has conflicting SDL option wiring under emcmake (see failures below). |
| OpenAL | Yellow | OpenAL path can be mapped via Emscripten/OpenAL ports, but project integration is desktop-oriented and not yet wasm-configured. |
| FFmpeg | Red (v1) | Browser FFmpeg integration is possible but high complexity/cost; best cut from v1 browser target. |
| DXVK / D3D8 path | Red | DXVK/Vulkan path is not viable in browser target as used here; needs backend replacement layer. |
| GameSpy / legacy multiplayer stack | Red | Requires protocol/service replacement (WebSocket/WebRTC + backend work), not solved by Emscripten alone. |

## 5. Bare Emscripten Configure/Build Pass and Failure Categories

## What was attempted
- emcmake cmake -S . -B build/wasm-emscripten -G Ninja
- Follow-up forced attempts to push further:
  - Injected Freetype/Fontconfig cache vars
  - Forced SAGE_USE_SDL3=ON
  - Forced SDL_STATIC=ON, SDL_SHARED=OFF

### Failure categories (grouped by root cause)
1. Missing cross-target dependency discovery
- Could not find Freetype in wasm configure path.
- Could not find Fontconfig with expected toolchain discovery.

2. Feature gating contradictions in project CMake
- [Patches/SagePatch/CMakeLists.txt](Patches/SagePatch/CMakeLists.txt) aborts with "SagePatch requires SAGE_USE_SDL3=ON" while Emscripten path disables SDL3 in current logic.

3. SDL3 configuration conflict under Emscripten
- SDL3 configure fails with "SDL_SHARED and SDL_STATIC cannot both be disabled" even when top-level flags were forced, indicating current project-side SDL option wiring is not Emscripten-safe.

4. Platform model mismatch warnings
- Shared library targets downgraded to static under Emscripten, indicating packaging assumptions that need cleanup for wasm output.

### Compile/link error status
- The build did not reach broad compile/link stages because configure-level blockers stop generation first.
- Therefore, compile/link failures are currently pre-empted by configuration architecture issues.

## 6. Rendering Rewrite Estimate (DXVK -> Browser Backend)

### Candidate directions
- WebGL2 backend (shorter path):
  - Pros: mature support in Emscripten and all major browsers.
  - Cons: feature mapping pain for D3D8-era fixed-function/state model and shader behavior.
- WebGPU backend (better long-term target):
  - Pros: closer to modern explicit graphics APIs and future-proofing.
  - Cons: browser support/perf variability and higher implementation complexity now.

### Practical estimate from current surface area
- Directly impacted rendering files: ~74 code files discovered by DXVK/D3D symbol scan.
- Real rewrite center of gravity: DX8Wrapper, state cache, surfaces/textures, format conversion, render state translation, and WW3D integration.
- Estimated scope:
  - Backend bootstrap + minimal frame output: medium
  - Feature parity with current rendering path: very high
  - Full visual parity and deterministic replay confidence: very high + long-tail bug fixing

## 7. Recommended v1 Browser Cuts

- Cut multiplayer online stack (GameSpy-dependent systems).
- Cut video/cutscenes (FFmpeg path) initially.
- Cut non-runtime tools (3ds Max exporter, GUI tooling, patch/launcher tooling).
- Keep focus on single-player/skirmish runtime loop, core rendering, input, basic audio.

## 8. Proposed Browser Build Pipeline

1. Configure
- emcmake cmake -S . -B build/wasm-emscripten -G Ninja -DCMAKE_TOOLCHAIN_FILE=cmake/toolchains/emscripten-wasm32.cmake

2. Build
- emmake cmake --build build/wasm-emscripten -j

3. Asset packaging stage
- Preprocess/pack game assets into browser-fetchable bundles (deferred mount strategy recommended).

4. Output stage
- Produce .wasm + loader .js/.html
- Add browser startup shell and asset preloading flow

5. Runtime validation
- Main menu boot test
- Map load test
- Determinism/replay compatibility spot-checks

## 9. Browser-Specific Hard Blockers Check (Play!-style JIT/memory protection concern)

### Findings
- No clear evidence in runtime code of dynamic JIT code generation / executable page rewriting patterns typical of dynarec emulators.
- Some Windows shared-memory and thread/event APIs are present, but not obvious RWX/JIT behavior.

### Risk assessment
- JIT memory-protection blocker risk appears lower than emulator dynarec projects.
- Primary blockers are still build-system and rendering backend architecture, not browser executable-memory policy.

## 10. Minimal Scaffolding Added in This Scope Pass

- Toolchain shim:
  - [cmake/toolchains/emscripten-wasm32.cmake](cmake/toolchains/emscripten-wasm32.cmake)
- CMake preset + build preset:
  - [CMakePresets.json](CMakePresets.json)
  - Added preset: wasm-emscripten-scope

## 11. Immediate Next Steps

1. Add a dedicated CMake option matrix for wasm that cleanly disables desktop-only features (without tripping SagePatch/SDL conflicts).
2. Gate all non-browser-compatible tooling/targets out of wasm configure graph.
3. Introduce a renderer backend interface split around DX8Wrapper responsibilities and implement a minimal browser backend prototype that clears frame + draws simple geometry.
4. Re-run emcmake/emmake after the configure graph is made wasm-safe to collect real compile/link blocker inventory.
