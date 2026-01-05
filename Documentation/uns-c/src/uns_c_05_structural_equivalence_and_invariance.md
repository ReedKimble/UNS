# 5. Structural Equivalence and Invariance

This section defines **structural equivalence** and **invariance** as induced by the UNS-C calculus. These notions specify when two UNS-admissible structures are treated as equivalent under admissible transformations, and which properties are preserved across transformation sequences.

Equivalence and invariance here are strictly formal. They do not imply semantic sameness, functional identity, or interpretive interchangeability.

---

## 5.1 Transformation-Induced Equivalence

**Definition:** Two UNS-admissible structures are equivalent under UNS-C if there exists a finite sequence of admissible transformations that maps one structure to the other.

This equivalence is defined relative to the calculus. Different calculi over the same grammar may induce different equivalence relations.

No claim is made that equivalent structures are identical, interchangeable, or indistinguishable outside the formal context of UNS-C.

---

## 5.2 Equivalence Classes

The equivalence relation induced by UNS-C partitions the space of UNS-admissible structures into **equivalence classes**.

Each class consists of all structures mutually reachable via admissible transformation sequences. These classes are formal groupings only; they do not carry semantic interpretation or ontological significance.

---

## 5.3 Invariants of the Calculus

**Definition:** An invariant is a structural property preserved under all admissible transformations in UNS-C.

Invariants are not assumed a priori. They are determined by the transformation rules of the calculus. If a property is preserved across all admissible transformations, it is invariant with respect to UNS-C.

---

## 5.4 Grammar-Level Preservation

**Constraint:** All invariants must be compatible with the UNS grammar.

Invariants may not rely on properties external to UNS or on interpretations imposed downstream. They must be definable entirely in terms of UNS-admissible structure.

This constraint prevents semantic or ontological properties from being smuggled into the calculus under the guise of invariance.

---

## 5.5 Relative, Not Absolute, Equivalence

Equivalence in UNS-C is **relative**, not absolute.

- It is relative to the chosen set of primitive transformations.
- It is relative to domain restrictions of those transformations.
- It is relative to the grammar provided by UNS.

Changing any of these conditions may alter the induced equivalence relation.

---

## 5.6 No Semantic Invariance

**Constraint:** UNS-C does not define semantic invariants.

Properties such as meaning, truth, function, or value are not invariants of the calculus. If such properties appear stable in downstream applications, that stability arises from external interpretation, not from UNS-C itself.

---

## 5.7 Summary

Structural equivalence and invariance in UNS-C:

- Are induced by admissible transformations
- Partition structures into formal equivalence classes
- Preserve only grammar-compatible properties
- Are relative to the calculus definition
- Carry no semantic or ontological implication

With equivalence and invariance specified, the calculus can now support notions of directedness and ordering purely as properties of transformation sequences, addressed in the next section.

