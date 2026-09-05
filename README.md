[![GeneralsWASM CI](https://github.com/amirrr/GeneralsWASM/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/amirrr/GeneralsWASM/actions/workflows/ci.yml)

# GeneralsX WASM Fork

This repository is a fork of [GeneralsX](https://github.com/fbraz3/GeneralsX) with a more specific goal: explore and prototype a browser/WebAssembly port of Command & Conquer: Generals and Zero Hour.

This fork is intentionally not a polished release fork of the upstream Linux/macOS project. It is a work-in-progress branch focused on understanding what it takes to move the existing GeneralsX modernization stack toward Emscripten/WASM, browser runtimes, and a reduced desktop dependency model.

## Current project intent

The main objective is to answer a practical question:

- Can the current GeneralsX codebase be adapted to run in the browser without rewriting the whole game from scratch?
- What parts are browser-compatible today?
- Which desktop assumptions must be cut, replaced, or abstracted before a browser target is viable?

In practice, this means working on:

- Emscripten/WASM toolchain integration
- Browser-safe build configuration and feature gating
- Rendering and platform abstraction analysis
- Removing or isolating desktop-only assumptions like DXVK/Vulkan desktop runtime expectations, FFmpeg-heavy media paths, and legacy multiplayer/service assumptions
- Keeping the upstream GeneralsX and TheSuperHackers codebase as the baseline while experimenting with a browser-first path

## Repository status

This fork may lag behind mainline GeneralsX and should be treated as an exploratory branch, not a stable release line.

The current state is best described as:

- The `wasm-emscripten-scope` preset configures and builds both Generals and Zero Hour JavaScript/WASM artifacts
- Both generated loaders pass a basic headless Node.js smoke test
- No interactive browser shell, asset delivery flow, rendering backend, or playable browser runtime is complete yet
- Native Linux and macOS remain compatibility baselines inherited from GeneralsX

## Why this fork exists

This fork exists because the upstream GeneralsX project is primarily focused on a modern desktop port stack around SDL3, DXVK, OpenAL, FFmpeg, and Linux/macOS packaging. This repository adds a second layer of work: evaluating how much of that same porting effort can survive a browser target and what the minimum viable browser-friendly architecture looks like.

## Relationship to the wider ecosystem

- Upstream GeneralsX remains the main desktop-port project and the broader compatibility baseline.
- TheSuperHackers remains the upstream game-code baseline for stability and compatibility.
- This fork is a targeted investigation branch for browser/WASM feasibility rather than the default end-user distribution path.

## Relevant project docs

- [docs/WORKDIR/support/WASM_BROWSER_SCOPING_2026-07.md](docs/WORKDIR/support/WASM_BROWSER_SCOPING_2026-07.md) — browser/WASM feasibility and boundary analysis
- [docs/WORKDIR/support/WASM_BROWSER_IMPLEMENTATION_LOG.md](docs/WORKDIR/support/WASM_BROWSER_IMPLEMENTATION_LOG.md) — current implementation notes and findings
- [docs/BUILD/LINUX.md](docs/BUILD/LINUX.md) — native Linux baseline workflow
- [docs/BUILD/MACOS.md](docs/BUILD/MACOS.md) — macOS baseline workflow

## Build and validation

The current WASM target is a scoping build. It proves that the selected runtime graph can compile and link; it does not yet produce a playable browser release.

```bash
cmake --preset wasm-emscripten-scope
cmake --build build/wasm-emscripten-scope -j 4
```

Current outputs:

- `build/wasm-emscripten-scope/Generals/GeneralsX.js`
- `build/wasm-emscripten-scope/GeneralsMD/GeneralsXZH.js`

The preset deliberately excludes or bypasses desktop-only pieces, including DX8/DXVK rendering, FFmpeg video, OpenAL, crash dumps, and non-runtime tools. See the implementation log for the current feature cuts and blocker history.

This repository also retains the desktop build infrastructure used to validate the inherited native baseline.

For native validation, see:

- [docs/BUILD/LINUX.md](docs/BUILD/LINUX.md)
- [docs/BUILD/MACOS.md](docs/BUILD/MACOS.md)

## Contribution direction

Contributions should align with the fork's actual purpose:

- Browser/WASM feasibility work
- Toolchain and feature-gating work for Emscripten
- Platform abstraction and backend analysis
- Minimal browser-compatible runtime experiments
- Documentation of blockers and viable cut scopes

This fork is not the place for broad, unrelated desktop-release polish unless it directly serves the browser porting goal.

## Upstream and acknowledgements

- [GeneralsX](https://github.com/fbraz3/GeneralsX) provides the desktop modernization and cross-platform baseline.
- [TheSuperHackers](https://github.com/TheSuperHackers/GeneralsGameCode) provides the primary game-code, compatibility, and preservation foundation.
- [Fighter19's port](https://github.com/Fighter19/CnC_Generals_Zero_Hour), including foundational work by feliwir, remains an important SDL3, DXVK, OpenAL, and FFmpeg reference.

Improvements that belong to the desktop port or general game-code baseline should be proposed upstream where practical. WASM-specific experiments and browser architecture work belong in this fork.

## License

See the [LICENSE](./LICENSE.md) file for details.

EA has not endorsed and does not support this product. All trademarks are the property of their respective owners.
