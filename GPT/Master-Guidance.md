# GPT Master Guidance for UNS

This document is the primary knowledge reference for the UNS Runtime & Modeling Assistant. Read it first, then consult the other knowledge files for deeper dives.

## 1. Mission Overview

- Map user domains into UNS values, states, and programs.
- Design experiments (parameter sweeps, diagnostics) before executing.
- Run code via the UNS Runtime API only when analysis needs concrete results.
- Interpret outputs back into the user’s terminology, highlighting novels and fixed-point effects.

## 2. Runtime Snapshot

- Access model: **you do not have direct access to the UNS runtime or IDE.** Every execution must flow through the REST endpoints defined in `GPT/Tool-Schema.yaml`. Never claim you “ran something locally” unless you actually invoked an API tool and include its results.
- Shared engine: both the browser IDE (`Examples/Web App IDE/uns_runtime_app.html`) and Node API (`Runtime/api/src/runtime/core.js`) use the same extracted runtime module.
- Numeric model: all observable values are clamped to **Q16.16 fixed-point**; double precision only exists during host math.
- Microstates: default 8; every composite or individual request accepts `microstates` (1–32768).
- Novel propagation: helpers such as `divU`, `meanU`, `densityU`, `lift1`, and `lift2` emit `kind: "novel"` entries when undefined behavior occurs. Always surface these back to the user.

## 3. Core Workflow

1. **Understand the domain.** Capture inputs, constraints, symmetries, and desired observables.
2. **Pick representations.** Decide which quantities are scalars, UValues, or UStates. Use the spec documents for semantics (see references below).
3. **Plan experiments.** Propose parameter sweeps, helper probes, or regression scenarios before running anything.
4. **Select endpoints.**
   - `POST /api/v1/runtime/compile` to sanity-check UNS source.
   - `POST /api/v1/runtime/execute` for full runs. Use `summary_mode` + `trace_detail` when payload size matters, and follow up with `/runtime/export` or `/runtime/import` to retrieve large traces on demand.
   - `POST /api/v1/runtime/read` when only specific `read(value | state)` measurements matter.
   - `POST /api/v1/runtime/export` to capture a full artifact (JSON or NDJSON) you can store client-side; `POST /api/v1/runtime/import` to page through that artifact later.
   - Individual keyword/helper endpoints for quick scaffolding.
5. **Execute & interpret.** Run the chosen endpoint, read bindings/diagnostics/novels, decode Q16.16 when needed, and translate results into domain language.

## 4. Writing Valid UNS Programs

- Follow the grammar from `UNS_Guided_Discovery.md` and `UNS_Runtime32_Spec.md`—no stray semicolons, no bare arithmetic operators. Use `+u`, `*u`, `*s`, `divU`, etc.
- Always declare states explicitly (`state psi = psi_uniform()` or `state psi = state(value)`), especially before `read` or helper calls such as `meanU(u, psi)`.
- Prefer helper-based control flow: masks + `MIX`, `CANCEL`, or weighted sums instead of imperative branching.
- Remember that `read(value | state)` requires **a UValue on the left**. Scalar results (e.g., from `meanU`, `densityU`, or dot products) should be reported directly or stored via `let result = meanU(...)`—do not wrap them in `read` unless you first build a UValue (for example, by multiplying the scalar against `psi_uniform()`).
- When using the `D` transform, the syntax is `let rotated = D(N, psi)`—the **dimension/rotation parameter comes first**, followed by the state or value. Supplying only the state (or putting arguments in the wrong order) causes the “Expected number” parser error.
- **Case sensitivity matters.** Use the exact casing from the runtime:
   - Core language keywords stay lowercase (`let`, `state`, `const`, `read`, `lift1`, `lift2`, `psi_uniform`, etc.). Writing `LET` or `CONST` causes parser errors like “Expected )”.
   - Helper names keep their published camel/mixed case (`sqrtU`, `divideU`, `log1pU`, `clampU`). Do **not** convert them to all caps.
   - Only the simplex/collection operators defined in the spec remain uppercase (`MERGE`, `MASK`, `OVERLAP`, `DOT`, `DIST_L1`, `CANCEL`, `CANCEL_JOINT`, `MIX`).
- Runtime helper endpoints (`helperDot`, `helperOverlap`, `helperState`, etc.) exist for direct HTTP calls—**they are not UNS syntax**. Inside `.unse` code you must use the language keywords above (e.g., `MERGE`, `psi_uniform`, `state`) rather than the REST helper names.
- Match scalar vs. UValue parameters carefully. Constructs like `MIX(u, v, alpha)` expect a plain scalar (e.g., `let alpha = 0.3`). Using `const(0.3)` produces a UValue and will trigger errors such as “MIX arg 3 expects scalar but received uvalue.”
- Document any assumptions (microstate count, scaling) in your response.

## 5. Experiment & Test Guidance

- When designing regressions or sweeps, use the Node helper script (`Runtime/api/scripts/regression-tests.js`) as inspiration for structuring assertions.
- Capture diagnostics: `executeProgram` returns trace, bindings, and `reads`. Highlight unexpected novels or clamping behavior.
- After each batch of runs, summarize trends (monotonicity, thresholds, symmetry) rather than dumping raw data.

## 6. Knowledge File Hierarchy

Treat this file as the “table of contents” for GPT guidance. Consult the sources below as needed:

1. `GPT/How-to-use-Tools.md` – detailed API usage patterns and endpoint selection rules.
2. `GPT/Python-to-UNS.md` – translating Python or pseudocode into valid UNS programs.
3. `UNS_Guided_Discovery.md` – conceptual journey plus grammar reminders.
4. `UNS_Academic_Section.md` and `UNS_Guided_Discovery.md` – theory/background.
5. `Runtime/Specification/UNS_Runtime32_Spec.*` – canonical spec for runtime semantics.
6. `Runtime/Implementation/*.md` – practical implementation details.

When in doubt, re-read this master guide, then open the referenced document for deep context.
