# AutomataLab — Requirements Specification

## 1. Functional Requirements

### 1.1 Core Entities
- **REQ-1.1.1:** The system shall support creation of states with attributes: ID, Label, X-coordinate, Y-coordinate, IsStart, IsAccept, IsReject.
- **REQ-1.1.2:** The system shall support creation of transitions between states with attributes: FromState, ToState, ReadSymbol, WriteSymbol, Direction, PopSymbol, PushSymbol.
- **REQ-1.1.3:** The system shall enforce exactly one Start State per machine.

### 1.2 User Interface
- **REQ-1.2.1:** The system shall provide a drag-and-drop canvas for placing and moving states.
- **REQ-1.2.2:** The system shall allow users to connect states by dragging edges between them to create transitions.
- **REQ-1.2.3:** The system shall provide visual feedback for selected elements and allow deletion via UI or keyboard (Delete key).

### 1.3 Simulation Execution
- **REQ-1.3.1:** The system shall accept an input string for simulation.
- **REQ-1.3.2:** The system shall support Step-by-Step execution, advancing the machine by one transition at a time.
- **REQ-1.3.3:** The system shall support Continuous execution with a configurable speed setting.
- **REQ-1.3.4:** The system shall visually highlight the currently active state(s) and the current input symbol being read.

### 1.4 Machine-Specific Features
- **REQ-1.4.1 (NFA/NPDA):** The system shall compute and display all possible branches of a non-deterministic computation.
- **REQ-1.4.2 (PDA):** The system shall visually represent the stack and animate push/pop operations.
- **REQ-1.4.3 (TM):** The system shall visually represent an infinite tape and animate the read/write head movement.

### 1.5 Persistence
- **REQ-1.5.1:** The system shall allow exporting the complete machine definition to a JSON file.
- **REQ-1.5.2:** The system shall allow importing a machine definition from a valid JSON file.

## 2. Non-Functional Requirements

### 2.1 Performance
- **NFR-2.1.1:** UI interactions (dragging, clicking) shall respond within 50ms.
- **NFR-2.1.2:** The simulation engine shall calculate the next step configuration in under 10ms for standard inputs.

### 2.2 Usability
- **NFR-2.2.1:** The application shall not require writing code or external scripts to define or run machines.

### 2.3 Maintainability
- **NFR-2.3.1:** The simulation engine logic shall be completely decoupled from the React/UI rendering layer.

### 2.4 Robustness
- **NFR-2.4.1:** Every simulation engine shall terminate on all inputs. Non-halting or explosively-branching computations shall be bounded by a step ceiling and a frontier-width cap, and reported as `stuck`, rather than hanging the UI or exhausting memory.
- **NFR-2.4.2:** Importing a malformed, corrupt, or untrusted machine file shall fail with a clear error and never crash the application; the loader shall read only known fields (no prototype pollution).
