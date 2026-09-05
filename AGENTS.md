# GeneralsX WASM Fork: Agent Instructions

## What this repo is
This repository is a fork of GeneralsX focused on browser/WASM feasibility and prototype work for Command & Conquer: Generals and Zero Hour.

This is not the primary upstream GeneralsX desktop release project. It is an exploratory branch that reuses the same modernization stack while testing whether the project can be adapted for an Emscripten browser target without breaking the native desktop baseline.

## Mission
The current mission is to investigate and reduce the gap between:

- the existing GeneralsX platform modernization work
- a browser-friendly runtime model
- a practical playability target for WASM/Emscripten

This means the work should stay oriented around browser port feasibility, platform abstraction, and backend replacement decisions, not just desktop packaging.

## Project status
- **Primary goal**: browser/WASM path
- **Secondary baseline**: native Linux/macOS validation and compatibility
- **Not the mainline release**: this fork may lag behind upstream and is intentionally experimental
- **Current target**: the scoping build links successfully, but no playable browser runtime exists yet

## Key entry points
- `GeneralsMD/Code/Main/WinMain.cpp`
- `Generals/Code/Main/WinMain.cpp`
- `Core/GameEngineDevice/Source/`
- `docs/WORKDIR/support/WASM_BROWSER_SCOPING_2026-07.md`
- `docs/WORKDIR/support/WASM_BROWSER_IMPLEMENTATION_LOG.md`

## Platform focus
- **Active exploration**: Emscripten/WASM browser target
- **Baseline validation**: Linux (`linux64-deploy`), macOS (`macos-vulkan`)
- **Future/secondary**: Windows path remains exploratory
- **Legacy**: VC6 + DirectX 8 + Miles remains reference only

## Architectural intent
| Layer | Technology | Current role |
|-------|------------|--------------|
| Graphics | DXVK / browser backend analysis | Desktop baseline plus browser rewrite investigation |
| Windowing | SDL3 | Desktop baseline, browser-compatible abstraction target |
| Audio | OpenAL / MiniAudio | Desktop backends; the WASM scoping graph skips legacy WWAudio |
| Video | FFmpeg | Useful for desktop, likely cut or redesigned for browser v1 |
| Platform | SDL3 + libc + abstraction work | Keep portable, browser-aware design |

**CRITICAL**: Keep platform code isolated and avoid adding desktop-only assumptions into browser-facing work. This repo should remain compatible with the native baseline while making the browser target explicit.

## Golden rules
1. **Treat this as a WASM/feasibility fork, not the stable GeneralsX release branch**
2. **Keep browser target requirements visible in the work**
3. **Prefer platform abstraction over ad hoc desktop-only fixes**
4. **Do not assume desktop Linux/macOS is the final goal**
5. **Retain upstream compatibility and regression awareness**
6. **Be explicit about browser blockers and cut scopes**
7. **Use the native baseline as a reference, not as the only destination**
8. **Update worklog and notes when making changes**
9. **Backport only when it clearly helps the broader project and remains relevant to the fork**
10. **Study upstream patterns and keep this fork's scope honest**

## Reference repos and baselines
- **GeneralsX** — main desktop modernization project and compatibility baseline
- **TheSuperHackers** — upstream game-code baseline for regressions and retail compatibility
- **fighter19-dxvk-port** — archived Linux DXVK + SDL3 reference under `references/old-refs/`
- `docs/WORKDIR/support/WASM_BROWSER_SCOPING_2026-07.md` — feasibility and dependency audit
- `docs/WORKDIR/support/WASM_BROWSER_IMPLEMENTATION_LOG.md` — active build status, blockers, and fixes

## Build commands

### Native baseline
```bash
cmake --preset linux64-deploy
cmake --build build/linux64-deploy --target z_generals
```

### Browser/WASM exploration
```bash
cmake --preset wasm-emscripten-scope
cmake --build build/wasm-emscripten-scope -j 4
```

The current preset builds `GeneralsX.js` and `GeneralsXZH.js` and has passed loader-level Node.js smoke tests. It is not a playable browser build: browser startup, asset delivery, graphics, media, networking, and runtime validation remain incomplete.

