# 2. Objects of the Calculus

This section specifies the **objects over which the UNS-C calculus operates**. These objects are drawn exclusively from the formal grammar defined by the Universal Number Set (UNS). No new primitives are introduced.

The purpose of this section is delimiting rather than expansive: to make explicit what the calculus is allowed to act on, and by exclusion, what lies outside its domain.

---

## 2.1 Dependency on UNS Structures

All objects of the UNS-C calculus are **UNS-admissible structures**. The calculus does not act on interpretations, meanings, values, or external referents. It acts only on formal constructions that are already well-formed under the rules of UNS.

If a structure is not admissible in UNS, it is not an object of the calculus.

---

## 2.2 Primitive Objects

The primitive objects of the calculus include:

- Elements of the underlying UNS set
- Primitive relations defined within UNS
- Admissible operations specified by the UNS grammar

These objects are taken as given. UNS-C does not redefine them, extend them, or interpret them. It presupposes their formal status exactly as established by UNS.

---

## 2.3 Composite Structures

In addition to primitive objects, UNS-C operates on **composite structures** formed within UNS, including:

- Configurations of multiple elements connected by relations
- Nested relational structures
- Results of admissible UNS operations

Composite structures are treated as first-class objects of the calculus, provided they remain admissible under the grammar.

---

## 2.4 Structural Equivalence Classes

Where relevant, UNS-C may refer to **classes of structures** defined by formal equivalence under the calculus.

These equivalence classes are not objects of a different kind; they are groupings of UNS structures induced by transformation rules. They carry no semantic interpretation and no ontological weight.

---

## 2.5 Transformation Domains

Each transformation defined by UNS-C specifies its own domain of applicability. Not all transformations apply to all objects.

The calculus therefore distinguishes:

- Objects that are admissible but not transformable by a given rule
- Objects that serve as inputs to transformations
- Objects that arise as outputs of transformations

All such distinctions are formal and local to the calculus.

---

## 2.6 No External Objects

UNS-C explicitly excludes the following from its object domain:

- Semantic interpretations
- Truth values or propositions
- Temporal states or causal events
- Observers, agents, or processes
- Physical, computational, or empirical entities

If such notions appear in downstream use, they are introduced by external frameworks, not by UNS-C.

---

## 2.7 Summary

The objects of the UNS-C calculus are precisely those structures that:

- Are admissible under the UNS grammar
- Can participate in formal transformations
- Remain internal to the grammar under operation

By restricting its object domain in this way, UNS-C preserves strict separation between grammar, calculus, and interpretation. The next section introduces the primitive transformations that act on these objects.

