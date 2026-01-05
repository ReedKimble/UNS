cmake_minimum_required(VERSION 3.20)
project(uns_mcu C)

option(UNS_MCU_BUILD_TESTS "Build the UNS MCU host-side tests" OFF)

add_library(uns_mcu STATIC
    src/uns_mcu_runtime.c)

target_include_directories(uns_mcu
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include)

target_compile_features(uns_mcu PUBLIC c_std_99)

if(UNS_MCU_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
