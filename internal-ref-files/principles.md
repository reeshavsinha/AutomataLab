> **VERSION NOTE (2026-09-05):** Current package and Tauri manifests report
> **5.0.0**. These principles are current; any release labels below are
> historical context.

# AutomataLab Project Principles

> These principles govern every architectural decision, feature implementation, refactor, dependency addition, UI workflow, algorithm, and educational experience in AutomataLab.
>
> They are intentionally conservative.
>
> New code must conform to these principles.
>
> If a proposed feature violates them, the feature should be reconsidered before implementation.

---

# 1. Educational Mission

AutomataLab exists to become:

```text
The Visual Studio Code of Theoretical Computer Science
```

The project is not intended to become:

* A Learning Management System
* A Classroom Platform
* A SaaS Product
* A Social Platform
* A Cloud Service
* An AI Assistant

The project is intended to become:

* The best automata simulator
* The best formal language workbench
* The best parser construction environment
* The best computation model visualizer
* The best theoretical computer science research sandbox
* The best academic publishing tool for automata theory

Every feature should strengthen this mission.

---

# 2. Offline First

Everything must function without internet access.

Requirements:

* No cloud dependencies
* No hosted services
* No required online accounts
* No telemetry
* No analytics
* No remote storage

The application must remain fully functional in disconnected environments such as:

* university laboratories
* classrooms
* research facilities
* personal machines

---

# 3. Local Ownership

Users own their data.

Requirements:

* All data remains local
* No forced synchronization
* No account systems
* No subscriptions
* No vendor lock-in

User files must remain portable and inspectable.

---

# 4. Separation of Concerns

The application is divided into distinct layers.

```text
UI
↓
Stores
↓
Engines
```

Requirements:

* Engines never import React
* Engines never import UI code
* Engines never import DOM APIs
* Stores bridge UI and engines
* UI handles presentation only

Theoretical logic belongs in engines.

Rendering belongs in UI.

---

# 5. Pure Engine Architecture

All theoretical computation must remain pure.

Examples:

* simulation
* conversion
* minimization
* parsing
* validation
* ambiguity detection
* equivalence checking

Requirements:

* deterministic inputs
* deterministic outputs
* no hidden state
* no UI dependencies

Every algorithm should be unit-testable in isolation.

---

# 6. Theory Before Presentation

Correctness always outranks appearance.

Priority order:

```text
Correctness
↓
Educational Value
↓
Usability
↓
Aesthetics
```

An attractive incorrect algorithm is unacceptable.

A visually simple correct algorithm is acceptable.

---

# 7. Educational Transparency

Algorithms should expose reasoning.

Users should understand:

```text
What happened?
Why did it happen?
How was it computed?
```

Examples:

* FIRST/FOLLOW derivations
* closure computation
* subset construction
* state minimization
* parsing actions
* conflict resolution

Black-box educational experiences should be avoided.

---

# 8. Educational Traceability

Every result should be traceable to its origin.

Users must be able to answer:

```text
What produced this?
```

Examples:

* grammar rule → parser action
* grammar rule → LR item
* LR item → parser state
* parser state → parse table cell
* conversion state → resulting state
* ambiguity result → conflicting derivations

Results without provenance are educationally weaker.

---

# 9. Cross-Representation Synchronization

AutomataLab is a connected system.

Not a collection of independent viewers.

Representations should remain synchronized whenever meaningful.

Examples:

```text
Grammar
↔ Dependency Graph

Grammar
↔ Parse Table

Grammar Rule
↔ LR Item

LR Item
↔ Automaton State

Parse Table
↔ Parser Execution

Parser Execution
↔ Parse Tree
```

Synchronization should improve understanding.

Never synchronize purely for visual novelty.

---

# 10. Workspace Parity

No workspace may feel like a secondary citizen.

The following environments must maintain comparable quality:

* Workspace Hub
* Machine Workspace
* Grammar Laboratory
* Parser Studio
* Regex mode within Grammar Laboratory
* Future Research Workspaces

Parity includes:

