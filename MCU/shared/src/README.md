# Shared MCU Source Skeleton

This folder will contain the portable implementation of the MCU runtime. Break the code into small files so platforms can selectively include features:

- `uns_math.c` – fixed-point helpers, saturation, complex multiply/add.
- `uns_state.c` – normalization, mask helpers, and deterministic microstate shuffles.
- `uns_read.c` – implementation of `uns_read` plus accumulation safety checks.
- `uns_vm.c` – compact instruction interpreter with an opcode table matched to MCU needs.
- `uns_platform.c` – weak hooks for logging, timing, and memory; platforms override as needed.

Each file should avoid static/global buffers unless guarded by macros in `uns_mcu_config.h`. The default build targets C99 so that both Arduino/AVR and ESP-IDF projects can compile without extensions.
