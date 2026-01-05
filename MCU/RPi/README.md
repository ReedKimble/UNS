# Raspberry Pi Port

The Raspberry Pi targets sit between desktop and MCU environments. We treat them like constrained Linux boards that can still leverage POSIX threads, SIMD (NEON), and larger memory.

## Tooling

- Install the standard Raspberry Pi OS toolchain (`build-essential`, `cmake`, `ninja`).
- Cross-compile from a PC using `aarch64-linux-gnu-gcc` if desired.

## Build Outline

1. Create a CMake project that adds `../shared` as a subdirectory.
2. Enable NEON optimizations by defining `-DUNS_MCU_USE_NEON=1` (implement support later in the shared math layer).
3. Provide a CLI wrapper (e.g., `uns_rpi_shell`) that reads UNS programs via stdin and prints results.

## Integration Ideas

- SPI/I2C bridges so the Pi can orchestrate additional MCU UNS nodes.
- Systemd service to expose a REST or WebSocket API mirroring the main runtime.
- Benchmark harness comparing Pi fixed-point throughput to desktop builds.

Even though the Pi has far more resources, keeping it within the MCU folder ensures we hold ourselves to the same deterministic, fixed-point semantics needed for smaller boards.
