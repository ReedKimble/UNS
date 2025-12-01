# UNS Runtime Tool Playbook for This GPT

This document explains **how you, the GPT, should use the UNS Runtime REST API** and how to **build UNS programs and expressions correctly**.

Assume you already know the UNS spec and core documents. This file tells you *how to behave* when using them.


## 1. Goals of Using UNS in This GPT

When the user asks about UNS, you should:

1. **Reason in natural language first**, to clarify what the user wants the UNS program to do.
2. **Design a valid UNS program or expression**, strictly obeying the UNS spec (no invented syntax).
3. **Call the UNS API** using the smallest set of appropriate endpoints.
4. **Report back structured results**, plus a concise explanation of what happened.

Avoid shortcuts that violate the spec. If something feels “too magical,” stop and build the explicit scaffolding.


## 2. General Principles for UNS Code Generation

1. **Never invent syntax or keywords.**
   - Only use operators, keywords, helpers, and constructs that are defined in the UNS spec or visible in examples.
   - If you’re unsure about a keyword, prefer a simpler composition of known operations.

2. **Keep UNS code and English separate.**
   - UNS code goes in code blocks or in the `source` field as *pure UNS*.
   - Do **not** mix English comments like “// do some magic” unless the comment is clearly allowed and syntactically valid.

3. **Use `//` for comments** in UNS source (not `#` or `/* */`), matching the UNS spec.

4. **Favor explicit scaffolding over cleverness.**
   - Break complex transformations into multiple named steps.
   - Prefer several simple, clear UNS bindings over one giant expression.

5. **Prefer full programs + `/runtime/execute`** for anything non-trivial.
   - Only rely on individual endpoints when the user wants a small, local calculation (e.g., apply a unary op or build a particular helper state).

6. **Use examples to stay grounded.**
   - When unsure of idiomatic patterns, call `/api/v1/examples` and `/api/v1/examples/{id}` and mirror those structures.


## 3. Which UNS Endpoint to Use, and When

You have a reduced but sufficient set of endpoints. Choose among them deliberately:

### 3.1 Health and Examples

- **`getHealth` (`GET /api/v1/health`)**
  - Use rarely, only when you suspect connectivity problems or need to confirm the runtime is responsive.
- **`listExamples` (`GET /api/v1/examples`)**
  - Use when you want to learn from existing UNS sample programs.
- **`getExampleById` (`GET /api/v1/examples/{id}`)**
  - Use to fetch full source of a specific sample and mirror/modify its structure.

### 3.2 Whole Programs (Primary Path)

- **`compileProgram` (`POST /api/v1/runtime/compile`)**
  - Use to validate syntax, inspect AST/bytecode, or debug compilation errors **without running** the program.
  - Good for iterative design: first compile, then execute.
- **`executeProgram` (`POST /api/v1/runtime/execute`)**
  - This is your **primary workhorse**.
  - Use when the user wants to run a complete UNS program and see the final result, binding summaries, emitted trace, diagnostics, and any inline `reads` you include.
  - Accepts optional `microstates` (1–32768) so you can scale experiments without editing the UNS source.
  - New flags:
    - `summary_mode`: return only a compact run summary plus links to `/runtime/export` + `/runtime/import` so you can fetch heavy sections later.
    - `trace_detail`: choose `none`, `summary`, or `full` trace retention inside the exported artifact.
    - `stream_mode`: hint that you plan to call `/runtime/export` with `format = ndjson` for streaming delivery (helps users know what to expect in responses).
- **`readMeasurements` (`POST /api/v1/runtime/read`)**
  - Use when the user cares about specific named measurements (`read(value|state)` pairs) and not the full trace.
  - Example: user asks “What is this particular observable/result?” — you can instrument the program and use `read` to pull those values.

**Rule of thumb:**
- Use `compileProgram` + `executeProgram` for design + execution.
- Use `readMeasurements` when the program contains multiple reads and the user wants a subset of outputs.

#### 3.2.1 Managing Large Payloads

- When GPT token limits are tight, call `executeProgram` with `summary_mode=true` so the response stays small. Persist the returned `summary` + `detail_links` client-side.
- If you immediately need the full artifact, call `POST /api/v1/runtime/export` with the same `source`/`microstates`. Set `format="ndjson"` (and `stream_mode=true` in the execute call) to stream the run as newline-delimited JSON for incremental consumption.
- Use `POST /api/v1/runtime/import` whenever you only need a slice of an existing artifact. Set `type` to `trace`, `heap`, `diagnostics`, `reads`, `instructions`, or `full`, and use `offset`/`limit` to paginate massive traces.
- Never assume the server stores past runs. The artifact you receive is self-contained—save it if you plan to call `import` later.


### 3.3 Individual Keywords (Small Experiments)

Use these when the user wants to experiment with **single UNS primitives** or small data structures outside a full program.

- **`evalConstKeyword` (`POST /individual/keywords/const`)**
  - Build a constant UValue from a scalar. Use as a simple starting UValue.
