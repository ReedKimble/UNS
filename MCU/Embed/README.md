# Vendor-Neutral Embedded Port

Use this directory as a template for traditional MCU vendor toolchains (STM32CubeIDE, Keil MDK, IAR, MPLAB X, etc.).

## Goals

- Provide CMSIS-style drivers for timers, RNG, and memory required by UNS.
- Offer ready-made project files for at least one Cortex-M4F (STM32F4) and one Cortex-M0+ reference board.
- Keep the shared runtime untouched—only add glue for interrupts, DMA, or custom math accelerators.

## Integration Checklist

1. Copy the contents of `../shared/include` and `../shared/src` into your project or add them as external sources.
2. Define target-specific macros (e.g., `UNS_MCU_ENABLE_COMPLEX_PHASE=0` if the FPU is missing) in your compiler flags.
3. Implement `uns_platform.c` to map logging and timing to vendor HAL calls.
4. Use the unit tests on host first; then run hardware-in-the-loop tests via SWD/JTAG.

## Deliverables

- `STM32F4/` – CubeIDE project with HAL drivers and example tasks.
- `NXP_LPC55/` – MCUXpresso project showing low-power scheduling.
- `Docs/Porting.md` – instructions for creating additional ports.

Populate these subfolders incrementally as the shared runtime solidifies.