* discoverability
* workflow depth
* visual density
* feature maturity
* polish

Differences should arise from domain requirements, not development neglect.

---

# 11. Explicit Types Over Generic Abstractions

Prefer:

```text
DFA
NFA
ENFA
DPDA
NPDA
TM
LBA
```

over:

```text
GenericAutomaton<T>
```

Requirements:

* discriminated unions
* explicit interfaces
* explicit machine boundaries
* explicit type-gating

Theoretical distinctions should remain visible in code.

---

# 12. Algorithms Over Frameworks

Prefer explicit implementations.

Examples:

* subset construction
* Hopcroft minimization
* Thompson construction
* Earley parsing
* LR table generation

Avoid unnecessary abstraction layers.

Contributors should be able to read and understand the implementation directly.

---

# 13. Scalability Before Features

A feature is incomplete until it scales.

Examples:

* large automata
* large grammars
* large parse trees
* large parse tables
* long-running simulations

Requirements:

* virtualization where necessary
* bounded resource consumption
* graceful degradation
* predictable performance

Correctness alone is insufficient.

---

# 14. State Integrity

State corruption is unacceptable.

Requirements:

* no stale references
* no orphaned entities
* no impossible states
* no synchronization cycles
* no invalid restoration paths

All stores must preserve consistency.

Especially:

* machineStore
* simulationStore
* uiStore
* historyStore
* traceabilityStore
* tmDebugStore
* parserStore
* grammarStore

---

# 15. Undo/Redo Reliability

Undo and redo are core infrastructure.

Requirements:

* reversible operations
* deterministic restoration
* no history corruption
* no invalid replays
* no impossible snapshots

Users must trust experimentation.

---

# 16. Interoperability First

Migration friction should be minimized.

Support should favor:

* JFLAP compatibility
* open formats
* standard exports
* portable files
* reproducible artifacts

Users should never be forced to recreate existing academic work.

---

# 17. Exportability

Everything educationally valuable should be exportable.

Examples:

* automata
* parse trees
* dependency graphs
* parse tables
* derivations
* analysis reports

Export formats should prioritize:

* publication
* lecture slides
* assignments
* exams
* research papers

---

# 18. Accessibility

Accessibility is a functional requirement.

Requirements:

* keyboard navigation
* screen reader consideration
* color-independent communication
* focus management
* shortcut discoverability

Accessibility should be considered during design rather than retrofitted later.

---

# 19. Minimal Dependencies

Do not add dependencies casually.

Before adding a dependency:

* evaluate alternatives
* evaluate maintenance burden
* evaluate bundle impact
* evaluate lock-in risk

Dependencies must provide substantial value.

---

# 20. Strong Type Safety

TypeScript is part of the architecture.

Requirements:

* strict typing
* explicit interfaces
* exhaustive matching
* no unnecessary any usage

Core domain models must remain centralized.

---

# 21. Research-Grade Correctness

Educational software carries academic responsibility.

Requirements:

* theoretical correctness
* reproducibility
* deterministic results
* mathematical validity

A subtle algorithmic bug can invalidate an entire educational experience.

---

# 22. Classroom Readiness

Features should support real academic workflows.

Examples:

* lecture preparation
* assignment creation
* demonstrations
* laboratory exercises
* exam preparation

Educational usefulness outweighs novelty.

---

# 23. Open Source Sustainability

Future contributors must be able to understand the system.

Requirements:

* clear architecture
* explicit decisions
* documented rationale
* maintainable abstractions

The codebase should become easier to understand over time.

---

# 24. Architectural Stability

Do not introduce change without justification.

Questions to ask:

* Does this solve a real problem?
* Does this simplify the system?
* Does this improve educational value?
* Does this preserve architectural integrity?

Complexity requires justification.

Simplicity does not.

---

# 25. Long-Term Vision

Every major decision should be evaluated against this question:

```text
Does this move AutomataLab closer to becoming
the definitive environment for theoretical
computer science?
```

If the answer is unclear, the decision should be reconsidered.