The preset intentionally disables or excludes DX8/DXVK rendering, FFmpeg, OpenAL, crash dumps, and desktop tools. Treat `CMakePresets.json` and the implementation log as the source of truth for the current cut scope.

## Status check for changes
Before making a change, ask:

- Does this help the browser/WASM exploration?
- Does it improve the native baseline without creating new desktop-only debt?
- Is the change aligned with the actual mission of this fork?

If the answer is no, it likely belongs in the upstream desktop project instead.

## Documentation workflow
1. Keep the root docs honest about the fork's status and mission
2. Keep active work in `docs/WORKDIR/`
3. Keep monthly diary entries in `docs/WORKLOG/YYYY-MM-DIARY.md`
4. Do not treat this repo as the default end-user GeneralsX release branch

## Agent guidance
- Keep scope narrow and intentional
- Favor feasibility analysis and root-cause investigation over broad cleanup
- Document browser constraints, architectural blockers, and minimal viable cuts
- Preserve clarity between upstream GeneralsX work and this fork's WASM-specific efforts

## GitHub issue and PR expectations
- Use GitHub Issues for tracking blockers and feature work
- Prefer small, scoped PRs that advance the browser/WASM path or clarify the native baseline
- Avoid portraying this fork as a replacement for the upstream mainline project

## Build Presets Reference
- **linux64-deploy** – GCC/Clang x86_64, Release (PRIMARY LINUX)
- **linux64-openal** – legacy Linux OpenAL variant
- **linux64-miniaudio** – Linux MiniAudio variant
- **macos-vulkan** – macOS ARM64, RelWithDebInfo, MiniAudio (PRIMARY MACOS)
- **macos-openal** – legacy macOS OpenAL variant
- **wasm-emscripten-scope** – Emscripten wasm32 scoping build
- **mingw-w64-i686** – MinGW cross-compile (exploratory)
- **vc6** – Visual Studio 6, 32-bit (legacy)
- **win32** – MSVC 2022, experimental

## Directories
- `GeneralsMD/`: Zero Hour.
- `Generals/`: base game.
- `Core/`: shared libraries.
- `references/`: old-refs/thesuperhackers-main, fbraz3-dxvk (active); old-refs/ (historical).
- `docs/WORKDIR/`: current work docs.
- `docs/HOWTO/`: user-facing step-by-step tutorials (SagePatch config, etc.)
- `logs/`: build/run/debug logs.

## Instruction Context Loading

The `.github/instructions/` files are scoped VS Code hints — they load only when the file path matches.

You MUST load the files below to your context when the file/dir you are working on matches the applyTo column pattern.

The `**` at applyTo means all files, you MUST load it everytime.

| Instruction File | applyTo | Purpose |
|---|---|---|
| [.github/instructions/git-commit.instructions.md](.github/instructions/git-commit.instructions.md) | `**` | Commit/PR message standards |
| [.github/instructions/cpp-conventions.instructions.md](.github/instructions/cpp-conventions.instructions.md) | `**/*.{cpp,h,hpp,c}` | Code style, annotations, platform isolation |
| [.github/instructions/build.instructions.md](.github/instructions/build.instructions.md) | `cmake/**,CMakeLists.txt,CMakePresets.json` | Build presets, DXVK source of truth |
| [.github/instructions/platform-linux.instructions.md](.github/instructions/platform-linux.instructions.md) | `scripts/build/linux/**` | Linux build notes |
| [.github/instructions/platform-macos.instructions.md](.github/instructions/platform-macos.instructions.md) | `scripts/build/macos/**,references/fbraz3-dxvk/**` | macOS/DXVK build notes |
| [.github/instructions/docs.instructions.md](.github/instructions/docs.instructions.md) | `**/*.md` | Documentation structure and workflow |
| [.github/instructions/scripts.instructions.md](.github/instructions/scripts.instructions.md) | `scripts/**` | Script organization and naming |

Update this table when instruction files are added, removed, or renamed.