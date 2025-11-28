
# **Module 4 — Syntax & Grammar**

## 1. Narrative Explanation

Module 4 defines the **formal syntax and grammar** of the Universal Number Set (UNS).  
While Modules 1–3 established the conceptual and axiomatic foundations, this module explains how UNS expressions are written, parsed, and interpreted.

The goal of this module is to:

- provide a **precise language** for writing UNS expressions,
- support interpreters, compilers, and static analyzers,
- distinguish between classical operations and UNS operations,
- define the structure of UNS programs,
- and establish the canonical textual representation of UNS constructs.

This module prioritizes clarity and formal precision.  
Later modules (Types, Lifted Operations, Runtime) will build on this syntax.

---

## 2. UNS Definition Layer  
### The UNS Grammar

The grammar is presented using an extended Backus–Naur Form (EBNF).

---

### **2.1 Lexical Elements**

```
identifier   = letter , { letter | digit | "_" } ;
number       = digit , { digit } , [ "." , digit , { digit } ] ;
complex      = number , [ "+" , number , "i" ] ;
string       = '"' , { character } , '"' ;
```

---

### **2.2 Core Expressions**

```
expression =
      constant
    | identifier
    | unary-op , expression
    | expression , binary-op , expression
    | "read" , "(" , expression , "|" , expression , ")"
    | "lift1" , "(" , identifier , "," , expression , ")"
    | "lift2" , "(" , identifier , "," , expression , "," , expression , ")"
    | "const" , "(" , scalar , ")"
    | "(" , expression , ")"
    ;
```

---

### **2.3 UNS-Specific Operators**

UNS defines three core operators:

#### Universal addition  
```
+u
```

#### Universal multiplication  
```
*u
```

#### Scalar scaling  
```
*s
```

These correspond to the UNS pointwise operations described in earlier modules.

---

### **2.4 Literal Constructs**

```
scalar   = number | complex ;
constant = "const" , "(" , scalar , ")" ;
```

Examples:

```
const(3)
const(2.5)
const(4+3i)
```

---

### **2.5 Unary and Binary Lift Syntax**

Unary lift:

```
lift1(func, f)
```

Binary lift:

```
lift2(func, f, g)
```

Where `func` is an identifier referring to a scalar function available in the UNS environment (e.g., `sqrt`, `sin`, `divide`).

---

### **2.6 Readout Syntax**

```
read(f | ψ)
```

Example:

```
read(f | default_state)
```

This is the canonical UNS expression for obtaining a classical scalar from a UNS value.

---

### **2.7 State Declarations**

```
state-decl =
    "state" , identifier , "=" , expression ;
```

States are themselves expressions that must evaluate to valid UStates after normalization.

---

### **2.8 Value Declarations**

```
value-decl =
    "let" , identifier , "=" , expression ;
```

Example:

```
let A = const(3)
let B = const(4)
let H = sqrtU(A*A +u B*B)
```

---

### **2.9 Full Program Structure**

```
program =
    { declaration | expression } ;
```

This extremely permissive structure allows UNS source files to act as both scripts and declarative documents.

---

## 3. Classical Mathematics Layer

Classical mathematics has no concept of:

- lifted functions,
- distributed value functions,
- state-dependent readout,
- universal operators like +u or *u,
- dimension-preserving syntactic constructs.

In classical notation:

- `f +u g` reduces to `f + g` *only when f and g are constants*.
- `f *u g` reduces to classical multiplication for constant values.
- `read(f | ψ)` corresponds to an expectation value:

  $$
  \mathbb{E}[f] = \int f(x) \, w(x) \, dx
  $$

The UNS grammar formalizes constructs that classical mathematics has no syntactic equivalent for.

---

## 4. Examples & Commentary

### **4.1 Simple UNS Script**

```
let A = const(3)
let B = const(4)
let S = A *u A +u B *u B
let H = lift1(sqrt, S)
read(H | ψ0)
```

---

### **4.2 Using Lifted Binary Operations**

```
let Q = lift2(divide, A, B)
```

If `B` contains any zero-valued microstates, `Q` will contain novel values.

---

### **4.3 Mixed Classical and UNS Expressions**

```
let f = const(2.5)
let g = f *u const(3)
let R = read(g | ψ)
```

---

### **4.4 Commentary**

This module provides the syntactic backbone for UNS:

- clear grammar,
- unambiguous operator definitions,
- a consistent notation for readout and lifting,
- support for novel values and states.

These rules enable consistent implementation across interpreters and runtimes.

