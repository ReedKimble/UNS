# Python/Pseudocode → UNS Conversion Guide

This note teaches GPTs how to turn imperative sketches (Python or generic pseudocode) into runnable UNS programs that comply with the current runtime (shared Node API + browser IDE, Q16.16 fixed-point, 1–32768 microstates).

## 1. Preparation Checklist

1. **Restate the domain** – list inputs, outputs, invariants, and whether quantities are scalars, UValues, or UStates.
2. **Identify numeric semantics** – remember that all observable numbers become Q16.16 fixed-point. Clamp/scale inputs accordingly and avoid assuming float precision beyond 16 fractional bits.
3. **Pick a microstate count** – default is 8. Override via the `microstates` field when Python arrays imply larger populations.
4. **Choose the right API endpoint** – use `executeProgram` for most conversions; fall back to helper endpoints only for isolated experiments.

## 2. End-to-End Workflow

| Step | Python/Pseudocode Thought Process | UNS Action |
| --- | --- | --- |
| 1 | Parse the sketch, list variables and control flow | Draft `let` bindings, `state` declarations, and helper invocations mirroring that structure |
| 2 | Translate scalar constants/functions | Use `const`, `lift1`, `lift2`, or built-in helpers (`absU`, `powU`, etc.) |
| 3 | Translate array/state manipulations | Decide if data should be a `state` (normalized amplitudes) or `let u = ...` UValue; leverage `state`, `state_range`, `state_from_mask` |
| 4 | Convert conditionals/loops | Replace branching with mask-based blending, `CANCEL`, `MIX`, or composite helper calls (see §3) |
| 5 | Express reads/outputs | Add `read(value | state)` statements or populate the `reads` array in the API payload |
| 6 | Execute | Call `POST /api/v1/runtime/execute` (or `/read`) with the UNS source + optional `microstates` + `reads` |
| 7 | Interpret | Decode results, novels, and diagnostics back into the user’s domain language |

## 3. Mapping Common Constructs

### 3.1 Variables & Assignment

| Python Idea | UNS Pattern |
| --- | --- |
| `x = 0.5` | `let x = const(0.5)` |
| `z = f(x, y)` | `let z = lift2(f, x, y)` where `f` is one of the runtime lift operators (`add`, `sub`, `mul`, `div`, `pow`, etc.) |
| Complex literals (`0.6 + 0.2j`) | `let z = const(0.6 + 0.2i)` |

### 3.2 Collections & States

| Python Idea | UNS Pattern |
| --- | --- |
| Uniform array of length `N` | `state psi = state_range(0, N - 1)` (normalized automatically) |
| Boolean mask slice | `let mask = mask_range(start, end)` or `mask = mask_threshold(value, threshold)` |
| Normalizing arbitrary samples | `let raw = collection(...)` then `state psi = state(raw)` |

### 3.3 Control Flow & Conditionals

UNS lacks imperative branches. Replace them with mask-based interpolation:

| Python Idea | UNS Pattern |
| --- | --- |
| `if cond: a else b` | `let mask = mask_gt(cond, threshold)` then `let mix = MIX(collection(a, b), collection(mask, negU(mask)))` or simply `let blend = addU(mulU(mask, a), mulU(subU(const(1), mask), b))` |
| Loop accumulating sum | Use helper pipelines (`addU`, `meanU`, `densityU`, `MERGE`) on pre-built collections; for fixed small loops, unroll into sequential `let` bindings. |
| Piecewise functions | Build masks for each region and combine via `inject`/`collection` or repeated `MIX` calls. |

### 3.4 Math Library Equivalents

| Python Operation | UNS Equivalent |
| --- | --- |
| `math.sqrt`, `cmath.sqrt` | `lift1(sqrt, u)` or `sqrtU(u)` |
| `math.sin`, `math.cos` | `lift1(sin, u)`, `lift1(cos, u)` |
| Element-wise addition/subtraction | `addU(left, right)`, `subU(left, right)` |
| Division with zero handling | `divU(left, right)` (produces novels when dividing by zero; surface them) |
| Mean/density helpers | `meanU(u, psi)` and `densityU(mask, psi)` require both the UValue (or mask) and the state that provides amplitudes. |

### 3.5 Randomness & Initialization

Python `random()` loops translate into UNS helper seeds:

- Use `uniform_state()`/`psi_uniform()` for unbiased amplitudes.
- Use `delta_state(index)` for deterministic spikes.
- Combine via `MIX` to emulate weighted sampling.

## 4. Example Conversion

**Python sketch**
```python
# avg positive entries minus avg negative entries
def score(samples):
    pos = [x for x in samples if x > 0]
    neg = [x for x in samples if x < 0]
    return mean(pos) - mean(neg)
```

**UNS translation**
```unse
// Assume `samples` already holds a UValue and `samples_state` is its companion state
let zeros = const(0)
let pos_mask = mask_gt(samples, zeros)
let neg_mask = mask_lt(samples, zeros)
let pos_weighted = mulU(samples, pos_mask)
let neg_weighted = mulU(samples, neg_mask)
let signed = addU(pos_weighted, neg_weighted *s -1)
let score = meanU(signed, samples_state)
// `score` is already a scalar; no read() call needed
```
Execution notes:
1. Build/obtain `samples` (UValue) and `samples_state` (UState) earlier in the program—or fetch them via helper endpoints—so that `meanU` receives both arguments it expects.
2. Call `POST /api/v1/runtime/execute` with optional `microstates` reflecting the Python list length.
3. Use the response `result` field (a scalar) to interpret `score`. If `meanU` encountered empty regions it emits Q16.16 zeros; document any such edge cases in your user summary. Only call `read(value | state)` when `value` is a UValue—scalar outputs should be reported directly or, if you truly need to read them, convert them into a UValue first (e.g., `let as_field = const(score)` and read that against a state).

## 5. Execution & Validation Steps

1. **Compile (optional)** – `POST /api/v1/runtime/compile` the generated UNS to catch syntax errors before running.
2. **Execute** – `POST /api/v1/runtime/execute` with fields:
   ```json
   {
     "source": "...UNS program...",
     "microstates": 32,
    "reads": [{"value": "score", "state": "samples_state"}],
    "summary_mode": false,
    "trace_detail": "summary"
   }
   ```
  Set `summary_mode=true` (and optionally `stream_mode=true`) whenever you anticipate a large trace/diagnostic payload; then call `/runtime/export` or `/runtime/import` to retrieve detailed slices without overwhelming the GPT action.
3. **Check novels** – inspect `bindings` previews for any `kind: "novel"` entries (e.g., division by zero). Report them back to the user.
4. **Summarize in domain terms** – translate fixed-point results using `decodeReal = value / 65536` when you need to reason about magnitudes explicitly.

## 6. Tips & Gotchas

- **Scaling factors** – whenever Python code multiplies large floats, consider clamping to avoid Q16.16 overflow (±32767.999). Use `MIX` or manual normalization to keep values bounded.
- **Loop semantics** – UNS encourages vectorized reasoning. Replace iterative updates with helper compositions or stateless bindings. When a true loop is unavoidable, unroll a small fixed count or describe the limitation to the user.
- **State vs. value** – Python arrays used as probability distributions should become `state` bindings, not raw UValues. Always normalize with `state(...)` or `NORM` to honor UNS invariants.
- **Helper parity** – the Node API (`Runtime/api/src/runtime/core.js`) and browser IDE share the same helper set, so once your conversion works in one environment it is valid everywhere.

Use this document whenever you need to reinterpret imperative sketches into UNS programs, and cite it in user explanations so they understand how their familiar constructs map onto UNS semantics.
