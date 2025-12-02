# UNS Runtime Overview

The UNS runtime operationalizes the Universal Number Set semantics by pairing a formally defined 32-bit backend with concrete interpreter tooling. This README highlights the architecture, key documents, and execution pipeline so researchers can map the theory to running code.

## Layered Architecture

1. **Abstract Math Layer** – Defines microstates, simplex structures, lifted operators, and readout semantics that make up UNS theory.
2. **Core Language Layer** – Specifies the concrete operator vocabulary (`+u`, `*u`, `read`, `D`, lifted functions, operator extensions) exposed to `.unse` programs.
3. **32-bit Runtime Layer** – Described in `Specification/UNS_Runtime32_Spec.md`, this layer shows how every UNS primitive is represented with signed 32-bit integers (Q16.16 fixed point) so any platform can implement the runtime using only integer arithmetic.

The spec keeps the mathematical model unchanged while guaranteeing that interpreters approximate it faithfully with finite data structures.

## Data Model & Semantics

- **Scalars** use `Word32` (two's-complement) with Q16.16 encoding/decoding helpers.
- **Complex numbers** are `(real, imag)` pairs of `Word32` values; every arithmetic rule (addition, multiplication, division) is expressed in integer form.
- **UValue32 / UState32** are fixed-length arrays of complex slots, one per microstate index. Runtime normalization preserves simplex constraints, with uniform fallbacks when amplitudes zero out.
- **Novel values** (results of undefined classical operations like divide-by-zero) receive globally unique IDs plus provenance `(op, args, microstate)` via a novel table, ensuring traceability.
- **Readout** approximates the formal integral as a weighted sum `∑ f(i) · |psi(i)|²`, keeping the semantics aligned with the definition of `read(f | ψ)`.

## Interpreter / VM Blueprint

`Implementation/UNS_Model_VM_Implementation.md` translates the specification into a concrete stack virtual machine:

- **Heap** stores `UValue32`, `UState32`, and novel entries; handles reference values returned from instructions.
- **Instruction Set** covers scalar pushes, constant construction, arithmetic (`UADD`, `UMUL`, `SSCALE`), lifting hooks, readout, state normalization, dimensional transforms, environment loads/stores, and `HALT`.
- **Compilation Pipeline** (implemented in both CLI and SPA runtimes): tokenizer → parser → lightweight type tagging → opcode emission → VM execution.
- **Normalization & Readout Algorithms** implement the same Q16.16 loops defined in the spec so the VM stays observably consistent with the math.
- **Lifting Libraries** provide unary (`sqrt`, `sin`, `log`, `conj`, …) and binary (`divide`, `pow`, `phaseBlend`, …) helpers that operate per microstate and emit novel records when semantics demand.

## Runtime File Structure

- `Specification/UNS_Runtime32_Spec.md` – Normative reference for the 32-bit backend plus operator-extension invariants. A JSON counterpart captures the same information in a machine-readable form.
- `Implementation/UNS_Model_VM_Implementation.md` – VM plan covering data structures, opcodes, compilation stages, and SPA integration notes.
- `Implementation/UNS_Module_9_Machine_First.md` – Deeper dive into the machine-first perspective that inspired the VM design.
- `api/` – Node/CLI runtime that compiles and executes `.unse` programs using the VM blueprint.
- `Examples/Web App IDE/uns_runtime_app.html` – Browser-based single-page app showcasing the entire toolchain (editing, compiling, running, inspecting heaps, viewing readouts).

## How It Operationalizes UNS

1. **Representation:** Every UNS construct maps to deterministic integer data structures, so the abstract simplex semantics gain a concrete footprint.
2. **Evaluation:** Programs compile to a portable opcode stream interpreted by the stack VM, ensuring lifted operations, readout, and dimensional transforms behave exactly as specified.
3. **Traceability:** Novel values, operator extensions, and readouts carry metadata that links runtime outcomes back to the defining spec sections, making the implementation auditable.
4. **Portability:** Because the backend only assumes signed 32-bit arithmetic, the same design can be reimplemented in any host language, with the provided JS runtimes serving as reference implementations.

Use this document as the starting point when navigating the runtime directory: follow the spec for semantics, the implementation plan for interpreter structure, and the `api` / SPA folders for working code.
