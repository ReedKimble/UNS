# 3. Primitive Transformations

This section introduces the **primitive transformations** of the UNS-C calculus. These transformations are the basic operations by which admissible UNS structures may be altered, related, or reconfigured while remaining within the grammar.

Primitive transformations are defined formally and structurally. They do not carry semantic interpretation, represent physical processes, or encode meaning. Their role is to specify allowable motion over structure.

---

## 3.1 Nature of Primitive Transformations

A primitive transformation is a rule that:

- Takes one or more UNS-admissible objects as input
- Produces one or more UNS-admissible objects as output
- Preserves admissibility under the UNS grammar

Primitive transformations are not derived from deeper principles within this document. They are stipulated as the minimal set of operations required for the calculus to function.

---

## 3.2 Structural Preservation

**Constraint:** Primitive transformations must preserve grammatical well-formedness.

Applying a transformation may alter relations, configurations, or composition, but it may not introduce objects, relations, or operations that violate the constraints of UNS. Closure under transformation is mandatory.

No primitive transformation may require external evaluation or interpretation to determine whether its output is admissible.

---

## 3.3 Locality of Action

**Constraint:** Transformations act locally.

Each primitive transformation operates on a specified substructure or configuration within a larger UNS structure. Transformations do not act globally by default.

Global effects, when present, must arise from the composition of local transformations, not from primitive rules that presume total structure.

---

## 3.4 Non-Semantic Character

**Constraint:** Transformations are non-semantic.

Primitive transformations do not preserve truth, meaning, value, or interpretation. They preserve only formal structure and admissibility.

Any semantic interpretation of transformation sequences is external to UNS-C and belongs to downstream contexts.

---

## 3.5 Directionality Without Temporality

**Property:** Transformations may be directed.

A transformation may distinguish input from output without implying temporal order, causation, or process in the physical sense. Direction here is structural: it specifies how one configuration is related to another under the calculus.

---

## 3.6 Irreversibility and Non-Invertibility

**Property:** Primitive transformations need not be invertible.

Some transformations may lack an inverse within the calculus. Non-invertibility is permitted and does not indicate loss, entropy, or irreversibility in any physical or semantic sense.

Invertibility, when present, must be explicitly defined.

---

## 3.7 Minimality of the Primitive Set

The set of primitive transformations is chosen to be minimal with respect to expressive need. No primitive transformation is included solely for convenience or illustration.

Additional transformations, if required, must be definable through composition of primitives or introduced explicitly with justification at the calculus level.

---

## 3.8 Placeholder for Formal Definitions

The precise symbolic specification of each primitive transformation is introduced after posture, scope, and constraints are fully established. Symbols, rewrite rules, or operational notation are introduced only where prose is insufficient to avoid ambiguity.

---

## 3.9 Summary

Primitive transformations in UNS-C:

- Operate only on UNS-admissible objects
- Preserve grammatical well-formedness
- Act locally and structurally
- May be directed and non-invertible
- Carry no semantic or ontological meaning

With the primitive transformations established, the next section defines how these transformations compose and how closure under composition is maintained.

