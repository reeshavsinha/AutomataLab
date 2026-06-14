# AutomataLab — FSM JSON Format

A single, self-contained description of the JSON format AutomataLab uses to define
automata: **DFA, NFA, ε-NFA, DPDA, NPDA, TM, LBA**. It covers both the **schema**
(field by field) and the **execution semantics** (how a machine runs and accepts).

> **How to use this:** paste this whole file into any AI/LLM along with a request
> like *"generate a Python simulator for this format"* or *"write me a Turing
> machine for `{ aⁿbⁿcⁿ }` in this JSON format"*. Everything needed to read,
> generate, or simulate a machine in any language is here.

A machine is stored as one JSON object (file extension `.autolab.json`, but it is
just JSON). The object is the **machine definition**; there is no wrapper or
version header.

---

## 1. Top-level object

```jsonc
{
  "type": "DFA",              // required: "DFA"|"NFA"|"ENFA"|"DPDA"|"NPDA"|"TM"|"LBA"
  "name": "My machine",       // optional, display only
  "language": "…",            // optional, free-text description of the language
  "alphabet": ["a", "b"],     // optional, the input alphabet Σ
  "stackAlphabet": ["A","Z"], // optional, DPDA/NPDA only — stack alphabet Γ (validation only)
  "tapeAlphabet": ["0","1","_"], // optional, TM/LBA only — tape alphabet Γ (validation only)
  "states": [ … ],            // required: array of State objects
  "transitions": [ … ],       // required: array of Transition objects
  "blankSymbol": "_",         // optional, TM/LBA only — default "_"
  "stepLimit": 10000,         // optional, TM/LBA only — infinite-loop guard, default 10000
  "tapeCount": 1              // optional, TM only — number of tapes, default 1 (single-tape)
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | string | **yes** | One of `DFA`, `NFA`, `ENFA`, `DPDA`, `NPDA`, `TM`, `LBA`. |
| `states` | State[] | **yes** | See §2. |
| `transitions` | Transition[] | **yes** | See §3. |
| `name` | string | no | Defaults to `"Imported Machine"`. |
| `language` | string | no | Human description, e.g. `"a^n b^n, n>=1"`. |
| `alphabet` | string[] | no | The input alphabet Σ. Not strictly enforced, but recommended. |
| `stackAlphabet` | string[] | no | **DPDA/NPDA only.** The stack alphabet Γ. **Declarative** — when present it drives non-blocking validation *warnings* (e.g. a `pop`/`push` symbol not in Γ); the engine never enforces it. Omit to skip the check. |
| `tapeAlphabet` | string[] | no | **TM/LBA only.** The tape alphabet Γ (should include `blankSymbol`, and Σ ⊆ Γ). **Declarative** — drives non-blocking validation *warnings* only (e.g. a written symbol not in Γ, or the blank appearing in Σ). Omit to skip the check. |
| `blankSymbol` | string | no | **TM/LBA only.** The single character shown on blank tape cells. Defaults to `"_"`. |
| `stepLimit` | number | no | **TM/LBA only.** Max steps before a run halts as `stuck` (infinite-loop guard). Defaults to `10000`. |
| `tapeCount` | number | no | **TM only.** Number of tapes (≥ 1). Defaults to `1`. When `> 1`, transitions use the `reads`/`writes`/`directions` arrays (see below). |
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
| `isReject` | boolean | no | **TM/LBA only.** A halt-and-reject state. A state may not be both `isAccept` and `isReject`. Omit for FA/PDA. |
| `isText` | boolean | no | A free-floating text annotation, **not** a real state. Omit for machines. |

**Rules:** exactly one `isStart: true`; ids unique; every `from`/`to` in a
transition must match some state `id`.

---

## 3. Transition object

There are three flavors. **Finite automata** (DFA/NFA/ENFA) use `symbols`.
**Pushdown automata** (DPDA/NPDA) use `read` / `pop` / `push`. **Turing machines &
LBAs** (TM/LBA) use `read` / `write` / `direction`. The PDA and TM flavors set
`symbols: []`.

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

### Turing machines & LBAs — `read` / `write` / `direction`

Reads as **`(read → write, direction)`**. Set `symbols` to `[]`. A TM transition
matches the **single tape symbol under the head**, overwrites it, then moves.

```jsonc
{ "from": "q0", "to": "q1", "symbols": [], "read": "a", "write": "X", "direction": "R" }
{ "from": "q1", "to": "q1", "symbols": [], "read": "b", "write": "b", "direction": "R" } // move right, leave b
{ "from": "q4", "to": "acc","symbols": [], "read": "_", "write": "_", "direction": "S" } // hit blank, stay
```

| Field | Type | Notes |
|---|---|---|
| `read` | string | The **single** tape symbol under the head this move matches. An empty string (or the blank symbol) matches a **blank** cell. |
| `write` | string | The **single** tape symbol written under the head before moving. Empty (or the blank symbol) writes a **blank**. |
| `direction` | string | Head move after writing: `"L"` (left), `"R"` (right), or `"S"` (stay). **Required** for TM/LBA. |

> A deterministic TM/LBA must have **at most one** transition per `(state, read)`.
> `read`/`write` must each denote a single tape symbol.

### Multi-tape Turing machines — `reads` / `writes` / `directions`

Set `tapeCount` to `N > 1` (TM only) and give every transition three **arrays of
length `N`**: `reads`, `writes`, `directions` (one entry per tape, index = tape).
The single-tape `read`/`write`/`direction` fields are ignored when `tapeCount > 1`.
A move fires only when **every** tape's `reads[i]` matches the symbol under that
tape's head; it then writes `writes[i]` and moves each head per `directions[i]`.

```jsonc
// 2-tape move: tape 1 reads 'a' (write 'a', move R); tape 2 reads blank (write 'a', move R)
{ "from": "q0", "to": "q0", "symbols": [], "reads": ["a", "_"], "writes": ["a", "a"], "directions": ["R", "R"] }
```

| Field | Type | Meaning |
|---|---|---|
| `reads` | string[] | Per-tape symbol matched under each head (length `tapeCount`). Empty/blank entry matches a blank cell. |
| `writes` | string[] | Per-tape symbol written before moving (length `tapeCount`). |
| `directions` | string[] | Per-tape head move, each `"L"` / `"R"` / `"S"` (length `tapeCount`). |

> The **input is loaded onto tape 1 only**; all other tapes start blank, heads at
> cell `0`. Determinism is checked on the **full read-tuple** `(reads[0], …, reads[N-1])`
> per state. Multi-tape is a plain-`TM` feature (an LBA stays single-tape).

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

### Tape convention (TM / LBA)
- The tape holds the input in cells `0 … n-1`; every other cell is the **blank
  symbol** (`blankSymbol`, default `"_"`). The head starts on cell `0`.
- A **TM** tape is **two-way infinite** — the head may move arbitrarily far left
  (below index 0) or right; blanks are read wherever nothing was written.
- An **LBA** is a TM whose head is **confined to the input region** `[0, n]` (the
  input cells plus the trailing end-of-input blank, bracketed by the `⊢`/`⊣`
  markers). A move past either end **halts and rejects**. Empty input still gets
  one usable cell, so the head can read the blank and decide.

### Acceptance
- **DFA / NFA / ε-NFA** — accept **iff**, after the **entire input is consumed**,
  the machine is in (DFA) or its active set contains (NFA/ENFA) an `isAccept` state.
- **DPDA / NPDA** — accept **by final state**: input **fully consumed** *and* the
  (any) current branch is in an `isAccept` state. **The stack need not be empty.**
  To emulate empty-stack acceptance, push a bottom marker (e.g. `Z`) at the start
  and add an ε-move to an accept state once only `Z` remains.
- **TM / LBA** — accept **by halting in an accept state** (input is *not* required
  to be "consumed"; the head can be anywhere). A run **rejects** when it enters an
  `isReject` state or when **no transition applies** from a non-accept state. It
  halts as **`stuck`** if it runs longer than `stepLimit` (infinite-loop guard),
  and an LBA also rejects if the head crosses a tape boundary.

### Per-type rules
| Type | Determinism | ε-moves | Stack |
|---|---|---|---|
| **DFA** | deterministic — ≤ 1 transition per `(state, symbol)` | no | no |
| **NFA** | nondeterministic — many transitions per `(state, symbol)` | **no** (use ENFA) | no |
| **ENFA** | nondeterministic + ε-closure each step | yes | no |
| **DPDA** | deterministic — ≤ 1 applicable move per configuration | yes | yes |
| **NPDA** | nondeterministic — branches explored in parallel | yes | yes |
| **TM** | deterministic — ≤ 1 move per `(state, read)` | n/a | tape (two-way infinite) |
| **LBA** | deterministic — ≤ 1 move per `(state, read)` | n/a | tape (bounded to the input) |

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
- **TM / LBA step:** let `s` be the tape symbol under the head (blank if the cell
  was never written). Find the single transition from the current state whose
  `read` equals `s` (an empty/blank `read` matches a blank). If there is none and
  the state is not accepting, **reject**. Otherwise write `write` under the head,
  move the head per `direction` (`L`/`R`/`S`), and switch to `to`. Accept on
  reaching an `isAccept` state, reject on an `isReject` state. Stop after
  `stepLimit` steps (`stuck`). For an **LBA**, reject if `direction` would push
  the head outside `[0, n]`.
- **Multi-tape TM step (`tapeCount > 1`):** read all `N` head symbols at once. A
  transition applies only when `reads[i]` matches every tape `i`. Apply it by
  writing `writes[i]` and moving each head per `directions[i]` simultaneously,
  then switch to `to`. Everything else (accept/reject/`stuck`) is unchanged.

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

### 5.6 TM — `{ 0ⁿ1ⁿ | n ≥ 0 }` (mark a `0` as `X`, match a `1` as `Y`, repeat)

```json
{
  "type": "TM",
  "name": "0^n 1^n",
  "language": "{ 0^n 1^n | n >= 0 }",
  "alphabet": ["0", "1"],
  "blankSymbol": "_",
  "states": [
    { "id": "q0",  "label": "q0",  "isStart": true,  "isAccept": false, "x": 80,  "y": 160 },
    { "id": "q1",  "label": "q1",  "isStart": false, "isAccept": false, "x": 240, "y": 160 },
    { "id": "q2",  "label": "q2",  "isStart": false, "isAccept": false, "x": 400, "y": 160 },
    { "id": "q3",  "label": "q3",  "isStart": false, "isAccept": false, "x": 240, "y": 320 },
    { "id": "acc", "label": "acc", "isStart": false, "isAccept": true,  "x": 560, "y": 160 }
  ],
  "transitions": [
    { "id": "a", "from": "q0", "to": "q1",  "symbols": [], "read": "0", "write": "X", "direction": "R" },
    { "id": "b", "from": "q0", "to": "q3",  "symbols": [], "read": "Y", "write": "Y", "direction": "R" },
    { "id": "c", "from": "q0", "to": "acc", "symbols": [], "read": "_", "write": "_", "direction": "S" },
    { "id": "d", "from": "q1", "to": "q1",  "symbols": [], "read": "0", "write": "0", "direction": "R" },
    { "id": "e", "from": "q1", "to": "q1",  "symbols": [], "read": "Y", "write": "Y", "direction": "R" },
    { "id": "f", "from": "q1", "to": "q2",  "symbols": [], "read": "1", "write": "Y", "direction": "L" },
    { "id": "g", "from": "q2", "to": "q2",  "symbols": [], "read": "0", "write": "0", "direction": "L" },
    { "id": "h", "from": "q2", "to": "q2",  "symbols": [], "read": "Y", "write": "Y", "direction": "L" },
    { "id": "i", "from": "q2", "to": "q0",  "symbols": [], "read": "X", "write": "X", "direction": "R" },
    { "id": "j", "from": "q3", "to": "q3",  "symbols": [], "read": "Y", "write": "Y", "direction": "R" },
    { "id": "k", "from": "q3", "to": "acc", "symbols": [], "read": "_", "write": "_", "direction": "S" }
  ]
}
```

### 5.7 LBA — `{ aⁿbⁿcⁿ | n ≥ 1 }` (context-sensitive; stays within the input)

Same machine shape as a TM, but `type: "LBA"` confines the head to the input
region. This decider marks `a→X`, `b→Y`, `c→Z` in rounds, then verifies `Y*Z*`
followed by the end blank — never stepping outside the input, so it runs as an LBA.

```json
{
  "type": "LBA",
  "name": "a^n b^n c^n",
  "language": "{ a^n b^n c^n | n >= 1 }",
  "alphabet": ["a", "b", "c"],
  "blankSymbol": "_",
  "states": [
    { "id": "q0",  "label": "q0",  "isStart": true,  "isAccept": false, "x": 80,  "y": 160 },
    { "id": "q1",  "label": "q1",  "isStart": false, "isAccept": false, "x": 240, "y": 160 },
    { "id": "q2",  "label": "q2",  "isStart": false, "isAccept": false, "x": 400, "y": 160 },
    { "id": "q3",  "label": "q3",  "isStart": false, "isAccept": false, "x": 400, "y": 320 },
    { "id": "q4",  "label": "q4",  "isStart": false, "isAccept": false, "x": 240, "y": 320 },
    { "id": "acc", "label": "acc", "isStart": false, "isAccept": true,  "x": 560, "y": 160 }
  ],
  "transitions": [
    { "id": "a", "from": "q0", "to": "q1",  "symbols": [], "read": "a", "write": "X", "direction": "R" },
    { "id": "b", "from": "q0", "to": "q4",  "symbols": [], "read": "Y", "write": "Y", "direction": "R" },
    { "id": "c", "from": "q1", "to": "q1",  "symbols": [], "read": "a", "write": "a", "direction": "R" },
    { "id": "d", "from": "q1", "to": "q1",  "symbols": [], "read": "Y", "write": "Y", "direction": "R" },
    { "id": "e", "from": "q1", "to": "q2",  "symbols": [], "read": "b", "write": "Y", "direction": "R" },
    { "id": "f", "from": "q2", "to": "q2",  "symbols": [], "read": "b", "write": "b", "direction": "R" },
    { "id": "g", "from": "q2", "to": "q2",  "symbols": [], "read": "Z", "write": "Z", "direction": "R" },
    { "id": "h", "from": "q2", "to": "q3",  "symbols": [], "read": "c", "write": "Z", "direction": "L" },
    { "id": "i", "from": "q3", "to": "q3",  "symbols": [], "read": "a", "write": "a", "direction": "L" },
    { "id": "j", "from": "q3", "to": "q3",  "symbols": [], "read": "b", "write": "b", "direction": "L" },
    { "id": "k", "from": "q3", "to": "q3",  "symbols": [], "read": "Y", "write": "Y", "direction": "L" },
    { "id": "l", "from": "q3", "to": "q3",  "symbols": [], "read": "Z", "write": "Z", "direction": "L" },
    { "id": "m", "from": "q3", "to": "q0",  "symbols": [], "read": "X", "write": "X", "direction": "R" },
    { "id": "n", "from": "q4", "to": "q4",  "symbols": [], "read": "Y", "write": "Y", "direction": "R" },
    { "id": "o", "from": "q4", "to": "q4",  "symbols": [], "read": "Z", "write": "Z", "direction": "R" },
    { "id": "p", "from": "q4", "to": "acc", "symbols": [], "read": "_", "write": "_", "direction": "S" }
  ]
}
```

### Multi-tape TM — `{ aⁿbⁿ | n ≥ 0 }`

Two tapes (`tapeCount: 2`). Tape 1 holds the input; tape 2 is a counter. Copy each
`a` onto tape 2 (heads move right together), then on the first `b` rewind tape 2 and
match every `b` against an `a` while retreating tape 2. Accept when both tapes hit
blank together. Every transition carries `reads`/`writes`/`directions` of length 2.

```json
{
  "type": "TM",
  "name": "a^n b^n (2-tape)",
  "language": "{ a^n b^n | n >= 0 }",
  "alphabet": ["a", "b"],
  "blankSymbol": "_",
  "tapeCount": 2,
  "states": [
    { "id": "qs",  "label": "qs",  "isStart": true,  "isAccept": false, "x": 80,  "y": 160 },
    { "id": "q0",  "label": "q0",  "isStart": false, "isAccept": false, "x": 240, "y": 160 },
    { "id": "q1",  "label": "q1",  "isStart": false, "isAccept": false, "x": 400, "y": 160 },
    { "id": "acc", "label": "acc", "isStart": false, "isAccept": true,  "x": 560, "y": 160 }
  ],
  "transitions": [
    { "id": "s0", "from": "qs", "to": "acc", "symbols": [], "reads": ["_", "_"], "writes": ["_", "_"], "directions": ["S", "S"] },
    { "id": "s1", "from": "qs", "to": "q0",  "symbols": [], "reads": ["a", "_"], "writes": ["a", "a"], "directions": ["R", "R"] },
    { "id": "a",  "from": "q0", "to": "q0",  "symbols": [], "reads": ["a", "_"], "writes": ["a", "a"], "directions": ["R", "R"] },
    { "id": "b",  "from": "q0", "to": "q1",  "symbols": [], "reads": ["b", "_"], "writes": ["b", "_"], "directions": ["S", "L"] },
    { "id": "d",  "from": "q1", "to": "q1",  "symbols": [], "reads": ["b", "a"], "writes": ["b", "a"], "directions": ["R", "L"] },
    { "id": "e",  "from": "q1", "to": "acc", "symbols": [], "reads": ["_", "_"], "writes": ["_", "_"], "directions": ["S", "S"] }
  ]
}
```

---

## 6. Generation checklist (for an AI producing a machine)

1. Pick the correct `type`; FA edges use `symbols`, PDA edges use `read`/`pop`/`push`, TM/LBA edges use `read`/`write`/`direction` — PDA and TM set `symbols: []`.
2. Exactly **one** state has `isStart: true`; mark accepting states with `isAccept: true`.
3. Give every state a unique `id`; make sure every transition `from`/`to` matches a state `id`.
4. Use ε correctly: `["ε"]` for ENFA edges; `""` for PDA `read`/`pop`/`push`.
5. PDA: remember **top = last array element**, **push puts its first char on top**, and acceptance is **by final state with input consumed** (use a bottom marker like `Z` for empty-stack-style languages).
6. NFA has **no** ε-edges — use ENFA when you need them.
7. TM/LBA: every transition needs a `direction` (`L`/`R`/`S`); keep **≤ 1 move per `(state, read)`** (deterministic); `read`/`write` are single symbols (empty = blank); acceptance is **by halting in an accept state**, and you may add `isReject` states. Add `blankSymbol`/`stepLimit` only to override the defaults (`"_"` / `10000`). For an **LBA**, the head must stay within the input region `[0, n]`.
8. Multi-tape TM: set `tapeCount: N` (`N > 1`) and give every transition `reads`/`writes`/`directions` arrays of length `N` (the scalar `read`/`write`/`direction` are then ignored). The input loads onto tape 1 only; determinism is per **read-tuple**. LBA stays single-tape.
9. Give states spread-out `x`/`y` (or accept overlap and use in-app Auto Layout).
