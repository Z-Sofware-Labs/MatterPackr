cmake_minimum_required(VERSION 3.20)
project(MatterPackr VERSION 3.1.4 LANGUAGES C CXX)

include(CTest)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(MSVC)
    add_compile_options(/utf-8 /O2 /Oi /Ot /MP)
else()
    add_compile_options(-O3 -fno-math-errno -fomit-frame-pointer)
endif()

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 6.2 REQUIRED COMPONENTS
    Core
    Gui
    Widgets
    Concurrent
    Network
    Svg
)

include(FetchContent)

# Newer CMake (4.x) rejects third-party projects declaring cmake_minimum_required < 3.5.
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)

option(MATTERPACKR_USE_SYSTEM_LIBARCHIVE
       "Use a preinstalled libarchive instead of fetching the pinned source"
       OFF)

if(WIN32)
    set(MATTERPACKR_ENABLE_7Z_DEFAULT ON)
else()
    # Experimental on Unix: builds the 7-Zip SDK with the portable file set.
    set(MATTERPACKR_ENABLE_7Z_DEFAULT ON)
endif()
option(MATTERPACKR_ENABLE_7Z
       "Fetch the pinned 7-Zip SDK for encrypted 7Z creation"
       ${MATTERPACKR_ENABLE_7Z_DEFAULT})

if(WIN32 AND NOT MINGW)
    # On Windows MSVC/Clang-cl, always fetch a clean static zlib to ensure ABI compatibility and deflate decompression
    unset(ZLIB_FOUND CACHE)
    unset(ZLIB_LIBRARY CACHE)
    unset(ZLIB_LIBRARIES CACHE)
    unset(ZLIB_INCLUDE_DIR CACHE)
    unset(ZLIB_INCLUDE_DIRS CACHE)
    unset(FIND_PACKAGE_MESSAGE_DETAILS_ZLIB CACHE)
    set(ZLIB_FOUND FALSE)
else()
    find_package(ZLIB QUIET)
endif()

if(NOT ZLIB_FOUND AND MINGW)
    get_filename_component(MATTERPACKR_MINGW_BIN
        "${CMAKE_CXX_COMPILER}" DIRECTORY)
    get_filename_component(MATTERPACKR_MINGW_ROOT
        "${MATTERPACKR_MINGW_BIN}/.." ABSOLUTE)
    find_path(ZLIB_INCLUDE_DIR zlib.h
        HINTS "${MATTERPACKR_MINGW_ROOT}/x86_64-w64-mingw32/include")
    find_library(ZLIB_LIBRARY NAMES z zlib
        HINTS "${MATTERPACKR_MINGW_ROOT}/x86_64-w64-mingw32/lib")
    if(ZLIB_INCLUDE_DIR AND ZLIB_LIBRARY)
        set(ZLIB_FOUND TRUE CACHE BOOL "ZLIB found in the active MinGW toolchain" FORCE)
        if(NOT TARGET ZLIB::ZLIB)
            add_library(ZLIB::ZLIB UNKNOWN IMPORTED)
            set_target_properties(ZLIB::ZLIB PROPERTIES
                IMPORTED_LOCATION "${ZLIB_LIBRARY}"
                INTERFACE_INCLUDE_DIRECTORIES "${ZLIB_INCLUDE_DIR}")
        endif()
    endif()
endif()

