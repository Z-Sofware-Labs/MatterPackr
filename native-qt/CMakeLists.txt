cmake_minimum_required(VERSION 3.20)
project(MatterPackr VERSION 3.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 6.2 REQUIRED COMPONENTS
    Core
    Gui
    Widgets
    Concurrent
)

# Optional system libarchive / zlib if available
find_package(ZLIB QUIET)

set(SOURCES
    src/main.cpp
    src/MainWindow.cpp
    src/ArchiveModel.cpp
    src/CompressionEngine.cpp
    src/OptionsDialog.cpp
)

set(HEADERS
    src/MainWindow.h
    src/ArchiveModel.h
    src/CompressionEngine.h
    src/OptionsDialog.h
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
)

if(ZLIB_FOUND)
    target_link_libraries(MatterPackr PRIVATE ZLIB::ZLIB)
    target_compile_definitions(MatterPackr PRIVATE HAVE_ZLIB)
endif()

if(WIN32)
    set_target_properties(MatterPackr PROPERTIES
        WIN32_EXECUTABLE TRUE
    )
elseif(APPLE)
    set_target_properties(MatterPackr PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_BUNDLE_NAME "MatterPackr"
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.matterpackr.archiver"
    )
    # macOS 14+ / Xcode 15+ deprecated AGL.framework; create a dummy target/link flag to satisfy legacy Qt6.6 CMake files
    target_link_options(MatterPackr PRIVATE "-Wl,-needed_framework,OpenGL")
endif()
