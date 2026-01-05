# Host-Side Tests

Place lightweight unit tests here so every change to the shared runtime can be validated on a development PC before flashing MCU hardware.

Recommended approach:

1. Use CMake with `add_subdirectory(shared)` so the same code is compiled for the host.
2. Link against a tiny assertion framework (Unity, minunit, or doctest for C++).
3. Cover math primitives, normalization, readout accuracy, and deterministic instruction execution.
4. Run these tests in CI (GitHub Actions) on Windows + Linux to catch platform-specific regressions.

Example structure:

```
MCU/shared/tests/
  CMakeLists.txt
  test_math.c
  test_read.c
  test_vm.c
```

The tests should use deterministic fixtures (static states/values) so results match across toolchains.
