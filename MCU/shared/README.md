# Shared MCU Runtime

The `shared/` directory contains the platform-neutral core of the UNS runtime. Every board-specific project links against this code so we only maintain the math model once.

## Components

- `include/` – public headers consumed by MCU projects. Defines types, feature flags, and the API surface for feeding UNS instructions/states into the mini VM.
- `src/` – fixed-point math, normalization, lift operators, instruction executor, and portability shims (timing, memory hooks, logging callbacks).
- `tests/` – host-side unit tests that compile with a desktop compiler (MSVC/Clang/GCC). These tests validate math and VM behavior before deploying to an embedded target.

## Build Expectations

1. The shared library must compile as C99 (or later) with no dynamic allocation unless the host provides hooks.
2. All math uses Q16.16 fixed-point with helper macros for overflow detection.
3. Feature flags in `uns_mcu_config.h` allow per-target trimming (e.g., disable `LIFT2` or `D_TRANSFORM` to save flash).
4. The unit tests run via CTest/CMake or a lightweight runner such as Unity/ceedling.

## Next Steps

- Flesh out the headers with the finalized API once the MCU opcode subset is chosen.
- Implement the math helpers incrementally, mirroring the desktop runtime semantics where practical.
- Stand up the host test harness and wire it into CI to catch regressions for every platform simultaneously.
