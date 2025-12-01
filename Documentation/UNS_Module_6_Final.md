# **Module 6 — Lifted Operations**

## 1. Narrative Explanation

Earlier modules established what UNS values are and how they are interpreted. Module 6 focuses on **how computations happen**: every runtime helper, operator, or derived function is ultimately a *lifted* version of a classical scalar function. Lifting lets UNS reuse familiar math while keeping microstate structure, dimensional invariance, and novel-value provenance intact. This module explains how lifting works, why it replaces exception-heavy logic with structured results, and how the helper catalog is layered entirely on top of these primitives.

Key goals of this module:

- Precisely define unary and binary lifting.
- Show how universal operators (`+u`, `*u`, `*s`) are thin wrappers on lifted arithmetic.
- Describe how novel values arise, propagate, and remain first-class.
- Document the helper suite now bundled with the runtime (including the recent composite additions such as `atan2U`, `log1pU`, and `clampU`).
- Reinforce that every helper is built from lifts, masks, and previously defined helpers—no bespoke control flow is required.

---

## 2. UNS Definition Layer

### **2.1 Lifting Basics**

Given a scalar function \( h : \mathbb{C} \rightarrow \mathbb{C} \), the unary lift is:

$$
\operatorname{lift}_1(h)(f)(x) = h\big(f(x)\big).
$$

Given a scalar function \( k : \mathbb{C} \times \mathbb{C} \rightarrow \mathbb{C} \), the binary lift is:

$$
\operatorname{lift}_2(k)(f,g)(x) = k\big(f(x), g(x)\big).
$$

Here \( f,g : X \rightarrow \mathbb{C} \cup \text{Novel} \) are UValues. Each microstate is evaluated independently; if the scalar function is undefined for the sampled inputs, the lift emits a novel value tagged with `(operator, args, microstate)` instead of throwing.

### **2.2 Universal Arithmetic from Lifts**

Universal operators are simply named lift combinations:

- `+u`  ≡ `lift2(add, ·, ·)`  (pointwise addition)
- `*u`  ≡ `lift2(multiply, ·, ·)`  (pointwise multiplication)
- `*s`  ≡ `lift2(scale, const(a), ·)` (scalar scaling)
- `divU(f,g)` ≡ `lift2(divide, f, g)`
- `powU(f,g)` ≡ `lift2(power, f, g)`

Because these are just lifts, they inherit the same guarantees: every microstate is handled, novel values are produced instead of runtime errors, and dimensional reshapes leave the behavior unchanged.

### **2.3 Novel Value Semantics**

Whenever a lifted function faces an undefined scalar evaluation (division by zero, `log(0)` with real semantics, `atan2(0,0)`, etc.), UNS produces `novel(op, args, x)` for that microstate:

- The novel entry is stored alongside classical values and participates in later lifts unchanged.
- Readout ignores novels automatically when their weights are zero; otherwise they appear explicitly in the result payload, keeping provenance transparent.
- Because composite helpers are made of lifts, they do not need custom error code—novels surface naturally from any undefined intermediate step.

### **2.4 Helper Catalog**

The runtime exposes two tiers of helpers:

1. **Primitive wrappers** that directly call `lift1`/`lift2` on core scalar math: `absU`, `sqrtU`, `sinU`, `cosU`, `tanU`, `atanU`, `logU`, `expU` (via `powU`), `divU`, `powU`, etc.
2. **Composite helpers** layered solely from primitives, masks, and constant injections. These recently expanded helpers keep server, IDE, and documentation synchronized. Their UNS definitions are:

| Helper | Layered UNS definition |
| --- | --- |
| `tanU(f)` | `divU(lift1(sin, f), lift1(cos, f))` |
| `cotU(f)` | `divU(lift1(cos, f), lift1(sin, f))` |
| `secU(f)` | `divU(const(1), lift1(cos, f))` |
| `cscU(f)` | `divU(const(1), lift1(sin, f))` |
| `asinU(f)` | `lift1(atan, divU(f, lift1(sqrt, const(1) -u (f *u f))))` |
| `acosU(f)` | `const(pi/2) -u asinU(f)` |
| `log10U(f)` | `divU(logU(f), const(log(10)))` |
| `log2U(f)` | `divU(logU(f), const(log(2)))` |
| `log1pU(f)` | `logU(addU(f, const(1)))` |
| `hypotU(f,g)` | `lift1(sqrt, (f *u f) +u (g *u g))` |
| `cbrtU(f)` | `powU(lift1(abs, f), const(1/3)) *u signU(f)` |
| `signU(f)` | `(mask_gt(f, const(0)) *u const(1)) +u (mask_lt(f, const(0)) *u const(-1))` |
| `copySignU(a,b)` | `lift1(abs, a) *u signU(b)` |
| `minU(a,b)` | `maskSelect(mask_lt(a,b), a, b)` |
| `maxU(a,b)` | `maskSelect(mask_gt(a,b), a, b)` |
| `clampU(x, lo, hi)` | `minU(maxU(x, lo), hi)` |
| `atan2U(y,x)` | `lift1(atan, divU(y, x)) + selectQuadrantMasks(y, x)` |

`maskSelect(m, left, right)` abbreviates `(m *u left) +u ((const(1) - m) *u right)` and `selectQuadrantMasks(y,x)` expands to `mask_lt(x,const(0)) *u const(pi) + mask_gt(y,const(0)) *u const(pi) - mask_lt(y,const(0)) *u const(pi)` so that `atan2U` reproduces the standard branch cuts purely with masks and constants. Every helper therefore stays inside the lifted-operator toolkit without bespoke branching.

---

## 3. Classical Mathematics Layer

Classical math distinguishes between "valid" and "undefined" expressions, typically raising errors when domains are violated. UNS keeps all classical results intact (because constants embed via `const(a)`), but it relaxes domain assumptions:

- Classical expressions like `sqrt(-9)` or `log(negative)` either fail or require explicitly switching domains. In UNS they simply evaluate in ℂ via lifts, emitting novels only when *truly* undefined.
- Division by zero no longer halts evaluation; it produces a traceable novel that downstream operations can carry.
- Composite helpers match their classical formulas when inputs are constant values and no novels are produced.

Thus UNS is a conservative extension: whenever classical evaluation is valid, lifting reproduces it exactly. When classical evaluation would fail, UNS records the failure as data rather than as an exception.

---

## 4. Examples & Commentary

### **4.1 Unary Lift Example**

```
let F = const([-9, 4])   // conceptual shorthand for two microstates
let R = lift1(sqrt, F)
```

At the microstate where \(F(x) = 4\), `R` stores 2. Where \(F(x) = -9\), `R` stores `3i`. No control-flow changes are needed—UNS simply evaluates in ℂ.

### **4.2 Binary Lift & Novel Propagation**

```
let A = const(3)
let B = const(0)
let Q = divU(A, B)
let T = Q +u const(2)
```

`divU` produces `novel(divide, (3,0), x)` for every microstate, and `T` keeps those novels intact. Readout later either reports the novel entries (if ψ gives them weight) or ignores them when their contribution is zero.

### **4.3 Composite Helper Example**

```
let X = const(0.5)
let Y = const(0.5)
let H = hypotU(X, Y)
```

This expands to `sqrt( X*X +u Y*Y )`, so the runtime only needs `*u`, `+u`, and `sqrtU`. No extra primitives were required to add `hypotU` to the helper set.

### **4.4 Commentary**

- Lifted operations are the computational backbone of UNS; once `lift1`, `lift2`, masks, and constants exist, any scalar math routine can be layered without further runtime changes.
- Helper naming (`divU`, `tanU`, `atan2U`, etc.) now matches both the API and IDE, ensuring parity between documentation and the shipped runtime.
- Novel values turn previously fatal conditions into inspectable data, which is essential for long-running inference pipelines and the summary/export/import workflow introduced in the runtime API.

This module therefore bridges the abstract axioms with practical computation: everything the runtime does—whether on the Node API or the browser IDE—comes from lifting classical math into UNS.