if(NOT ZLIB_FOUND)
    set(ZLIB_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
    set(SKIP_INSTALL_ALL ON CACHE BOOL "" FORCE)
    FetchContent_Declare(
        zlib
        URL https://github.com/madler/zlib/releases/download/v1.3.1/zlib-1.3.1.tar.gz
        URL_HASH SHA256=9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    FetchContent_MakeAvailable(zlib)
    set(ZLIB_FOUND TRUE CACHE BOOL "ZLIB fetched via FetchContent" FORCE)
    set(ZLIB_INCLUDE_DIR "${zlib_SOURCE_DIR};${zlib_BINARY_DIR}" CACHE PATH "ZLIB include dir" FORCE)
    set(ZLIB_INCLUDE_DIRS "${zlib_SOURCE_DIR};${zlib_BINARY_DIR}" CACHE PATH "ZLIB include dirs" FORCE)
    if(TARGET zlibstatic)
        set(ZLIB_LIBRARY zlibstatic CACHE STRING "ZLIB library" FORCE)
        set(ZLIB_LIBRARIES zlibstatic CACHE STRING "ZLIB libraries" FORCE)
        if(NOT TARGET ZLIB::ZLIB)
            add_library(ZLIB::ZLIB ALIAS zlibstatic)
        endif()
    elseif(TARGET zlib)
        set(ZLIB_LIBRARY zlib CACHE STRING "ZLIB library" FORCE)
        set(ZLIB_LIBRARIES zlib CACHE STRING "ZLIB libraries" FORCE)
        if(NOT TARGET ZLIB::ZLIB)
            add_library(ZLIB::ZLIB ALIAS zlib)
        endif()
    endif()
    if(WIN32)
        set(ZLIB_WINAPI OFF CACHE INTERNAL "")
        set(WITHOUT_ZLIB_DLL ON CACHE INTERNAL "")
        set(ZLIB_DLL OFF CACHE INTERNAL "")
    endif()
endif()

if(MATTERPACKR_USE_SYSTEM_LIBARCHIVE)
    find_path(LIBARCHIVE_INCLUDE_DIR archive.h REQUIRED)
    find_library(LIBARCHIVE_LIBRARY NAMES archive libarchive REQUIRED)
    add_library(MatterPackr::Archive UNKNOWN IMPORTED)
    set_target_properties(MatterPackr::Archive PROPERTIES
        IMPORTED_LOCATION "${LIBARCHIVE_LIBRARY}"
        INTERFACE_INCLUDE_DIRECTORIES "${LIBARCHIVE_INCLUDE_DIR}"
    )
else()
    set(ENABLE_ZLIB ON CACHE BOOL "" FORCE)
    set(ENABLE_TEST OFF CACHE BOOL "" FORCE)
    set(ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
    set(ENABLE_WERROR OFF CACHE BOOL "" FORCE)
    set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
    set(ENABLE_NETTLE OFF CACHE BOOL "" FORCE)
    set(ENABLE_OPENSSL OFF CACHE BOOL "" FORCE)
    set(ENABLE_LIBXML2 OFF CACHE BOOL "" FORCE)
    set(ENABLE_EXPAT OFF CACHE BOOL "" FORCE)
    set(ENABLE_PCREPOSIX OFF CACHE BOOL "" FORCE)
    if(WIN32)
        # Windows CRT provides standard wide-character functions as intrinsics.
        # Pre-seed cache to prevent CMake's CheckFunctionExists failing on MSVC intrinsics.
        set(HAVE_WCSCMP 1 CACHE INTERNAL "Have function wcscmp")
        set(HAVE_WCSCPY 1 CACHE INTERNAL "Have function wcscpy")
        set(HAVE_WCSLEN 1 CACHE INTERNAL "Have function wcslen")
        set(HAVE_WMEMCMP 1 CACHE INTERNAL "Have function wmemcmp")
        set(HAVE_WMEMCPY 1 CACHE INTERNAL "Have function wmemcpy")
        set(HAVE_WMEMMOVE 1 CACHE INTERNAL "Have function wmemmove")
        set(HAVE_WCRTOMB 1 CACHE INTERNAL "Have function wcrtomb")
        set(HAVE_WCTOMB 1 CACHE INTERNAL "Have function wctomb")
    endif()
    FetchContent_Declare(
        libarchive
        URL https://github.com/libarchive/libarchive/releases/download/v3.7.7/libarchive-3.7.7.tar.gz
        URL_HASH SHA256=4cc540a3e9a1eebdefa1045d2e4184831100667e6d7d5b315bb1cbc951f8ddff
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    FetchContent_MakeAvailable(libarchive)
    target_compile_definitions(archive_static INTERFACE LIBARCHIVE_STATIC)
    if(WIN32)
        target_compile_definitions(archive_static PRIVATE
            HAVE_WCSCMP=1
            HAVE_WCSCPY=1
            HAVE_WCSLEN=1
            HAVE_WMEMCMP=1
            HAVE_WMEMCPY=1
            HAVE_WMEMMOVE=1
            HAVE_WCRTOMB=1
            HAVE_WCTOMB=1
        )
    endif()
    add_library(MatterPackr::Archive ALIAS archive_static)
endif()

find_path(LIBZIP_INCLUDE_DIR zip.h)
find_library(LIBZIP_LIBRARY NAMES zip libzip)
if(LIBZIP_INCLUDE_DIR AND LIBZIP_LIBRARY)
    set(MATTERPACKR_HAS_LIBZIP TRUE)
endif()

set(SOURCES
    src/main.cpp
    src/MainWindow.cpp
    src/ArchiveBackend.cpp
    src/SevenZipBackend.cpp
    src/ArchiveTableView.cpp
    src/ArchiveModel.cpp
    src/CompressionEngine.cpp
    src/OptionsDialog.cpp
    src/AboutDialog.cpp
    src/UpdateManager.cpp
    src/CheckOutDialog.cpp
    src/NewArchiveDialog.cpp
    src/FavoritesDialog.cpp
    src/PasswordPromptDialog.cpp
    resources.qrc
)

if(WIN32)
    list(APPEND SOURCES MatterPackr.rc)
endif()

set(HEADERS
    src/MainWindow.h
    src/ArchiveBackend.h
    src/ArchiveTableView.h
    src/ArchiveModel.h
    src/CompressionEngine.h
    src/OptionsDialog.h
    src/AboutDialog.h
    src/UpdateManager.h
    src/CheckOutDialog.h
    src/NewArchiveDialog.h
    src/FavoritesDialog.h
    src/PasswordPromptDialog.h
)

add_executable(MatterPackr
    ${SOURCES}
    ${HEADERS}
)

target_link_libraries(MatterPackr PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Concurrent
    Qt6::Network
    Qt6::Svg
)

if(ZLIB_FOUND)
    target_link_libraries(MatterPackr PRIVATE ZLIB::ZLIB)
    target_compile_definitions(MatterPackr PRIVATE HAVE_ZLIB)
endif()

target_link_libraries(MatterPackr PRIVATE MatterPackr::Archive)
target_compile_definitions(MatterPackr PRIVATE MATTERPACKR_HAS_LIBARCHIVE)
if(WIN32)
    target_compile_definitions(MatterPackr PRIVATE LIBARCHIVE_STATIC)
endif()

if(MATTERPACKR_HAS_LIBZIP)
    target_include_directories(MatterPackr PRIVATE ${LIBZIP_INCLUDE_DIR})
    target_link_libraries(MatterPackr PRIVATE ${LIBZIP_LIBRARY})
    target_compile_definitions(MatterPackr PRIVATE MATTERPACKR_HAS_LIBZIP)
endif()

if(MATTERPACKR_ENABLE_7Z)
    FetchContent_Declare(
        sevenzip_sdk
        GIT_REPOSITORY https://github.com/ip7z/7zip.git
        GIT_TAG b88c6bc09339de32f7d18bbab900686b244f42ba
        GIT_SHALLOW TRUE
    )
    FetchContent_MakeAvailable(sevenzip_sdk)
    file(GLOB_RECURSE MATTERPACKR_7Z_SDK_SOURCES CONFIGURE_DEPENDS
        "${sevenzip_sdk_SOURCE_DIR}/CPP/Common/*.cpp"
        "${sevenzip_sdk_SOURCE_DIR}/CPP/Windows/*.cpp"
        "${sevenzip_sdk_SOURCE_DIR}/CPP/7zip/Common/*.cpp"
        "${sevenzip_sdk_SOURCE_DIR}/CPP/7zip/Archive/Common/*.cpp"
        "${sevenzip_sdk_SOURCE_DIR}/CPP/7zip/Archive/7z/*.cpp"
        "${sevenzip_sdk_SOURCE_DIR}/CPP/7zip/Compress/*.cpp"
        "${sevenzip_sdk_SOURCE_DIR}/CPP/7zip/Crypto/*.cpp"
        "${sevenzip_sdk_SOURCE_DIR}/C/*.c"
    )
    list(FILTER MATTERPACKR_7Z_SDK_SOURCES EXCLUDE REGEX
        ".*/(7zVersion\\.rc|resource\\.rc)$")
    list(FILTER MATTERPACKR_7Z_SDK_SOURCES EXCLUDE REGEX
        ".*/C/Util/.*")
    # Exclude all DLL exports/entry points: DllExports2Compress declares DllMain,
    # and DllExportsCompress duplicates the codec registry (RegisterCodec/RegisterHasher)
    # already defined by CreateCoder.cpp. SevenZipSdkGuids.cpp provides the required GUIDs.
    list(FILTER MATTERPACKR_7Z_SDK_SOURCES EXCLUDE REGEX
        ".*/DllExports[^/]*\\.cpp$")
    list(APPEND MATTERPACKR_7Z_SDK_SOURCES src/SevenZipSdkGuids.cpp)
    if(NOT WIN32)
        # Mirror the Unix source set used by 7-Zip's own makefile.gcc builds:
        # keep only the portable CPP/Windows helpers and drop Win32-only UI/OS files.
        list(FILTER MATTERPACKR_7Z_SDK_SOURCES EXCLUDE REGEX
            ".*/CPP/Windows/.*")
        set(MATTERPACKR_7Z_UNIX_WINDOWS_FILES
            ErrorMsg FileDir FileFind FileIO FileLink FileName
            PropVariant PropVariantConv PropVariantUtils
            Synchronization System SystemInfo TimeUtils)
        foreach(_name IN LISTS MATTERPACKR_7Z_UNIX_WINDOWS_FILES)
            list(APPEND MATTERPACKR_7Z_SDK_SOURCES
                "${sevenzip_sdk_SOURCE_DIR}/CPP/Windows/${_name}.cpp")
        endforeach()
        find_package(Threads REQUIRED)
    endif()
    add_library(MatterPackrSevenZip STATIC
        ${MATTERPACKR_7Z_SDK_SOURCES}
        src/SevenZipSdkFactory.cpp
        src/SevenZipSdkGlobals.cpp
    )
    if(NOT WIN32)
        target_compile_definitions(MatterPackrSevenZip PRIVATE
            _FILE_OFFSET_BITS=64 _LARGEFILE_SOURCE)
        target_compile_options(MatterPackrSevenZip PRIVATE -w)
        target_link_libraries(MatterPackrSevenZip PUBLIC Threads::Threads ${CMAKE_DL_LIBS})
    endif()
    target_include_directories(MatterPackrSevenZip PRIVATE
        ${sevenzip_sdk_SOURCE_DIR}/C
        ${sevenzip_sdk_SOURCE_DIR}/CPP
    )
    target_compile_definitions(MatterPackrSevenZip PUBLIC
        Z7_EXTERNAL_CODECS
        Z7_7Z_SET_PROPERTIES
        MATTERPACKR_HAS_7Z_SDK
    )
    target_link_libraries(MatterPackr PRIVATE MatterPackrSevenZip)
    target_include_directories(MatterPackr PRIVATE
        ${sevenzip_sdk_SOURCE_DIR}/C
        ${sevenzip_sdk_SOURCE_DIR}/CPP
    )
    target_compile_definitions(MatterPackr PRIVATE MATTERPACKR_HAS_7Z_SDK)
endif()

if(BUILD_TESTING)
    add_executable(MatterPackr7zSmoke
        tests/SevenZipSmoke.cpp
        src/ArchiveBackend.cpp
        src/SevenZipBackend.cpp
    )
    target_include_directories(MatterPackr7zSmoke PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
    )
    target_compile_definitions(MatterPackr7zSmoke PRIVATE
        MATTERPACKR_HAS_LIBARCHIVE
    )
    if(WIN32)
        target_compile_definitions(MatterPackr7zSmoke PRIVATE LIBARCHIVE_STATIC)
    endif()
    target_link_libraries(MatterPackr7zSmoke PRIVATE
        Qt6::Core
        Qt6::Gui
        MatterPackr::Archive
    )
    if(MATTERPACKR_ENABLE_7Z)
        target_include_directories(MatterPackr7zSmoke PRIVATE
            ${sevenzip_sdk_SOURCE_DIR}/C
            ${sevenzip_sdk_SOURCE_DIR}/CPP
        )
        target_compile_definitions(MatterPackr7zSmoke PRIVATE MATTERPACKR_HAS_7Z_SDK)
        target_link_libraries(MatterPackr7zSmoke PRIVATE MatterPackrSevenZip)
    endif()
    add_test(NAME MatterPackr7zSmoke COMMAND MatterPackr7zSmoke)
endif()

if(WIN32)
    target_link_libraries(MatterPackr PRIVATE dwmapi)
    set_target_properties(MatterPackr PROPERTIES
        WIN32_EXECUTABLE TRUE
    )
    if(MSVC)
        target_link_options(MatterPackr PRIVATE "$<$<CONFIG:Release>:/OPT:REF;/OPT:ICF>")
    endif()
elseif(APPLE)
    file(GLOB MACOS_RESOURCES "${CMAKE_CURRENT_SOURCE_DIR}/resources/macos/*.icns")
    if(MACOS_RESOURCES)
        set_source_files_properties(${MACOS_RESOURCES} PROPERTIES
            MACOSX_PACKAGE_LOCATION Resources
        )
        target_sources(MatterPackr PRIVATE ${MACOS_RESOURCES})
    endif()

    set_target_properties(MatterPackr PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/Info.plist.in"
        MACOSX_BUNDLE_BUNDLE_NAME "MatterPackr"
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.matterpackr.archiver"
    )
    target_link_libraries(MatterPackr PRIVATE "-framework CoreServices")
    # macOS 14+ / Xcode 15+ deprecated AGL.framework; create a dummy target/link flag to satisfy legacy Qt6.6 CMake files
    target_link_options(MatterPackr PRIVATE "-Wl,-needed_framework,OpenGL")
endif()

# Interprocedural Optimization (LTO)
include(CheckIPOSupported)
check_ipo_supported(RESULT ipo_supported OUTPUT ipo_error)
if(ipo_supported)
    set_property(TARGET MatterPackr PROPERTY INTERPROCEDURAL_OPTIMIZATION_RELEASE TRUE)
    if(MATTERPACKR_ENABLE_7Z)
        set_property(TARGET MatterPackrSevenZip PROPERTY INTERPROCEDURAL_OPTIMIZATION_RELEASE FALSE)
        set_property(TARGET MatterPackr PROPERTY INTERPROCEDURAL_OPTIMIZATION_RELEASE FALSE)
    endif()
endif()
