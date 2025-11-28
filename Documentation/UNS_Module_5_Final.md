
# **Module 5 — Types & Typing Rules**

## 1. Narrative Explanation

Module 5 formalizes the **type system** of the Universal Number Set (UNS).  
While Modules 1–4 define UNS values, states, axioms, and syntax, this module ensures:

- expressions are **well-formed**,  
- operations are **type-safe**,  
- partial operations yield valid typed results,  
- lifted functions fit systematically into the UNS framework,  
- and runtime implementations have a consistent semantic basis.

The UNS type system differs from classical mathematics in one key respect:

> **UNS values may be distributed, complex, or novel, and their validity depends on microstate-level behavior.**

Thus the type system must incorporate:

- classical scalar types,  
- UNS distributed types,  
- state types,  
- partiality annotations,  
- lifted function types,  
- and the possibility of novel value creation.

This module is both formal and practical: it provides the rules an interpreter or compiler must enforce.

---

## 2. UNS Definition Layer  
### Type Universe

The UNS type system includes the following primary types:

```
Scalar       — classical values (ℂ)
UValue       — functions X → ℂ ∪ Novel
UState       — normalized functions X → ℂ
Boolean      — logical truth values
Novel        — operator-generated new values
```

Because UNS allows partial operations, we add **partiality annotations**:

```
T!  — total type (defined at all microstates)
T?  — partial type (may be undefined at some microstates)
```

Thus `UValue!` is a fully defined UNS number,  
while `UValue?` is a partially defined value that may include novel entries.

---

### **2.1 Scalar Types**

```
Scalar ::= Real | Complex
```

Both embed as constant UValues.

---

### **2.2 UValue Types**

```
UValue ::= X → (Complex ∪ Novel)
```

UNS values may be:

- constant,
- microstate-varying,
- complex-valued,
- partially defined with novel values.

---

### **2.3 UState Type**

```
UState ::= X → Complex
with normalization: ∫ |ψ(x)|² dμ = 1
```

States cannot contain novel values.

---

### **2.4 Function Types**

A scalar function:

```
h : Complex → Complex
```

lifts to:

```
lift1(h) : UValue → UValue
```

A binary scalar function:

```
k : Complex × Complex → Complex
```

lifts to:

```
lift2(k) : UValue × UValue → UValue
```

If `k` is partial, the lifted version may produce novel values.

---

## 3. Classical Mathematics Layer  
Classical mathematics uses a simple type system:

- ℝ, ℂ as scalar types,
- functions ℝ → ℝ or ℂ → ℂ,
- no notion of partial or distributed numbers,
- no distinction between total and partial definitions.

UNS extends classical math with:

- distributed values (functions instead of atoms),
- partial types,
- novel values,
- lifted operations,
- typed readout,
- typed dimensional transforms.

Classical values remain valid UNS values, but UNS introduces additional type structure that classical mathematics lacks.

---

## 4. Examples & Commentary

### **4.1 Typing Constant Values**

```
const(3) : UValue!
const(4+2i) : UValue!
```

Constant values are total because they are defined at all microstates.

---

### **4.2 Typing Lifted Unary Functions**

```
lift1(sqrt, f) : UValue?
```

Reason:

- if `f(x)` is negative, √f(x) is complex (valid),
- if `f(x)` = a novel value, the result remains novel,
- if √ is undefined for some classical value (not the case here), a novel value would emerge.

Even though sqrt is total in ℂ, we conservatively allow partial typing.

---

### **4.3 Typing Lifted Binary Functions**

```
lift2(divide, f, g) : UValue?
```

Because:

- division by zero yields novel values,
- novel operands yield novel results.

---

### **4.4 Typing Readout**

```
read(f | ψ) : Scalar
```

Typing rule:

- f must be UValue (total or partial),
- ψ must be UState!,
- the result is always a classical scalar (complex).

Even when f contains novel values, the readout may still produce a classical scalar if those microstates are weighted by ψ(x)=0.

---

### **4.5 Typing Dimensional Transforms**

```
D(N, ψ) : UState!
```

Dimensional transforms preserve normalization and thus remain total.

---

### **4.6 Typing Rules Summary**

#### Rule 1 — Constants
```
a : Scalar
———————————————
const(a) : UValue!
```

#### Rule 2 — Unary Lift
```
f : UValue?
h : Scalar → Scalar
—————————————————————
lift1(h, f) : UValue?
```

#### Rule 3 — Binary Lift
```
f : UValue?
g : UValue?
k : Scalar × Scalar → Scalar
———————————————————————————————
lift2(k, f, g) : UValue?
```

#### Rule 4 — Universal Ops
```
f : UValue?, g : UValue?
———————————————
f +u g : UValue?

f *u g : UValue?
```

#### Rule 5 — Readout
```
f : UValue?
ψ : UState!
———————————————
read(f | ψ) : Scalar
```

#### Rule 6 — Dimensional Transform
```
ψ : UState!
———————————————
D(N, ψ) : UState!
```

---

### **4.7 Commentary**

Module 5 provides the formal type rules needed for:

- parsers,
- interpreters,
- static type analysis,
- safe evaluation,
- detection of novel-value generation.

The inclusion of partiality via T? is essential:

Classical math hides partiality inside exceptions (division by zero).  
UNS exposes partiality explicitly as **novel values with structured provenance**.

This module ensures that all UNS constructs remain well-typed and mathematically meaningful.

