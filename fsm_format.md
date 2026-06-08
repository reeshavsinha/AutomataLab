# AutomataLab — FSM JSON Format

A single, self-contained description of the JSON format AutomataLab uses to define
automata: **DFA, NFA, ε-NFA, DPDA, NPDA**. It covers both the **schema** (field by
field) and the **execution semantics** (how a machine runs and accepts).

> **How to use this:** paste this whole file into any AI/LLM along with a request
> like *"generate a Python simulator for this format"* or *"write me an NPDA for
> `{ aⁿbⁿcⁿ }` in this JSON format"*. Everything needed to read, generate, or
> simulate a machine in any language is here.

A machine is stored as one JSON object (file extension `.autolab.json`, but it is
just JSON). The object is the **machine definition**; there is no wrapper or
version header.

---

## 1. Top-level object

```jsonc
{
  "type": "DFA",            // required: "DFA" | "NFA" | "ENFA" | "DPDA" | "NPDA"
  "name": "My machine",     // optional, display only
  "language": "…",          // optional, free-text description of the language
  "alphabet": ["a", "b"],   // optional, the input symbols
  "states": [ … ],          // required: array of State objects
  "transitions": [ … ]      // required: array of Transition objects
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | string | **yes** | One of `DFA`, `NFA`, `ENFA`, `DPDA`, `NPDA`. |
| `states` | State[] | **yes** | See §2. |
| `transitions` | Transition[] | **yes** | See §3. |
| `name` | string | no | Defaults to `"Imported Machine"`. |
| `language` | string | no | Human description, e.g. `"a^n b^n, n>=1"`. |
| `alphabet` | string[] | no | Input symbols. Not strictly enforced, but recommended. |
| `id` | string | no | **Ignore / omit** — regenerated on import. |

---

## 2. State object

```jsonc
{
  "id": "q0",        // unique id, referenced by transitions
  "label": "q0",     // display text
  "isStart": true,   // start state
  "isAccept": false, // accepting / final state
  "x": 100,          // canvas X (pixels)
  "y": 200           // canvas Y (pixels)
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | **yes** | Must be unique. **Transitions reference states by this id**, so always set it explicitly. |
| `label` | string | yes | Shown on the node (e.g. `"q0"`). May equal `id`. |
| `isStart` | boolean | yes | **Exactly one** state must be `true`. |
| `isAccept` | boolean | yes | `true` for accepting/final states (zero or more). |
| `x`, `y` | number | yes | Canvas coordinates in pixels. They only affect layout — give spaced-out values (e.g. 120 px apart) or run **Auto Layout** in-app after import. |
| `isReject` | boolean | no | Reserved for Turing machines. Omit. |
| `isText` | boolean | no | A free-floating text annotation, **not** a real state. Omit for machines. |

**Rules:** exactly one `isStart: true`; ids unique; every `from`/`to` in a
transition must match some state `id`.

---

## 3. Transition object

There are two flavors. **Finite automata** (DFA/NFA/ENFA) use `symbols`.
**Pushdown automata** (DPDA/NPDA) use `read` / `pop` / `push` and set `symbols: []`.

### Common fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `from` | string | **yes** | Source state `id`. |
| `to` | string | **yes** | Target state `id`. |
| `id` | string | no | Auto-generated if omitted; set it for readability. |
| `controlPointOffset` | `{x,y}` | no | Visual edge-curve only. Omit. |

### Finite automata — `symbols`

```jsonc
{ "from": "q0", "to": "q1", "symbols": ["a"] }
{ "from": "q0", "to": "q0", "symbols": ["a", "b"] }   // fires on a OR b
{ "from": "q0", "to": "q2", "symbols": ["ε"] }        // ε-edge (ENFA only)
```

| Field | Type | Notes |
|---|---|---|
| `symbols` | string[] | The input symbol(s) this edge consumes. Multiple entries mean the edge applies for **any** of them. For an ε-edge use `["ε"]` (ENFA only). Leave `read`/`pop`/`push` unset. |

### Pushdown automata — `read` / `pop` / `push`

Reads as **`(read, pop → push)`**. Set `symbols` to `[]`.

```jsonc
{ "from": "q0", "to": "q0", "symbols": [], "read": "a", "pop": "",  "push": "A" }
{ "from": "q0", "to": "q1", "symbols": [], "read": "b", "pop": "A", "push": ""  }
{ "from": "qi", "to": "q0", "symbols": [], "read": "",  "pop": "",  "push": "Z" } // ε-move
```

| Field | Type | Notes |
|---|---|---|
| `read` | string | Input symbol consumed. `""` (or `ε`) = consume nothing. |
| `pop` | string | Stack symbol removed from the **top**. The move applies **only if the current stack top equals `pop`**. `""` (or `ε`) = no pop. |
| `push` | string | String pushed onto the stack; its **first character ends up on top**. `""` (or `ε`) = push nothing. |

> `write` and `direction` may also appear on transitions but are **reserved for a
> future Turing-machine phase** — ignore them for these five machine types.

---

## 4. Conventions & semantics

### Epsilon (ε)
Any of these strings mean "empty / epsilon": `""`, `"ε"`, `"eps"`, `"λ"`, `"lambda"`.
Canonical forms: `"ε"` for FA `symbols`, `""` for PDA `read`/`pop`/`push`.

### Stack convention (PDA)
- The stack array is ordered **bottom → top**: the **top of the stack is the LAST
  array element**.
- `push: "AB"` places the **first character on top**. Pushing `"AB"` onto `["Z"]`
  yields `["Z", "B", "A"]` (top = `A`).
- A non-ε `pop` only applies when it equals the current top element.

### Acceptance
- **DFA / NFA / ε-NFA** — accept **iff**, after the **entire input is consumed**,
  the machine is in (DFA) or its active set contains (NFA/ENFA) an `isAccept` state.
- **DPDA / NPDA** — accept **by final state**: input **fully consumed** *and* the
  (any) current branch is in an `isAccept` state. **The stack need not be empty.**
  To emulate empty-stack acceptance, push a bottom marker (e.g. `Z`) at the start
  and add an ε-move to an accept state once only `Z` remains.

### Per-type rules
| Type | Determinism | ε-moves | Stack |
|---|---|---|---|
| **DFA** | deterministic — ≤ 1 transition per `(state, symbol)` | no | no |
| **NFA** | nondeterministic — many transitions per `(state, symbol)` | **no** (use ENFA) | no |
| **ENFA** | nondeterministic + ε-closure each step | yes | no |
| **DPDA** | deterministic — ≤ 1 applicable move per configuration | yes | yes |
| **NPDA** | nondeterministic — branches explored in parallel | yes | yes |

### Minimal execution model (for implementing a simulator)
- A *configuration* is `(state, remaining input, stack)`. FA ignore the stack.
- **FA step:** read the next symbol; new active states = all `to` of transitions
  whose `from` is active and whose `symbols` include that symbol. For ε-NFA, also
  take the ε-closure (follow ε-edges without consuming input) after each move and
  on the start state.
- **PDA step:** a transition applies when `read` is ε or matches the next input
  symbol **and** `pop` is ε or matches the stack top. Apply it: optionally pop,
  then push (first char on top), and consume the input symbol if `read` ≠ ε.
  DPDA follows the single applicable move; NPDA forks one branch per applicable
  move. Guard against infinite ε-loops with a step limit.

---

## 5. Complete examples

Each block below is a full, valid machine file.

### 5.1 DFA — binary-free example: strings over `{a, b}` ending in `a`

```json
{
  "type": "DFA",
  "name": "ends with a",
  "language": "strings over {a,b} ending in 'a'",
  "alphabet": ["a", "b"],
  "states": [
    { "id": "q0", "label": "q0", "isStart": true,  "isAccept": false, "x": 80,  "y": 160 },
    { "id": "q1", "label": "q1", "isStart": false, "isAccept": true,  "x": 280, "y": 160 }
  ],
  "transitions": [
    { "id": "t0", "from": "q0", "to": "q1", "symbols": ["a"] },
    { "id": "t1", "from": "q0", "to": "q0", "symbols": ["b"] },
    { "id": "t2", "from": "q1", "to": "q1", "symbols": ["a"] },
    { "id": "t3", "from": "q1", "to": "q0", "symbols": ["b"] }
  ]
}
```

### 5.2 NFA — strings over `{a, b}` containing the substring `ab`

```json
{
  "type": "NFA",
  "name": "contains ab",
  "language": "strings over {a,b} containing 'ab'",
  "alphabet": ["a", "b"],
  "states": [
    { "id": "q0", "label": "q0", "isStart": true,  "isAccept": false, "x": 80,  "y": 160 },
    { "id": "q1", "label": "q1", "isStart": false, "isAccept": false, "x": 280, "y": 160 },
    { "id": "q2", "label": "q2", "isStart": false, "isAccept": true,  "x": 480, "y": 160 }
  ],
  "transitions": [
    { "id": "t0", "from": "q0", "to": "q0", "symbols": ["a"] },
    { "id": "t1", "from": "q0", "to": "q1", "symbols": ["a"] },
    { "id": "t2", "from": "q0", "to": "q0", "symbols": ["b"] },
    { "id": "t3", "from": "q1", "to": "q2", "symbols": ["b"] },
    { "id": "t4", "from": "q2", "to": "q2", "symbols": ["a"] },
    { "id": "t5", "from": "q2", "to": "q2", "symbols": ["b"] }
  ]
}
```

### 5.3 ε-NFA — accepts exactly `a` or `b` (demonstrates ε-branching)

```json
{
  "type": "ENFA",
  "name": "a or b via epsilon",
  "language": "{ a, b }",
  "alphabet": ["a", "b"],
  "states": [
    { "id": "q0", "label": "q0", "isStart": true,  "isAccept": false, "x": 80,  "y": 200 },
    { "id": "q1", "label": "q1", "isStart": false, "isAccept": false, "x": 280, "y": 120 },
    { "id": "q2", "label": "q2", "isStart": false, "isAccept": false, "x": 280, "y": 280 },
    { "id": "q3", "label": "q3", "isStart": false, "isAccept": true,  "x": 480, "y": 120 },
    { "id": "q4", "label": "q4", "isStart": false, "isAccept": true,  "x": 480, "y": 280 }
  ],
  "transitions": [
    { "id": "t0", "from": "q0", "to": "q1", "symbols": ["ε"] },
    { "id": "t1", "from": "q0", "to": "q2", "symbols": ["ε"] },
    { "id": "t2", "from": "q1", "to": "q3", "symbols": ["a"] },
    { "id": "t3", "from": "q2", "to": "q4", "symbols": ["b"] }
  ]
}
```

### 5.4 DPDA — `{ aⁿbⁿ | n ≥ 1 }` (final-state acceptance, bottom marker `Z`)

```json
{
  "type": "DPDA",
  "name": "a^n b^n",
  "language": "{ a^n b^n | n >= 1 }",
  "alphabet": ["a", "b"],
  "states": [
    { "id": "qi", "label": "qi", "isStart": true,  "isAccept": false, "x": 60,  "y": 160 },
    { "id": "q0", "label": "q0", "isStart": false, "isAccept": false, "x": 240, "y": 160 },
    { "id": "q1", "label": "q1", "isStart": false, "isAccept": false, "x": 420, "y": 160 },
    { "id": "qf", "label": "qf", "isStart": false, "isAccept": true,  "x": 600, "y": 160 }
  ],
  "transitions": [
    { "id": "t0", "from": "qi", "to": "q0", "symbols": [], "read": "",  "pop": "",  "push": "Z" },
    { "id": "t1", "from": "q0", "to": "q0", "symbols": [], "read": "a", "pop": "",  "push": "A" },
    { "id": "t2", "from": "q0", "to": "q1", "symbols": [], "read": "b", "pop": "A", "push": "" },
    { "id": "t3", "from": "q1", "to": "q1", "symbols": [], "read": "b", "pop": "A", "push": "" },
    { "id": "t4", "from": "q1", "to": "qf", "symbols": [], "read": "",  "pop": "Z", "push": "Z" }
  ]
}
```

### 5.5 NPDA — even-length palindromes `{ w wᴿ | w ∈ {a,b}* }` (true nondeterminism)

The machine must **guess the midpoint** (the ε-move `q0 → q1`), which only a
nondeterministic PDA can do.

```json
{
  "type": "NPDA",
  "name": "even palindromes",
  "language": "{ w w^R | w in {a,b}* }",
  "alphabet": ["a", "b"],
  "states": [
    { "id": "qi", "label": "qi", "isStart": true,  "isAccept": false, "x": 60,  "y": 160 },
    { "id": "q0", "label": "q0", "isStart": false, "isAccept": false, "x": 240, "y": 160 },
    { "id": "q1", "label": "q1", "isStart": false, "isAccept": false, "x": 420, "y": 160 },
    { "id": "qf", "label": "qf", "isStart": false, "isAccept": true,  "x": 600, "y": 160 }
  ],
  "transitions": [
    { "id": "ti",    "from": "qi", "to": "q0", "symbols": [], "read": "",  "pop": "",  "push": "Z" },
    { "id": "pa",    "from": "q0", "to": "q0", "symbols": [], "read": "a", "pop": "",  "push": "a" },
    { "id": "pb",    "from": "q0", "to": "q0", "symbols": [], "read": "b", "pop": "",  "push": "b" },
    { "id": "guess", "from": "q0", "to": "q1", "symbols": [], "read": "",  "pop": "",  "push": "" },
    { "id": "ma",    "from": "q1", "to": "q1", "symbols": [], "read": "a", "pop": "a", "push": "" },
    { "id": "mb",    "from": "q1", "to": "q1", "symbols": [], "read": "b", "pop": "b", "push": "" },
    { "id": "acc",   "from": "q1", "to": "qf", "symbols": [], "read": "",  "pop": "Z", "push": "" }
  ]
}
```

---

## 6. Generation checklist (for an AI producing a machine)

1. Pick the correct `type`; FA edges use `symbols`, PDA edges use `read`/`pop`/`push` with `symbols: []`.
2. Exactly **one** state has `isStart: true`; mark accepting states with `isAccept: true`.
3. Give every state a unique `id`; make sure every transition `from`/`to` matches a state `id`.
4. Use ε correctly: `["ε"]` for ENFA edges; `""` for PDA `read`/`pop`/`push`.
5. PDA: remember **top = last array element**, **push puts its first char on top**, and acceptance is **by final state with input consumed** (use a bottom marker like `Z` for empty-stack-style languages).
6. NFA has **no** ε-edges — use ENFA when you need them.
7. Give states spread-out `x`/`y` (or accept overlap and use in-app Auto Layout).
