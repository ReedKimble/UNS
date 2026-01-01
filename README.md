# **Universal Number Set (UNS)**

*A redefinition of what numbers can be — and what they can model.*

---

<a href="https://reedkimble.github.io/UNS/Examples/Web%20App%20IDE/uns_runtime_app.html" target="_blank">Universal Number Set (UNS) Runtime Playground</a>

# **SEE FIRST**

* **[Corpus Entry Meta Preface](https://github.com/ReedKimble/UNS/blob/2d0935c6aa98bfec708295597c2206f0e532d147/!_Corpus%20Entry_%20Meta%E2%80%91preface%20And%20Reader%20Guide.pdf)** 

## **What Is UNS?**

The **Universal Number Set (UNS)** is an extended number system built around a simple but transformative idea:

> **A number is not a single value.
> A number is a distribution of values across a universe of microstates.**

In UNS, every “number” is actually a **function** from microstates to values, defined on a normalized measure space.[^kolmogorov] This design gives UNS mathematical behaviors that classical numbers cannot express — without breaking compatibility with real and complex numbers.

Formally:

\[
U = (X, \mu), \quad \mu(X) = 1
\]

\[
u : X \to \mathbb{C}, \quad \psi : X \to \mathbb{C}, \quad \int |\psi(x)|^2 \, d\mu = 1
\]

\[
\operatorname{read}(u \mid \psi) = \int u(x) \cdot |\psi(x)|^2 \, d\mu
\]

Classical numbers embed as constant functions (e.g., `const(7)(x) = 7`), so UNS strictly contains ℝ and ℂ while extending them.

UNS is both:

* **a mathematical framework**, and
* **a formal language** for expressing operations, compositions, and transformations over these extended numbers.

If classical numbers are points, UNS numbers are landscapes.

---

## **Why UNS Was Created**

The origin of UNS emerged from exploring a series of conceptual questions:

### **1. Why do classical numbers fail in certain contexts?**

Classical math forces numbers to be:

* single-valued
* dimensionless
* context-free
* undefined under certain operations (e.g., divide-by-zero)
* “fragile” when applied to systems with distributed or multi-state behaviors

But many real and conceptual systems are:

* distributed
* dimensional
* contextual
* probabilistic
* state-dependent
* nonsingular

Classical numbers weren’t designed with this worldview in mind.

---

### **2. Can we create a number system that tolerates contextuality?**

UNS introduces:

* **microstates** (the smallest places where value can live)
* **states** (which tell you *how* to interpret a UNS number)
* **distributed values** (functions instead of points)
* **readout rules** (how classical values emerge from context)

This allows UNS numbers to behave differently depending on the state through which they are viewed—yet still follow stable, formal rules.

---

### **3. What if dimensionality were not intrinsic?**

One of UNS’s most striking properties:

> **A UNS number can appear point-like or N-dimensional depending on the state,
> yet yield the exact same classical readout.**

This mirrors deep symmetry principles found in physics and information theory, echoing Hilbert-space equivalences while remaining agnostic to a single inner-product structure.[^vonneumann]

UNS formalizes this by design.

---

### **4. Can we handle undefined classical operations without breaking the system?**

When classical math encounters singularities (like division by zero), UNS instead generates:

> **novel values** — formally typed, traceable, valid outputs
> that extend the number system without contradiction.

This makes UNS an *open* number universe:
closed under all lifted operations, including those that classically fail.

---

## **What UNS Is Good For**

UNS is not intended to replace classical mathematics.
Instead, it is ideal for modeling or experimenting with systems characterized by:

* **distributed values**
* **contextual or state-dependent results**
* **dimensional equivalence or symmetry**
* **singularities or undefined classical behaviors**
* **probabilistic or microstate-based interpretations**
* **abstract number discovery**

Potential applications include:

* conceptual or theoretical modeling
* simulation frameworks
* generative or exploratory mathematics
* LLM-based reasoning systems
* research into extended numeric structures
* systems where “point numbers” are too limiting

UNS combines formal mathematical rigor with an exploratory design ethos.

---

## **Key Documents in This Repository**

### **📘 Universal Number Set — RFC Specification**

The formal definition of UNS: grammar, rules, operators, semantics, and foundational axioms.
→ [RFC/UNS_RFC.md](RFC/UNS_RFC.md)

---

### **📗 Operator Extensions**

Defines extended operators such as cancellation, along with any additional lifted functions or helper constructs.
→ [Runtime/Specification/UNS_Runtime32_Spec.md#11-uns-operator-extensions](Runtime/Specification/UNS_Runtime32_Spec.md#11-uns-operator-extensions)

---

### **📄 `.unse` — Universal Number Set Expression Files**

UNS includes a dedicated file type for storing UNS programs and expressions.
The `.unse` spec describes:

* structure
* comments
* encoding rules
* readout conventions
  → [RFC/UNS_RFC.md#20-uns-expression-files-unse](RFC/UNS_RFC.md#20-uns-expression-files-unse)

---

### **🧭 Guided Discovery Document**

A narrative, intuitive walkthrough of the thinking behind UNS:
microstates, distributions, dimensional equivalence, novel values, lifted operators, and more.
This is not part of the spec but is ideal for understanding the *why* behind the system.
→ *Included in repo as* `UNS_Guided_Discovery.md` 

---

### **🖼 Logo & Symbol Assets**

A stylized UNS symbol (derived from the letters U–N–S) and banner graphics suitable for web, documentation, and packaging.
→ Assets are being curated; see [TRADEMARKS.md](TRADEMARKS.md) for current usage guidance until the vector set lands in-repo.

---

### **🧪 Examples & Reference Expressions**

Sample `.unse` files showing:

* distributed values
* lifted operations
* dimensional transforms
* generation of novel values

→ [Examples/](Examples/)

---

## **How to Use UNS**

You can use UNS in two main ways:

### **1. As a Language**

Write and evaluate `.unse` expressions describing UNS values and operations.

### **2. As a Conceptual Framework**

Use UNS ideas to:

* model systems with state-dependent interpretations
* explore dimensional symmetry
* experiment with nonclassical numeric phenomena
* extend classical constructs with novel values

---

## **Project Philosophy**

UNS is built around a few core principles:

### **🟦 Structural clarity**

Every UNS number has an internal structure you can inspect.

### **🟩 Extensibility without chaos**

New operators and new values can be added without breaking old ones.

### **🟧 Mathematical honesty**

No contradictions allowed; anything consistent is permitted.

### **🟪 Interpretational neutrality**

UNS does not force an interpretation—classical numbers, quantum-like views, probabilistic views, or purely abstract perspectives all fit.

---

## **Getting Started**

1. Read the **RFC Specification** for the formal rules.
2. Browse the **Guided Discovery** for intuition and background.
3. Explore the **example `.unse` files**.
4. Use the **designer-instruction prompt** if integrating UNS into tooling or automated systems.

---

## **License**

Parts of this repository are open source; others are closed or proprietary and not redistributable. Each directory contains its own license file—please review before use. For more info, see the repository’s license files for all applicable terms. [Licensing Overview.md](Licensing Overview.md).

---

## **Errors and Contradictions**

There may be errors, contradictions or inconsistencies across the various documents. I've tried to prevent such things, and correct them when found, but if you spot anything questionable, please open a bug report.

The most accurate examples of valid expressions should be found in the Wiki from Section 09 onward.

---

## **Contributing**

UNS is a research-aligned, exploratory project.
Contributions are welcome in the form of:

* operator proposals
* examples
* tooling
* documentation improvements
* theoretical discussion

Please open an issue or submit a PR.

---

## **Testing**

A public test API implementation is availble, but I do ask that you limit your usage. Documentation exists along with ready-to-deploy samples of the same API within the UNS GitHub repo.

* **[UNS Runtime REST API](https://uns-phi.vercel.app/)**

[^kolmogorov]: A. N. Kolmogorov and S. V. Fomin, *Measure, Lebesgue Integrals, and Hilbert Space*, Academic Press, 1957.
[^vonneumann]: J. von Neumann, *Mathematical Foundations of Quantum Mechanics*, Princeton University Press, 1955.
