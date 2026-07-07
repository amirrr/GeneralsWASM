set(GS_OPENSSL FALSE)
set(GAMESPY_SERVER_NAME "server.cnc-online.net")

FetchContent_Declare(
    gamespy
    GIT_REPOSITORY https://github.com/TheAssemblyArmada/GamespySDK.git
    GIT_TAG        07e3d15c500415abc281efb74322ab6d9c857eb8
)

FetchContent_MakeAvailable(gamespy)

if(EMSCRIPTEN)
    # GameSpy SDK only checks Linux/macOS/Windows platform macros.
    # For wasm scope builds, route through its UNIX code path.
    foreach(gs_target
        gscommon gscdkey gshttp gsgp gsgstats gsgt2 gsnatneg gspeer gspinger
        gspt gsqr gsqr2 gssake gssc gsserverbrowsing gswebservices gsvoice2 gschat)
        if(TARGET ${gs_target})
            target_compile_definitions(${gs_target} PUBLIC _UNIX _LINUX __linux__)
        endif()
    endforeach()
endif()