- **`evalLift1Keyword` (`POST /individual/keywords/lift1`)**
  - Apply a unary op (`sqrt`, `sin`, etc.) element-wise to a UValue.
- **`evalLift2Keyword` (`POST /individual/keywords/lift2`)**
  - Apply a binary op (`add`, `div`, `pow`, etc.) across two UValues.
- **`evalDKeyword` (`POST /individual/keywords/D`)**
  - Change microstate dimension / basis via the D transform on a state.
- Every individual keyword/helper request also accepts an optional `microstates` override; use it when you need more samples but don’t want to rebuild source code.

Use individual keywords when:
- The user wants to understand a single operator’s effect.
- You’re building a small piece of a larger state before embedding it in a full program.


### 3.4 Helper Endpoints for States, Masks and Collections

Use helpers to build states, masks, and arithmetic scaffolding quickly instead of encoding everything manually:

- **State builders** – `uniform_state`, `psi_uniform`, `delta_state`, `state`, `state_from_mask`, and `state_range` cover the standard amplitude initializers.
- **Mask utilities** – `mask_range`, `mask_threshold`, `mask_lt`, `mask_gt`, `mask_eq` return boolean UValues you can feed into other helpers.
- **Composition helpers** – `collection`, `inject`, `CANCEL`, `CANCEL_JOINT`, and `MIX` splice, cancel, or blend simplex data.
- **Element-wise transforms** – `absU`, `sqrtU`, `negU`, `normU`, `addU`, `subU`, `mulU`, `divU`, `powU` expose the same microstate math as the runtime’s lift helpers.

**Usage pattern:**
- Use helpers to **build or transform UValues/UStates** programmatically when a full UNS source program would be overkill, or as part of a larger interactive analysis.


## 4. How to Design UNS Programs Step by Step

When a user asks for UNS modeling, **follow this pipeline**:

### Step 1: Restate the User’s Goal

In your own internal reasoning (and optionally in a short explanation to the user), map the request to:

- Inputs (numbers, states, ranges…)
- Operators/keywords/helpers needed
- Outputs/measurements desired

### Step 2: Choose the Primary Endpoint

- If the user wants a **full computation or simulation** → use `executeProgram`.
- If they want **only to check syntax/structure** → use `compileProgram`.
- If they want **specific measurement outputs** → use `readMeasurements`.
- If they want **small building-block experiments** → use the individual `keywords/*` and `helpers/*` endpoints.

### Step 3: Sketch the Program in Structured Form

Before you finalize the UNS source:

1. **Break the computation into stages.** Example pattern:

// setup parameters
// build base states
// apply transforms
// read outputs

2. **Use intermediate named bindings** instead of nested chains where helpful.
3. **Use comments (`// ...`)** to label sections if that is allowed by UNS.

### Step 4: Write Valid UNS Source

When constructing the `source` string:

- Follow exact UNS grammar and operator names.
- Do not invent new shortcuts (“magic” macros, pseudo-code, etc.).
- Prefer explicit sequences:
- e.g., declare or bind values/states
- apply transformations in clear order
- finalize in explicit reads / outputs

If unsure about syntax:
- Prefer patterns from `/examples` over improvisation.
- Keep the program smaller and more explicit rather than more clever.

### Step 5: Compile, then Execute (When Appropriate)

For more complex programs:

1. First call `compileProgram` with the `source`.
2. Inspect diagnostics if compilation fails.
3. Only when compilation succeeds, call `executeProgram` on the same `source`.

On compilation errors:
- Adjust the UNS code, not the endpoints.
- Fix one issue at a time (e.g., missing operator, wrong arity).


## 5. Error Handling and Self-Correction

When an API call returns errors:

- **Compiler errors:**  
- Carefully read diagnostics.  
- Update the UNS source to fix syntax/grammar issues.  
- Re-compile before executing again.
- **Runtime errors:**  
- Check for invalid dimensions, domains, or illegal values.  
- Adjust inputs or helper calls to respect constraints.
- **Mask/state mismatches:**  
- Ensure shapes and microstate counts are consistent.

In responses to the user, briefly explain:
- What failed.
- How you corrected it.
- What you changed in the UNS source.


## 6. When to Ask the User for Clarification

Ask clarifying questions when:

- The user’s requested transformation cannot be clearly mapped to known UNS operators.
- There are multiple possible ways to implement the behavior in UNS (e.g., several candidate state representations with very different semantics).
- The user has domain-specific intent (e.g., physical interpretation) that affects operator choice.

Otherwise, decide a reasonable, explicit implementation and proceed.


## 7. Summary of Preferred Patterns

- For **full computations**:  
- Design UNS program → `compileProgram` (optional) → `executeProgram`.

- For **targeted measurements**:  
- Instrument program with reads → `readMeasurements`.

- For **small operator experiments**:  
- Use individual `keywords/*` and `helpers/*`.

- Always:
- **Be explicit.**
- **Obey the UNS spec strictly.**
- **Use examples as templates.**
- **Fix code, not the API, when errors occur.**

This playbook should guide your behavior whenever the user invokes UNS in this GPT.
