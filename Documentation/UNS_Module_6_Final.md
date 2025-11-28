
# **Module 6 — Lifted Operations**

## 1. Narrative Explanation

Lifted operations are one of the defining features of the Universal Number Set (UNS).  
While classical mathematics defines operations on *scalars*, UNS treats numbers as **functions over microstates**.  
To remain compatible with classical math while extending it, UNS defines a systematic method for “lifting” classical scalar functions into operations on UNS values.

This module explains:

- what lifting is,
- how unary and binary lifting work,
- how partial operations produce novel UNS values,
- and why lifted operations form the computational backbone of UNS.

Lifted operations allow UNS to express:

- square roots,
- trigonometric functions,
- logarithms,
- exponentiation,
- division,
- and any scalar mathematical function

—without requiring classical domain restrictions.  
Instead, UNS cleanly and consistently handles undefined cases through novel values.

---

## 2. UNS Definition Layer

### **2.1 Unary Lift**

Given a scalar function:

$$
h : \mathbb{C} \rightarrow \mathbb{C},
$$

the **unary lift** of \(h\) is:

$$
\text{lift}_1(h)(f)(x) = h(f(x)).
$$

Where:

- \( f : X \rightarrow \mathbb{C} \cup \text{Novel} \) is a UValue,
- the lifted function is applied independently to each microstate,
- if \( h \) is undefined at a microstate, a **novel value** is produced.

---

### **2.2 Binary Lift**

Given a scalar function:

$$
k : \mathbb{C} \times \mathbb{C} \rightarrow \mathbb{C},
$$

the **binary lift** of \(k\) is:

$$
\text{lift}_2(k)(f, g)(x)
  = k(f(x), g(x)).
$$

If \( k \) is undefined at microstate \(x\), then:

$$
\text{lift}_2(k)(f, g)(x)
  = \text{novel}(k, (f(x), g(x)), x).
$$

Binary lifting allows UNS to define:

- division,
- exponentiation,
- function composition,
- scalar products,
- and more.

---

### **2.3 Universal Operators as Lifted Functions**

Several core UNS operators are implemented using lifting.

#### Universal Addition

$$
(f +_u g)(x) = f(x) + g(x).
$$

This corresponds to:

```
+u  ≡ lift2( add )
```

#### Universal Multiplication

$$
(f \cdot_u g)(x) = f(x) g(x).
$$

This corresponds to:

```
*u  ≡ lift2( multiply )
```

#### Scalar Scaling

$$
(a \,*_s\, f)(x) = a \cdot f(x).
$$

---

### **2.4 Novel Values**

If a lifted operation encounters an undefined case (e.g., dividing by zero), UNS does **not** raise errors.  
Instead, it produces a **novel value**:

$$
\text{novel}(op, args, x).
$$

Novel values:

- are valid UValues,
- may propagate through additional operations,
- have structured provenance,
- enable UNS to explore mathematical regions classical math excludes.

---

### **2.5 Lifted Function Examples in UNS Notation**

```
sqrtU(f)         = lift1(sqrt, f)
absU(f)          = lift1(abs, f)
sinU(f)          = lift1(sin, f)
divideU(f, g)    = lift2(divide, f, g)
logU(f)          = lift1(log, f)
powU(f, g)       = lift2(power, f, g)
```

---

## 3. Classical Mathematics Layer

Lifting generalizes scalar operations into microstate-wise operations.  
In classical math:

- sqrt(·) is defined only for non-negative reals unless extended to ℂ,
- division by zero is undefined,
- log(·) has domain restrictions,
- and many functions cause exceptions when their domain is violated.

UNS reinterprets these behaviors:

- Classical domain restrictions are **not** imposed ahead of time.
- Domain violations produce structured **novel values**.
- No exception or error interrupts evaluation.
- Every scalar function extends cleanly to a UNS function.

Thus, from the classical perspective:

- lifting preserves valid operations,
- extends the domain of classical operations,
- and provides semantics for previously undefined behavior.

---

## 4. Examples & Commentary

### **4.1 Unary Lift Example**

Given:

- \( f(x_1)=4 \)
- \( f(x_2)=-9 \)

Then:

$$
\text{lift}_1(\sqrt{})(f)(x_1)=2
$$

$$
\text{lift}_1(\sqrt{})(f)(x_2)=3i
$$

Classical math cannot simultaneously apply √ to positive and negative arguments without switching domains.  
UNS handles this naturally.

---

### **4.2 Binary Lift Example**

Let:

- \( f(x)=3 \)
- \( g(x)=0 \)

Then:

$$
\text{lift}_2(\text{divide})(f,g)(x)
= \text{novel}(\text{divide}, (3,0), x).
$$

No error is produced.

---

### **4.3 Mixed-Classical Operations**

If `f` and `g` are constant:

```
let f = const(3)
let g = const(4)
let h = divideU(f, g)
```

Then:

$$
h(x)=\frac{3}{4}, \quad \forall x\in X.
$$

---

### **4.4 Commentary**

Lifted operations are essential for:

- extending scalar functions to UNS values,
- defining universal arithmetic,
- handling partial functions safely,
- enabling UNS to explore non-classical value spaces.

This module lays the groundwork for the behavior of operators, states, and the runtime model.

