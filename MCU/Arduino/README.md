# Arduino Port

This folder hosts sketches and PlatformIO projects that embed the shared UNS MCU runtime on Arduino-class boards (AVR, SAMD, RP2040, etc.).

## Tooling

- Install [Arduino CLI](https://arduino.github.io/arduino-cli/latest/installation/) or use PlatformIO.
- Ensure the board package for your target (e.g., `arduino:avr`, `arduino:samd`, `rp2040`) is installed.

## Linking the Shared Core

1. Add `../shared/include` to your include path.
2. Compile the C sources under `../shared/src` as part of the sketch or build them as a static library (`libuns_mcu.a`).
3. Define `UNS_MCU_DEFAULT_MICROSTATES`, `UNS_MCU_ENABLE_LIFT2`, etc., before including `uns_mcu_runtime.h` to tailor the footprint.

## Example Sketch Plan

- `examples/min_read/min_read.ino` – demonstrates initializing a state and running `uns_read` with serial output.
- `examples/d_transform/d_transform.ino` – optional if the feature is enabled at compile time.

## Serial Diagnostics

Use `Serial.print` inside the platform logging hook (override `UNS_MCU_LOG_CALLBACK`) to surface diagnostics during development. Keep logging disabled in production builds to conserve flash.
