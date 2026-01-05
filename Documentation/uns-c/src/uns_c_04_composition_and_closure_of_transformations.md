# 4. Composition and Closure of Transformations

This section defines how primitive transformations in UNS-C **compose**, how sequences of transformations are formed, and how **closure** of the calculus is maintained under composition.

The purpose here is to specify the internal mechanics of the calculus without introducing interpretation, dynamics, or semantics. Composition is treated as a formal property of rules acting on structure.

---

## 4.1 Sequential Composition

**Property:** Transformations may be composed sequentially.

If a transformation \(T_1\) maps an admissible UNS object to another admissible object, and a transformation \(T_2\) is defined on the output of \(T_1\), then the composed transformation \(T_2 \circ T_1\) is admissible.

Sequential composition does not imply temporal succession, process, or causation. It specifies only that the output of one transformation may serve as the input to another within the calculus.

---

## 4.2 Closure Under Composition

**Constraint:** The calculus is closed under admissible composition.

Any finite composition of primitive transformations yields a transformation whose action remains entirely within the domain of UNS-admissible structures. No composition introduces objects, relations, or operations outside the grammar.

Closure under composition ensures that extended transformation sequences do not require external systems for interpretation or validation.

---

## 4.3 Associativity of Composition

**Property:** Composition is associative where defined.

When multiple transformations are composable, the grouping of compositions does not affect admissibility. That is, whenever \((T_3 \circ T_2) \circ T_1\) and \(T_3 \circ (T_2 \circ T_1)\) are both defined, they are treated as equivalent compositions within the calculus.

Associativity here is a structural convenience, not a metaphysical claim.

---

## 4.4 Identity Transformations

**Property:** Identity transformations may be defined.

An identity transformation leaves an admissible object unchanged while remaining a valid element of the calculus. Identity transformations serve as neutral elements under composition where such neutrality is useful.

The existence of identity transformations does not privilege any structure as fundamental or fixed; it merely allows the calculus to express non-action formally.

---

## 4.5 Partiality and Domain Restrictions

**Property:** Transformations may be partial.

Not all transformations apply to all objects. A transformation may have a restricted domain of applicability defined by structural conditions on its inputs.

Composition is permitted only when domain conditions are satisfied. The calculus does not require totality of operations.

---

## 4.6 Stability Under Iteration

**Property:** Iterated application preserves admissibility.

If a transformation is admissible on a given object, repeated application—where defined—does not lead outside the grammar. Iteration does not introduce new object types or require escalation to meta-rules.

This property supports the construction of extended transformation sequences without loss of formal control.

---

## 4.7 No Emergent Semantics

**Constraint:** Composition does not generate semantics.

Sequences of transformations do not accumulate meaning, intention, or interpretation by virtue of their length or structure. Any semantic reading of a transformation sequence is external to UNS-C.

---

## 4.8 Summary

Composition in UNS-C:

- Is sequential and associative where defined
- Is closed over UNS-admissible structures
- Permits identity and partial transformations
- Supports iteration without escalation
- Remains purely structural and non-semantic

With composition and closure specified, the calculus can now induce formal notions of equivalence and invariance, addressed in the next section.

