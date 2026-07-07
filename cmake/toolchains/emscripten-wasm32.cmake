# Minimal Emscripten toolchain shim for GeneralsX WASM scoping.
# This is intentionally lightweight and delegates to the system Emscripten toolchain.

set(_emscripten_system_toolchain "/usr/share/emscripten/cmake/Modules/Platform/Emscripten.cmake")

if(DEFINED ENV{EMSCRIPTEN})
    set(_emscripten_candidate "$ENV{EMSCRIPTEN}/cmake/Modules/Platform/Emscripten.cmake")
    if(EXISTS "${_emscripten_candidate}")
        set(_emscripten_system_toolchain "${_emscripten_candidate}")
    endif()
endif()

if(NOT EXISTS "${_emscripten_system_toolchain}")
    message(FATAL_ERROR "Emscripten toolchain not found. Install emscripten and/or set EMSCRIPTEN env var.")
endif()

include("${_emscripten_system_toolchain}")

set(CMAKE_CROSSCOMPILING_EMULATOR "/usr/bin/node;--experimental-wasm-threads" CACHE STRING "Node emulator for CMake try-run under Emscripten")
set(SAGE_WASM_SCOPING ON CACHE BOOL "Enable WASM scoping mode")