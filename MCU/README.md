# UNS MCU Implementations

This workspace hosts microcontroller-focused builds of the Universal Number Set runtime. It is organized as a shared, platform-neutral library plus thin adapters for specific boards or operating environments.

## Layout

- `shared/` – cross-platform fixed-point math, compact UNS instruction executor, and host-side unit tests.
- `Arduino/` – sketches and PlatformIO/Arduino CLI projects that link against the shared core.
- `ESP32/` – ESP-IDF based builds with Wi-Fi/serial transports and FreeRTOS task wiring.
- `Embed/` – vendor-neutral templates (e.g., STM32, NXP, Nordic) that integrate UNS with CMSIS/HAL stacks.
- `RPi/` – Raspberry Pi bare-metal or Linux-oriented builds that share the MCU constraints but can leverage POSIX services.

## Immediate Goals

1. Define the shared MCU runtime API (headers in `shared/include/`, implementation in `shared/src/`).
2. Provide a portable fixed-point math library and deterministic microstate scheduler.
3. Ship a reference unit-test harness runnable on a development PC to validate every opcode before flashing hardware.
4. Mirror that shared core into each platform folder with the smallest possible glue layer (serial shell, diagnostics, timing helpers).

Each platform directory keeps its own tooling instructions (toolchain install, flashing, debugging) while the shared core stays tool-agnostic. This separation lets us add new boards quickly by reusing the same UNS primitives.
