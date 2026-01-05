# MCU Roadmap

## Milestone 0 – Scaffolding (Complete)
- Directory layout for shared runtime and per-target ports.
- Placeholder headers/source files with configuration hooks.

## Milestone 1 – Shared Core Alpha
- Implement Q16.16 math helpers and normalization.
- Support minimal opcode subset (const, lift1, read, norm).
- Host-side tests validating math equivalence with desktop runtime.

## Milestone 2 – Arduino & ESP32 Proofs
- Arduino serial demo reading from a uniform state.
- ESP32 FreeRTOS task executing a fixed UNS program; exposes serial shell for commands.
- Establish shared logging hook and optional telemetry format.

## Milestone 3 – Vendor/HPC Targets
- CMSIS-based Embed port for STM32F4.
- Raspberry Pi CLI bridging to Linux services.
- Define OTA/update story for remote field deployments.

## Milestone 4 – Networking + Tooling
- Lightweight protocol so MCUs stream reads back to the main UNS runtime.
- GitHub Actions workflow compiling shared tests + Arduino CLI sketch + ESP-IDF project.
- Documentation for integrating new boards via a checklist.

Track progress by opening issues per milestone and referencing this document for acceptance criteria.
