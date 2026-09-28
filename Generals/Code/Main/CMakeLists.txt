add_executable(g_generals WIN32)

# Use a binary name that doesn't conflict with original game.
# GeneralsX @build BenderAI 15/02/2026 Linux branding update
# GeneralsX @build fbraz3 19/08/2026 Standardize executable name across all platforms
set_target_properties(g_generals PROPERTIES OUTPUT_NAME GeneralsX)

# GeneralsX @build BenderAI 10/03/2026 Windows-specific libraries
if(WIN32)
    target_link_libraries(g_generals PRIVATE
        binkloader
        comctl32
        d3d8
        dinput8
        dxguid
        imm32
        milesloader
        vfw32
        winmm
    )
endif()

# Cross-platform core libraries
target_link_libraries(g_generals PRIVATE
    d3dx8
    g_gameengine
    g_gameenginedevice
    gi_always
)

# Linux SDL3 windowing/input
# GeneralsX @build BenderAI 11/02/2026
if(SAGE_USE_SDL3)
    target_link_libraries(g_generals PRIVATE sdl3lib)
endif()

# WASM persistence + runtime exports (browser bring-up)
# GeneralsX @build 07/07/2026 Enable IDBFS so game data persists across reloads
# and export the runtime methods used by the browser launcher.
if(EMSCRIPTEN)
    target_link_options(g_generals PRIVATE
        "-lidbfs.js"
        "-sFORCE_FILESYSTEM=1"
        # GeneralsX @build 07/07/2026 Browser bring-up. The generated loader in this
        # emscripten version does not auto-invoke main(); the launcher calls main
        # explicitly via ccall('main', ...). Keep ccall/cwrap + FS/IDBFS exported.
        # Do NOT export 'callMain' (undefined in this codegen -> load-time crash) or
        # '_main' via EXPORTED_FUNCTIONS (name-mangled to __main_argc_argv -> link error).
        "-sEXPORTED_FUNCTIONS=['_wasm_start_game','_malloc','_free']"
        "-sEXPORTED_RUNTIME_METHODS=['FS','IDBFS','addRunDependency','removeRunDependency','ccall','cwrap']"
        # GeneralsX @build 07/07/2026 Forcing the full main() call graph surfaces
        # platform symbols not yet ported to wasm (Bink video, some wide-char libc).
        # Tolerate these during bring-up so the module links and main() can run;
        # missing symbols become runtime aborts we can diagnose incrementally.
        "-sERROR_ON_UNDEFINED_SYMBOLS=0"
        # GeneralsX @build 07/07/2026 The game mounts ~900MB of BIG assets into the
        # in-memory filesystem plus its own heap. Default 16MB heap OOMs immediately.
        # Allow the heap to grow and raise the maximum so asset loading can proceed.
        "-sALLOW_MEMORY_GROWTH=1"
        "-sINITIAL_MEMORY=512MB"
        "-sMAXIMUM_MEMORY=4GB"
    )
endif()

# TODO Originally referred to build host and user, replace with git info perhaps?
file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/GeneratedVersion.h
"#pragma once

#define VERSION_LOCALBUILDNUM 0
#define VERSION_BUILDUSER \"\"
#define VERSION_BUILDLOC \"\"
"
)

# Based on original binary values for these variables.
if (IS_VS6_BUILD)
file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/BuildVersion.h
"#pragma once

#define VERSION_MAJOR 1
#define VERSION_MINOR 7
#define VERSION_BUILDNUM 601
"
)
else()
file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/BuildVersion.h
"#pragma once

#define VERSION_MAJOR 1
#define VERSION_MINOR 8
#define VERSION_BUILDNUM 601
"
)
endif()

if(MSVC)
    target_link_options(g_generals PRIVATE "/NODEFAULTLIB:libci.lib")
endif()

target_include_directories(g_generals PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_BINARY_DIR}
    ${CMAKE_BINARY_DIR}/Code/Libraries
)

target_sources(g_generals PRIVATE
    $<$<BOOL:${WIN32}>:WinMain.cpp>
    $<$<BOOL:${WIN32}>:WinMain.h>
    # Linux SDL3 entry point
    $<$<NOT:$<BOOL:${WIN32}>>:SDL3Main.cpp>
    # Linux stubs
    $<$<NOT:$<BOOL:${WIN32}>>:LinuxStubs.cpp>
)

# RC files are optional for MinGW builds
# Icon: LoadIcon() handles missing resource gracefully (uses default system icon)
# Manifest: DPI awareness metadata (nice to have but not essential)
# TYPELIB: Broken (0 bytes) and causes windres memory exhaustion errors
if(MSVC)
    # VS2005 and later adds default manifest, we need to turn it off to prevent conflict with custom manifest
    if(NOT IS_VS6_BUILD)
        target_link_options(g_generals PRIVATE
            "/MANIFEST:NO"
        )
    endif()

    target_sources(g_generals PRIVATE
        RTS.RC
    )
endif()

# Strip debug symbols to separate file for MinGW Release builds
# This creates generalsv${RTS_BUILD_OUTPUT_SUFFIX}.exe.debug (similar to MSVC .pdb files)
if(MINGW AND COMMAND add_debug_strip_target)
    add_debug_strip_target(g_generals)
endif()
