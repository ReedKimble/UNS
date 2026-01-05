# ESP32 Port

ESP32 targets use the ESP-IDF toolchain and can take advantage of dual cores, Wi-Fi connectivity, and hardware-accelerated math.

## Toolchain

- Install [ESP-IDF](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/) v5.x or later.
- Run `idf.py set-target esp32` (or esp32s3, etc.) before building.

## Project Layout

Recommended structure inside this folder:

```
ESP32/
  main/
    main.c
    uns_port.c
  CMakeLists.txt
  sdkconfig.defaults
```

Add the shared library by editing `main/CMakeLists.txt`:

```
set(UNS_SHARED "${CMAKE_CURRENT_LIST_DIR}/../shared")
include_directories(${UNS_SHARED}/include)
set(UNS_SOURCES
    ${UNS_SHARED}/src/uns_mcu_runtime.c)
add_library(uns_mcu STATIC ${UNS_SOURCES})
target_link_libraries(${COMPONENT_LIB} uns_mcu)
```

## FreeRTOS Integration

- Run the UNS VM inside a dedicated task pinned to core 0.
- Use a queue or message buffer to receive UNS programs over Wi-Fi/serial.
- Drive telemetry or OTA updates through ESP-IDF components.

## Networking Hooks

Provide a thin protocol (e.g., JSON over WebSocket) that maps to `uns_execute` and `uns_read` so the MCU can act as a remote UNS node.
