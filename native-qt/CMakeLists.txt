cmake_minimum_required(VERSION 3.20)
project(MatterPackr VERSION 3.0.10 LANGUAGES CXX)

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

# Optional system libarchive / zlib if available
find_package(ZLIB QUIET)

set(SOURCES
    src/main.cpp
    src/MainWindow.cpp
    src/ArchiveTableView.cpp
    src/ArchiveModel.cpp
    src/CompressionEngine.cpp
    src/OptionsDialog.cpp
    src/AboutDialog.cpp
    src/UpdateManager.cpp
    src/CheckOutDialog.cpp
    src/FavoritesDialog.cpp
    resources.qrc
)

if(WIN32)
    list(APPEND SOURCES MatterPackr.rc)
endif()

set(HEADERS
    src/MainWindow.h
    src/ArchiveTableView.h
    src/ArchiveModel.h
    src/CompressionEngine.h
    src/OptionsDialog.h
    src/AboutDialog.h
    src/UpdateManager.h
    src/CheckOutDialog.h
    src/FavoritesDialog.h
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
endif()
