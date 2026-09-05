# Complete Compiler Design Reference Handbook

This handbook provides an exhaustive, mathematically rigorous, and structurally complete theoretical reference for **Compiler Design**. It maps directly to your compiler syllabus and is designed to serve as the definitive theoretical guide for **AutomataLab** simulation engines, compiler front-ends, and parser generators.

---

## Table of Contents
1. [Module 1: Lexical Analysis](#module-1-lexical-analysis)
   - [1.1 The Compiler Pipeline & Front-End Structure](#11-the-compiler-pipeline--front-end-structure)
   - [1.2 Tokens, Lexemes, Patterns, and Categories](#12-tokens-lexemes-patterns-and-categories)
   - [1.3 Input Buffering & Lookahead Strategies](#13-input-buffering--lookahead-strategies)
   - [1.4 Lexical Analyzer Construction: RE to DFA & Minimization](#14-lexical-analyzer-construction-re-to-dfa--minimization)
   - [1.5 Longest Match, Rollback, and Ambiguity Resolution](#15-longest-match-rollback-and-ambiguity-resolution)
2. [Module 2: Parsing / Syntax Analysis (Top-Down)](#module-2-parsing--syntax-analysis-top-down)
   - [2.1 Context-Free Grammar Basics & Formal Definitions](#21-context-free-grammar-basics--formal-definitions)
   - [2.2 Syntactic Derivations & Parse Trees](#22-syntactic-derivations--parse-trees)
   - [2.3 Grammar Ambiguity & Operator Associativity/Precedence](#23-grammar-ambiguity--operator-associativityprecedence)
   - [2.4 Top-Down Parsing: Recursive Descent & Backtracking](#24-top-down-parsing-recursive-descent--backtracking)
   - [2.5 Predictive LL(1) Parsing: FIRST & FOLLOW Calculations](#25-predictive-ll1-parsing-first--follow-calculations)
   - [2.6 Left Recursion Elimination & Left Factoring Algorithms](#26-left-recursion-elimination--left-factoring-algorithms)
3. [Module 3: Bottom-Up Parsing](#module-3-bottom-up-parsing)
   - [3.1 Shift-Reduce Parsing & Handle Pruning](#31-shift-reduce-parsing--handle-pruning)
   - [3.2 Operator-Precedence Parsing (OPG)](#32-operator-precedence-parsing-opg)
   - [3.3 The LR Parsing Family: Core Theory & LR(0) Automata](#33-the-lr-parsing-family-core-theory--lr0-automata)
   - [3.4 SLR(1), CLR(1), and LALR(1) Parsers](#34-slr1-clr1-and-lalr1-parsers)
   - [3.5 LR Parsing Table Construction: ACTION & GOTO Tables](#35-lr-parsing-table-construction-action--goto-tables)
   - [3.6 Shift-Reduce & Reduce-Reduce Conflict Analysis](#36-shift-reduce--reduce-reduce-conflict-analysis)
   - [3.7 Parsing Power & State Complexity Comparison](#37-parsing-power--state-complexity-comparison)
4. [Module 4: Syntax-Directed Translation](#module-4-syntax-directed-translation)
   - [4.1 Syntax-Directed Definitions (SDDs): Attributes & Rules](#41-syntax-directed-definitions-sdds-attributes--rules)
   - [4.2 Synthesized Attributes & S-Attributed Definitions](#42-synthesized-attributes--s-attributed-definitions)
   - [4.3 Inherited Attributes & L-Attributed Definitions](#43-inherited-attributes--l-attributed-definitions)
   - [4.4 Syntax-Directed Translation Schemes (SDTs)](#44-syntax-directed-translation-schemes-sdts)
   - [4.5 Applications: Evaluations, Type Checking, and ICG](#45-applications-evaluations-type-checking-and-icg)
5. [Module 5: Runtime Environments](#module-5-runtime-environments)
   - [5.1 Logic & Memory Organization: Code, Static, Stack, and Heap](#51-logic--memory-organization-code-static-stack-and-heap)
   - [5.2 Activation Records & Stack Frames](#52-activation-records--stack-frames)
   - [5.3 Procedure Call/Return Linkage Sequences](#53-procedure-callreturn-linkage-sequences)
   - [5.4 Parameter Passing Mechanisms](#54-parameter-passing-mechanisms)
6. [Module 6: Intermediate Code Generation](#module-6-intermediate-code-generation)
   - [6.1 ASTs vs. Directed Acyclic Graphs (DAGs)](#61-asts-vs-directed-acyclic-graphs-dags)
   - [6.2 Three-Address Code (TAC) Representations: Quadruples & Triples](#62-three-address-code-tac-representations-quadruples--triples)
   - [6.3 Control-Flow & Boolean Short-Circuit Generation](#63-control-flow--boolean-short-circuit-generation)
   - [6.4 One-Pass Code Generation via Backpatching](#64-one-pass-code-generation-via-backpatching)
7. [Module 7: Local Optimization](#module-7-local-optimization)
   - [7.1 Basic Block Construction & Leader Identification](#71-basic-block-construction--leader-identification)
   - [7.2 Value Numbering & DAG-Based Transformations](#72-value-numbering--dag-based-transformations)
   - [7.3 Local Optimizations: Constant Folding, CSE, Copy Propagation](#73-local-optimizations-constant-folding-cse-copy-propagation)
8. [Module 8: Data-Flow Analysis](#module-8-data-flow-analysis)
   - [8.1 Control Flow Graphs & Data-Flow Frameworks](#81-control-flow-graphs--data-flow-frameworks)
   - [8.2 Liveness Analysis: Equations & Iterative Solution](#82-liveness-analysis-equations--iterative-solution)
   - [8.3 Available Expressions & Global CSE Analysis](#83-available-expressions--global-cse-analysis)
   - [8.4 Reaching Definitions & Iterative Fixed-Point Analysis](#84-reaching-definitions--iterative-fixed-point-analysis)

---
## Module 1: Lexical Analysis

### 1.1 The Compiler Pipeline & Front-End Structure
A compiler translates a source program in a high-level language into an equivalent program in a target language [143]. To manage this complex translation, the compiler is structurally split into two halves: the **Front End (Analysis)** and the **Back End (Synthesis)** [150-151]. 

The logical stages of this pipeline operate sequentially, transforming the representations of the program [151]:

```text
Source Code
    │
    ▼
[ Lexical Analyzer (Scanner) ]  ───► Reads character stream, emits Token stream [153]
    │
    ▼
[ Syntax Analyzer (Parser) ]    ───► Verifies syntax, constructs Syntax Tree [157]
    │
    ▼
[ Semantic Analyzer ]          ───► Performs type checking and coercions [159]
    │
    ▼
[ Intermediate Code Gen ]      ───► Creates low-level machine-independent IR [160]
    │
    ▼
[ Code Optimizer ]             ───► Minimizes instructions and redundancies [162]
    │
    ▼
[ Target Code Generator ]      ───► Produces assembly or relocatable machine code [164]
    │
    ▼
Target Program
```

The entire front end relies on a unified **Symbol Table** [151-152]. It acts as a central repository that records the names, types, scopes, size offsets, and argument counts of all identifiers discovered throughout the compilation process [166-167].

### 1.2 Tokens, Lexemes, Patterns, and Categories
During the initial scanning phase, we classify sequences of raw characters into structured tokens [154]:
1. **Token**: An abstract category representing a terminal symbol in the grammar of the programming language (e.g., `id`, `number`, `keyword`, `comparison_operator`) [154, 306].
2. **Lexeme**: The actual instance of characters in the source code matching the pattern of a token (e.g., `count`, `3.1415`, `while`) [154, 306].
3. **Pattern**: The formal descriptive rule (written as a regular expression) that a lexeme must satisfy to be classified as a specific token [306, 310].

Lexical tokens typically fall into the following core categories [1]:
*   **Keywords**: Reserved words with explicit, immutable syntactic meanings (e.g., `if`, `while`, `else`, `return`) [154, 257].
*   **Identifiers**: User-defined variable and function names [154, 155].
*   **Operators**: Mathematical, logical, and relational symbols (e.g., `+`, `-`, `*`, `&&`, `<=`, `!=`) [154, 258].
*   **Constants**: Hardcoded integer, floating-point, character, or string literals [154, 258].
*   **Separators**: Structural punctuation such as semicolons, commas, and parentheses [1].

### 1.3 Input Buffering & Lookahead Strategies
Scanner performance is heavily bounded by the speed of character input-output operations [306]. To reduce systemic overhead, compilers employ specialized **input buffering** strategies utilizing **buffer pairs** and **sentinels** [309]:

```text
           First Buffer (N bytes)           Second Buffer (N bytes)
     ┌─────────────────────────────────┐┌─────────────────────────────────┐
     │ p │ o │ s │ i │ t │ i │ o │ n │*││ r │ a │ t │ e │   │ 6 │ 0 │ ; │eof│
     └─────────────────────────────────┘└─────────────────────────────────┘
       ▲                             ▲
       │                             │
  lexemeBegin                     forward
```

1. **Buffer Pairs**: Memory is allocated as two contiguous blocks of size $N$ (usually $N = 4096$ bytes, matching a disk block size) [309]. While the scanner processes characters in one buffer, the system loads the next block of the input file into the other buffer using a single efficient system read command [309].
2. **Pointers**:
   *   `lexemeBegin`: Points to the first character of the lexeme currently being identified [309].
   *   `forward`: Moves ahead one character at a time to examine the lookahead stream [309].
3. **Sentinels**: To avoid performing two boundary checks at every character read (checking for buffer end and checking for special characters), the compiler inserts a special EOF (End-of-File) sentinel character at the end of each buffer [309]. When `forward` reads the sentinel, the scanner loads the other buffer if it has reached the middle marker, or terminates scanning if it represents the true end of file [309].

### 1.4 Lexical Analyzer Construction: RE to DFA & Minimization
Industrial scanner construction is completely automated by compiler generators like **Lex/Flex** [302, 316]:

1. **Regular Expressions (RE)**: Lexical patterns are written declaratively as algebraic equations [310, 318]. For instance:
   $$\text{id} = \text{letter}(\text{letter} \mid \text{digit})^*$$ [310]
2. **Thompson's Construction (RE $\to \epsilon$-NFA)**: Recursively compiles regular expressions into non-deterministic finite automata with empty transitions ($\epsilon$-transitions) [326]. 
3. **Subset Construction (NFA $\to$ DFA)**: Compiles the non-deterministic automaton into a deterministic finite automaton (DFA) [326]. It defines the DFA's states as subsets of NFA states and uses the $\epsilon$-closure operator [327]:
   $$\text{ECLOSE}(S) = \bigcup_{q \in S} \text{ECLOSE}(q)$$ [369, 511]
4. **DFA Minimization (Table-Filling Algorithm)**: Identifies and merges indistinguishable states to reduce the transition table footprint in memory [331]. State equivalence partitions the states into minimal blocks [668-669], eliminating redundant paths [133].

### 1.5 Longest Match, Rollback, and Ambiguity Resolution
A raw character stream can often match multiple regular expressions simultaneously [315]. Scanner generators handle these conflicts using two foundational rules [321, 324]:
1. **Longest Match (Maximal Munch)**: If multiple prefixes match valid patterns, the scanner prefers the prefix that consumes the *maximum* number of input characters [315].
   *   *Example*: The input `elsewhere` is matched as the identifier token `elsewhere` ($9$ characters) rather than the keyword token `else` ($4$ characters) [110-111].
   *   *Rollback*: The scanner moves the `forward` pointer ahead, simulating the DFA until it hits a dead state [110, 114]. It then rolls back the pointer and the state machine to the *last known accepting state*, outputs that token, and restarts scanning from the rolled-back location [111, 114].
2. **First-Match Priority**: If two patterns match identical prefixes of the same length, the pattern declared *earliest* in the scanner specification file takes precedence [322, 324].
   *   *Example*: Both `if` as a keyword and `if` as an identifier match the lexeme `if` with length $2$. Since keywords are declared before identifiers in the Lex specification, the keyword token `IF` is successfully matched and returned [324].

---
## Module 2: Parsing / Syntax Analysis (Top-Down)

### 2.1 Context-Free Grammar Basics & Formal Definitions
The syntax of programming languages is formally defined using a **Context-Free Grammar (CFG)** [336]. A CFG is represented mathematically as a **4-tuple** [686]:
$$G = (V, T, P, S)$$ [686]

Where:
*   $V$ is a finite set of **variables** (non-terminals) representing syntactic structures [169, 686].
*   $T$ is a finite set of **terminals** (disjoint from $V$) representing token types emitted by the scanner [169, 686].
*   $P$ is a finite set of **productions**, each mapping a variable to a string of variables and terminals: $A \to \alpha$ where $A \in V$ and $\alpha \in (V \cup T)^*$ [170, 172, 686].
*   $S \in V$ is the designated **start symbol** representing the root of the grammar [170, 686].

### 2.2 Syntactic Derivations & Parse Trees
A derivation is a sequence of rewriting steps showing how a string of terminals is derived from the start symbol $S$ using production rules [173, 175]:
*   **Leftmost Derivation (LMD)**: At each step, the leftmost non-terminal in the sentential form is replaced first [178, 696].
*   **Rightmost Derivation (RMD)**: At each step, the rightmost non-terminal is replaced first [178, 696]. Bottom-up parsers generate a rightmost derivation in reverse [424].

A **Parse Tree** is a graphical representation of a derivation that abstracts away the specific replacement order of the non-terminals [180, 707]:
*   The **Root** is labeled by the start symbol $S$ [708].
*   **Interior Nodes** are variables $A \in V$ [708].
*   **Leaves** are terminals $a \in T$ or $\epsilon$ [708].
*   The **Yield** is the sequence of terminals at the leaves read from left to right [181].

### 2.3 Grammar Ambiguity & Operator Associativity/Precedence
A grammar $G$ is **ambiguous** if there exists some string $w \in L(G)$ that can produce two or more distinct parse trees [185, 762]. This is equivalent to having multiple distinct leftmost derivations or multiple distinct rightmost derivations [185, 762].

#### Critical Properties of Grammatical Ambiguity [21, 22]
1. **Tree Isomorphism**: A CFG is unambiguous if and only if for all strings $w \in L(G)$, the Leftmost Derivation Tree (LMDT) is identical to the Rightmost Derivation Tree (RMDT) [21]. That is:
   $$\text{Unambiguous} \iff \text{LMDT}(w) \equiv \text{RMDT}(w) \quad \forall w \in L(G)$$
2. **Mutual Recursion Rule**: If a grammar contains a non-terminal that is both left-recursive and right-recursive (either immediately or transitively), the grammar is **guaranteed to be ambiguous** [22].
   * *Example*: $S \to S0S \mid 1$ is both left-recursive and right-recursive, producing multiple trees for $10101$ [22].
3. **Undecidability of Ambiguity**: The ambiguity of a general Context-Free Grammar is **undecidable** [21]. There is no algorithm that can take an arbitrary CFG and determine in finite time whether it is ambiguous or not [21].

Consider the classic ambiguous expression grammar [185]:
$$E \to E + E \mid E \times E \mid \text{id}$$

The string $\text{id} + \text{id} \times \text{id}$ has two distinct parse trees [185]. Ambiguity is resolved by splitting non-terminals to enforce strict **precedence** and **associativity** rules [97, 756]:
1. **Factor ($F$)**: The highest precedence blocks, immune to splitting (e.g., parenthesized expressions, identifiers) [97, 758]:
   $$F \to \text{id} \mid (E)$$ [757]
2. **Term ($T$)**: Middle precedence level, binding multiplicative operations [97, 758]:
   $$T \to T \times F \mid F$$ [757]
3. **Expression ($E$)**: Lowest precedence level, binding additive operations [98, 760]:
   $$E \to E + T \mid T$$ [757]

#### The Dangling-Else Ambiguity
The standard conditional grammar is ambiguous [351]:
$$\text{stmt} \to \text{if } E \text{ then } \text{stmt} \mid \text{if } E \text{ then } \text{stmt} \text{ else } \text{stmt} \mid \text{other}$$

The string `if E1 then if E2 then S1 else S2` is ambiguous because `else` can pair with either the outer or inner `if` [351]. We resolve this by forcing the parser to match each `else` with the *closest unmatched* `if` [351]:
$$\begin{aligned}
\text{stmt} &\to \text{matched\_stmt} \mid \text{open\_stmt} \\
\text{matched\_stmt} &\to \text{if } E \text{ then } \text{matched\_stmt} \text{ else } \text{matched\_stmt} \mid \text{other} \\
\text{open\_stmt} &\to \text{if } E \text{ then } \text{stmt} \mid \text{if } E \text{ then } \text{matched\_stmt} \text{ else } \text{open\_stmt}
\end{aligned}$$ [351]

### 2.4 Top-Down Parsing: Recursive Descent & Backtracking
Top-down parsing starts at the root (the start symbol) and constructs the parse tree down to the leaves (terminals) [340].
*   **Recursive Descent Parsing**: A backtracking parser that implements a separate recursive function for each non-terminal in the grammar [236, 246]. If a production choice fails to match the lookahead symbol, the parser backtracks by restoring its stack pointer and input buffer, and attempts the next production alternative [3].
*   **Predictive Parsing (Non-backtracking)**: A highly efficient form of top-down parsing that scans the input from left to right, uses $1$ lookahead symbol, and selects the unique correct production rule without backtracking [236, 238, 341]. Predictive parsing requires the grammar to be $LL(1)$ [341].

### 2.5 Predictive LL(1) Parsing: FIRST & FOLLOW Calculations
To construct a non-backtracking predictive LL(1) parsing table, we calculate two mathematical sets for all grammar symbols [95]:

#### 1. FIRST Set Calculation
For any grammar string $\alpha$, $\text{FIRST}(\alpha)$ is the set of terminals that can appear as the first symbol of a string derived from $\alpha$ [95]:
*   If $X$ is a terminal, then $\text{FIRST}(X) = \{X\}$ [95].
*   If $X \to \epsilon$ is a production, then add $\epsilon$ to $\text{FIRST}(X)$ [95].
*   If $X \to Y_1 Y_2 \dots Y_k$ is a production, then add $a \in \text{FIRST}(Y_i)$ to $\text{FIRST}(X)$ if $\epsilon \in \text{FIRST}(Y_1 \dots Y_{i-1})$ [95]. Add $\epsilon$ to $\text{FIRST}(X)$ if and only if $\epsilon \in \text{FIRST}(Y_j)$ for all $j = 1 \dots k$ [95].

#### 2. FOLLOW Set Calculation
For any non-terminal $A$, $\text{FOLLOW}(A)$ is the set of terminals that can appear immediately to the right of $A$ in some sentential form [95]:
*   Add $\$$ (the input endmarker) to $\text{FOLLOW}(S)$, where $S$ is the start symbol [95].
*   If there is a production $A \to \alpha B \beta$, then add everything in $\text{FIRST}(\beta)$ (except $\epsilon$) to $\text{FOLLOW}(B)$ [95].
*   If there is a production $A \to \alpha B$, or $A \to \alpha B \beta$ where $\epsilon \in \text{FIRST}(\beta)$, then add everything in $\text{FOLLOW}(A)$ to $\text{FOLLOW}(B)$ [95].

#### Table Construction Algorithm
We construct the LL(1) parsing table $M[A, a]$ as follows:
*   For each production $A \to \alpha$ in the grammar:
    *   For each terminal $a \in \text{FIRST}(\alpha)$, add $A \to \alpha$ to $M[A, a]$ [357].
    *   If $\epsilon \in \text{FIRST}(\alpha)$, then for each terminal $b \in \text{FOLLOW}(A)$ (including $\$$), add $A \to \alpha$ to $M[A, b]$ [357].
*   Every empty cell in $M[A, a]$ represents a syntax error [357].

### 2.6 Left Recursion Elimination & Left Factoring Algorithms
Predictive $LL(1)$ parsers cannot handle grammars containing **left recursion** or **common prefixes** [239, 350]. We transform the grammar using the following algorithms:

#### 1. Immediate Left Recursion Elimination
A production of the form $A \to A\alpha \mid \beta$ is left-recursive and causes infinite loops in top-down parsers [212]. We eliminate immediate left recursion by introducing a new variable $A'$ [212]:
$$\begin{aligned}
A &\to \beta A' \\
A' &\to \alpha A' \mid \epsilon
\end{aligned}$$ [212]

#### Conversion of CFG to Regular Right Grammar (RRG) [18]
Certain context-free grammars that generate regular languages can be parsed or converted into Right Regular Grammars (or Right Linear Grammars) using left-recursion elimination [18]:
*   *Example*: $S \to SSS \mid a$. Let $\alpha = SS$ and $\beta = a$. Converting this immediate left recursion yields [18]:
    $$\begin{aligned}
    S &\to a S' \\
    S' &\to SS S' \mid \epsilon
    \end{aligned}$$
*   *Example*: $S \to Sa \mid aS \mid b$. We first group the left-recursive parts: $S \to S a \mid (aS \mid b)$. Treating the non-left-recursive part as $\beta_1 = aS$ and $\beta_2 = b$, we get [18]:
    $$\begin{aligned}
    S &\to aS S' \mid b S' \\
    S' &\to a S' \mid \epsilon
    \end{aligned}$$

#### 2. Advanced Left Factoring
If a variable has multiple production choices starting with a common prefix, the parser cannot decide which production to select with $1$ lookahead symbol [214]. We apply left factoring to defer the choice [214]:
$$\begin{aligned}
A &\to \alpha A' \\
A' &\to \beta_1 \mid \beta_2
\end{aligned}$$ [214]

In complex grammars, prefixes can be nested or contain compound strings [23]:
*   **Case 1**: $A \to aAb \mid aad \mid e$.
    The common prefix is $a$. Left factoring once [23]:
    $$\begin{aligned}
    A &\to a B \mid e \\
    B &\to Ab \mid ad
    \end{aligned}$$
*   **Case 2**: $A \to (A)A \mid (A)Ab \mid (A)Aba \mid e \mid f$.
    Here, the common prefix is $(A)A$. Grouping these [23]:
    $$\begin{aligned}
    A &\to (A)A C \mid e \mid f \\
    C &\to \epsilon \mid b B \\
    B &\to \epsilon \mid a
    \end{aligned}$$

#### 3. LL(1) Pairwise Disjointness Checks [40]
To verify if a grammar is LL(1), we must check that for every non-terminal $A$ with productions $A \to \alpha_1 \mid \alpha_2 \mid \dots \mid \alpha_n$, the FIRST sets are pairwise disjoint [40].
*   *Non-LL(1) Example 1*:
    $$\begin{aligned}
    S &\to aAb \mid Ba \\
    A &\to ab \mid bb \\
    B &\to ab \mid b
    \end{aligned}$$
    We calculate FIRST sets for the $S$-production alternatives [40]:
    $$\text{FIRST}(aAb) = \{a\}$$
    $$\text{FIRST}(Ba) = \text{FIRST}(B) = \{a, b\}$$
    Since $\text{FIRST}(aAb) \cap \text{FIRST}(Ba) = \{a\} \neq \emptyset$, this grammar is **not LL(1)** [40].
*   *Non-LL(1) Example 2*:
    $$\begin{aligned}
    S &\to aAb \mid bB \\
    A &\to aAb \mid \epsilon \\
    B &\to bBa \mid aA \mid \epsilon
    \end{aligned}$$
    Checking $S$-productions: $\text{FIRST}(aAb) = \{a\}$ and $\text{FIRST}(bB) = \{b\}$, which are disjoint [40].
    Checking $A$-productions: $\text{FIRST}(aAb) = \{a\}$ and $\text{FIRST}(\epsilon) = \{\epsilon\}$, disjoint [40].
    Checking $B$-productions: $\text{FIRST}(bBa) = \{b\}$, $\text{FIRST}(aA) = \{a\}$, and $\text{FIRST}(\epsilon) = \{\epsilon\}$. Since $B \to \epsilon$, we must verify that $\text{FIRST}(bBa) \cap \text{FOLLOW}(B) = \emptyset$ [40].
    Since $S \to bB$, $\text{FOLLOW}(B) = \text{FOLLOW}(S) = \{\$\}$.
    Thus, $\{b\} \cap \{\$\} = \emptyset$, and $\{a\} \cap \{\$\} = \emptyset$. This makes the grammar **fully LL(1)** [40].

---
## Module 3: Bottom-Up Parsing

### 3.1 Shift-Reduce Parsing & Handle Pruning
Bottom-up parsing corresponds to constructing a parse tree starting at the leaves and working up towards the root [340, 359]. This is formulated as **Shift-Reduce Parsing** [360].

#### 1. Core Operations
*   **Shift**: Push the current lookahead token from the input buffer onto the parsing stack [361, 364].
*   **Reduce**: Identify a substring on top of the stack that matches the body of a production rule, and replace it with the non-terminal head of that rule [361, 364].
*   **Accept**: Declare successful syntax verification [364].
*   **Error**: Invoke syntax error recovery routines [364].

#### 2. Handles and Handle Pruning
A **handle** is a substring of a sentential form that matches the right-hand side of a production rule, whose reduction represents one step in a rightmost derivation in reverse [424]. **Handle pruning** is the process of locating handles in a right-to-left scan of a sentential form and systematically replacing them with non-terminals to reconstruct the derivation [424].

```text
       Stack             Input              Action
       $                id1 * id2$          Shift id1
       $id1               * id2$          Reduce F -> id (Handle = id1)
       $F                 * id2$          Reduce T -> F (Handle = F)
       $T                 * id2$          Shift *
       $T *                 id2$          Shift id2
       $T * id2               $          Reduce F -> id (Handle = id2)
       $T * F                 $          Reduce T -> T * F (Handle = T * F)
       $T                     $          Accept
```

### 3.2 Operator-Precedence Parsing (OPG)
An **Operator-Precedence Parser** is an efficient shift-reduce parser designed for a restricted class of ambiguous and unambiguous grammars [57].

#### 1. Operator Grammar Rules [57]
A Context-Free Grammar is called an **Operator Grammar** if and only if:
1. It contains no empty transitions (no $\epsilon$-transitions: $A \to \epsilon \notin P$) [57].
2. No two adjacent variables appear on the right-hand side of any production rule (no $A \to \alpha B C \beta$) [57].
*   *Valid RHS*: $E \to E + E$, $E \to id$, $E \to (E)$ [57].
*   *Invalid RHS*: $S \to AB$ (adjacent variables) [57].

#### 2. Operator Precedence Relations [57]
In OPG, we establish three disjoint precedence relations between any two terminal symbols $a$ and $b$ [57]:
*   $a \lessdot b$: Terminal $a$ yields precedence to $b$ (shift $b$) [57].
*   $a \doteq b$: Terminal $a$ has the same precedence as $b$ (same handle step) [57].
*   $a \gtrdot b$: Terminal $a$ takes precedence over $b$ (reduce handle) [57].

#### 3. Precedence Table and Compress Function [60]
A raw precedence table over $n$ terminals occupies $O(n^2)$ space [60]. We compress this table into $O(n)$ space by creating two **precedence functions**, $f(a)$ and $g(b)$, such that [60]:
*   If $a \lessdot b$, then $f(a) < g(b)$ [60].
*   If $a \doteq b$, then $f(a) = g(b)$ [60].
*   If $a \gtrdot b$, then $f(a) > g(b)$ [60].

```text
    Terminal      f(x)      g(x)
    ────────────────────────────
       +           2         1
       *           4         3
       id          5         6
       $           0         0
```

By querying $f(a)$ and $g(b)$ instead of a two-dimensional matrix, we reduce memory footprints. However, precedence functions have a major drawback: they **hide empty cells**, meaning they can postpone the detection of syntactic errors that would have been identified instantly in a raw precedence table [60].

---
### 3.3 The LR Parsing Family: Core Theory & LR(0) Automata
The **LR(k)** parsing family represents the most powerful class of shift-reduce parsers [341, 360].
*   **L**: Left-to-right scanning of the input [340].
*   **R**: Reconstructs a rightmost derivation in reverse [424].
*   **k**: The number of lookahead symbols (usually $0$ or $1$) [360, 424].

The foundation of any LR parser is its **LR(0) Automaton**, which uses a set of items to track how much of a production body has been matched so far [362]:
*   An **LR(0) Item** is a production rule with a dot ($\cdot$) inserted at some position in the body [362]. For example, the production $A \to XYZ$ yields four distinct items [362]:
    1. $A \to \cdot XYZ$ (Expecting to see a substring derivable from $X$) [362].
    2. $A \to X \cdot YZ$ (Successfully matched $X$, expecting $Y$) [362].
    3. $A \to XY \cdot Z$ (Successfully matched $X$ and $Y$, expecting $Z$) [362].
    4. $A \to XYZ \cdot$ (Successfully matched the entire body; ready to reduce) [362].

#### Core Operations on Sets of Items
*   **$\text{CLOSURE}(I)$**: If $A \to \alpha \cdot B \beta$ is in $I$, then for each production $B \to \gamma$, add the initial item $B \to \cdot \gamma$ to the closure set [362]. Repeat until no new items are found [362].
*   **$\text{GOTO}(I, X)$**: The set of items representing the state transitions of the automaton on symbol $X$ [363]. It is defined as the closure of all items $A \to \alpha X \cdot \beta$ such that $A \to \alpha \cdot X \beta$ is in $I$ [363].

### 3.4 SLR(1), CLR(1), and LALR(1) Parsers
LR parser variants differ in the way they use lookahead to construct parsing tables:

1.  **SLR(1) (Simple LR)**: Uses the simplest lookahead strategy [424]. It is constructed using an $LR(0)$ automaton [424]. It only places a reduce action $A \to \alpha$ in lookahead column $a$ if $a \in \text{FOLLOW}(A)$ [424]. This reduces table size but is less powerful and can fail to resolve conflicts [424].
2.  **CLR(1) (Canonical LR)**: The most powerful LR parser [424]. It uses **LR(1) items**, which append an explicit lookahead set to each item: $[A \to \alpha \cdot \beta, a]$ [366, 424]. It resolves all lookahead conflicts but causes a massive state explosion (often thousands of states for a typical programming language) [366].
3.  **LALR(1) (Look-Ahead LR)**: The industry standard in compiler construction (e.g., Yacc/Bison) [376]. It merges states in the canonical $CLR(1)$ table that have the same **core** (the same $LR(0)$ items, ignoring lookahead) [377, 424]. It retains the same state count as an $SLR(1)$ parser while preserving almost all of the parsing power of a $CLR(1)$ parser [377, 424].

### 3.5 LR Parsing Table Construction: ACTION & GOTO Tables
An LR parsing table is structurally divided into two sub-tables [364]:

```text
               ┌───────────────────────┬───────────────────────┐
               │        ACTION         │         GOTO          │
        State  ├───────────┬───────────┼───────────┬───────────┤
               │ Terminals │    $      │    E      │    T      │
        ───────┼───────────┼───────────┼───────────┼───────────┤
          I0   │    s2     │           │    1      │           │
          I1   │           │    acc    │           │           │
          I2   │    r3     │    r3     │           │    4      │
               └───────────┴───────────┴───────────┴───────────┘
```

1.  **ACTION Table**: Determines the shift-reduce operations on terminal symbols [364].
    *   *Entries*: Shift state ($si$) [364], Reduce production ($rj$) [364], Accept ($acc$) [364], or Empty (Error) [364].
2.  **GOTO Table**: Maps non-terminal variables to state transitions after a successful reduction [364].

### 3.6 Shift-Reduce & Reduce-Reduce Conflict Analysis
Conflicts arise when the parser table contains multiple overlapping operations in a single cell, rendering the parser non-deterministic [4].
*   **Shift-Reduce (S/R) Conflict**: The parser table contains both a shift action and a reduce action in cell $M[i, a]$ [4].
    *   *Example*: In the dangling-else problem, when the parser is in a state with `else` as lookahead, it can either shift `else` or reduce the inner conditional statement [352].
*   **Reduce-Reduce (R/R) Conflict**: The parser table contains multiple reduction actions for different productions in cell $M[i, a]$ [4]. This represents a critical grammar flaw, as the parser cannot uniquely determine which variable should replace the top of the stack [4].

### 3.7 Parsing Power & State Complexity Comparison
The LR parsing variants form a strict hierarchy in terms of their language-recognition power [414]:
$$LR(0) \subset SLR(1) \subset LALR(1) \subset CLR(1)$$

```text
                  ┌──────────────────────────────────────────────┐
                  │                 Canonical LR(1)              │
                  │   ┌──────────────────────────────────────┐   │
                  │   │             LALR(1)                  │   │
                  │   │   ┌──────────────────────────────┐   │   │
                  │   │   │            SLR(1)            │   │   │
                  │   │   │   ┌──────────────────────┐   │   │   │
                  │   │   │   │         LR(0)        │   │   │   │
                  │   │   │   │                      │   │   │   │
                  │   │   │   └──────────────────────┘   │   │   │
                  │   │   └──────────────────────────────┘   │   │
                  │   └──────────────────────────────────────┘   │
                  └──────────────────────────────────────────────┘
```

#### 1. State Complexity Comparison [18]
The total number of states in each parser family follows a strict equality/inequality relationship [18]:
$$\text{States}(LR(0)) = \text{States}(SLR(1)) = \text{States}(LALR(1)) \le \text{States}(CLR(1))$$

*   **LR(0), SLR(1), LALR(1)**: All have the exact same number of states, which represents the number of canonical sets of LR(0) items [18].
*   **CLR(1)**: Significantly larger because states are split when they have different lookahead symbols, causing an explosion in table size [366].

#### 2. LALR(1) State-Merging & Conflict Proofs [56]
LALR(1) is constructed by merging all states in the $CLR(1)$ table that share the same **core** ($LR(0)$ item sets, ignoring lookahead) [377].
*   **Theorem on Shift-Reduce Conflicts**: If a canonical $CLR(1)$ parsing table has absolutely **no Shift-Reduce (S-R) conflicts**, the merged $LALR(1)$ table is **guaranteed to remain free of S-R conflicts** [56].
    *   *Proof*: Shift actions depend entirely on the $LR(0)$ core items, not on the lookaheads [435]. If an item $A \to \alpha \cdot a \beta$ triggers a shift in a merged state, it must have been triggered in one of the individual states [435]. If a reduce action $B \to \gamma \cdot$ was also active in that state with lookahead $a$, then that S-R conflict would have already existed in that individual $CLR(1)$ state [435]. Thus, merging states cannot *introduce* new S-R conflicts [435].
*   **Theorem on Reduce-Reduce Conflicts**: Merging states with identical cores **can introduce new Reduce-Reduce (R-R) conflicts** [56, 57].
    *   *Proof*: Consider two $CLR(1)$ states with the same core but different lookaheads [436]:
        State $I_x$:
        $$\begin{aligned}
        A &\to c \cdot, \quad &\{d\} \\
        B &\to c \cdot, \quad &\{e\}
        \end{aligned}$$
        State $I_y$:
        $$\begin{aligned}
        A &\to c \cdot, \quad &\{e\} \\
        B &\to c \cdot, \quad &\{d\}
        \end{aligned}$$
        Neither $I_x$ nor $I_y$ has an R-R conflict because the lookaheads are disjoint [436]. However, when we merge them into $I_{xy}$, we union the lookaheads [437]:
        $$\begin{aligned}
        A &\to c \cdot, \quad &\{d, e\} \\
        B &\to c \cdot, \quad &\{d, e\}
        \end{aligned}$$
        Now, under lookaheads $d$ or $e$, the parser has a **Reduce-Reduce conflict** (should it reduce to $A$ or $B$?) [437]. Every LALR(1) grammar is a CLR(1) grammar, but not vice-versa [57].

## Module 4: Syntax-Directed Translation

### 4.1 Syntax-Directed Definitions (SDDs): Attributes & Rules
A Syntax-Directed Definition (SDD) is a context-free grammar augmented with attributes and semantic rules associated with each production [489].
*   **Attributes**: Quantities associated with programming constructs (e.g., types, values, code segments, memory offsets) [105].
*   **Semantic Rules**: Mathematical or logical functions that define how attribute values are calculated at a parse tree node [108].

### 4.2 S-Attributed vs. L-Attributed SDT: Comparative Grid [21, 22]
Syntax-Directed Translations (SDTs) are categorized based on their dependency flows [491]:

| Feature | **S-Attributed SDT** [21, 22] | **L-Attributed SDT** [21, 22] |
| :--- | :--- | :--- |
| **Attribute Types** | Only **Synthesized attributes** are allowed [506]. | Both **Synthesized and Inherited attributes** are allowed [508]. |
| **Dependency Flow** | Bottom-up (from children to parent) [492, 497]. | Left-to-right (from parent or left siblings only) [508-509]. |
| **Action Placement** | Embedded strictly at the **end of the RHS** (Postfix SDT) [526]. | Can be placed **anywhere on the RHS** of a production [532]. |
| **Evaluation Method** | Evaluated naturally during **bottom-up (LR) parsing** [507, 526]. | Evaluated during **top-down (LL) parsing** via depth-first [540, 568]. |
| **Parsing Stack** | Managed completely on the **parser stack** [507, 528]. | Requires **temporary copies** on the stack for inherited attributes [568-570]. |

> 🌟 **Foundational Theorem**: Every S-attributed SDT is automatically an L-attributed SDT, but the converse is not true [22].

### 4.3 Concrete SDT Implementations [20]
We can implement compilers, interpreters, and type systems directly using semantic rules.

#### 1. SDT for Infix-to-Postfix Conversion [20]
This SDT translates algebraic operations into postfix notation [109, 115].
*   *Grammar & Actions* [109]:
    $$\begin{aligned}
    E &\to E_1 + T \quad &\{ E.val = E_1.val \parallel T.val \parallel '+' \} \\
    E &\to T \quad &\{ E.val = T.val \} \\
    T &\to T_1 * F \quad &\{ T.val = T_1.val \parallel F.val \parallel '*' \} \\
    T &\to F \quad &\{ T.val = F.val \} \\
    F &\to id \quad &\{ F.val = id.val \}
    \end{aligned}$$
*   *Evaluation Trace for $2 + 3 * 5$* [20]:
    ```text
             E.val = "235*+"
            /   |     \
    E.val="2"   +   T.val="35*"
        |          /    |    \
    T.val="2"  T.val="3" *  F.val="5"
        |          |         |
    F.val="2"  F.val="3"    id.val="5"
        |          |
    id.val="2" id.val="3"
    ```

#### 2. SDT for Type-Checking [20]
This SDT performs semantic static checks to ensure type compatibility [178, 621].
*   *Grammar & Actions* [20]:
    $$\begin{aligned}
    E &\to E_1 + T \quad &\{
    \text{if }(E_1.type == \text{int} \&\& T.type == \text{int}) \text{ } E.type = \text{int}; \\
    &\quad \text{else if }(E_1.type == \text{float} \&\& T.type == \text{float}) \text{ } E.type = \text{float}; \\
    &\quad \text{else Error}(\text{"Type Mismatch"}); \}
    \end{aligned}$$

---
### 4.4 Syntax-Directed Translation Schemes (SDTs)
A **Syntax-Directed Translation Scheme (SDT)** is a context-free grammar with **semantic actions** (fragments of executable code) embedded directly inside the bodies of production rules [229, 314, 416]:
$$A \to B \ \{ \text{action} \} \ C$$

#### Execution in Bottom-Up Parsers
To execute actions embedded inside production bodies during shift-reduce parsing, the compiler introduces **marker non-terminals** ($M \to \epsilon$) [419]. The production is transformed into $A \to B M C$ with $M \to \epsilon \ \{ \text{action} \}$ [419, 447]. This allows the action to be executed when $M$ is reduced [419].

### 4.5 Applications: Evaluations, Type Checking, and ICG
Syntax-directed translations are used throughout the compiler front-end:
1.  **Expression Evaluation**: Evaluates math operations on the fly during parsing [100].
2.  **Type Checking**: Ensures that operator types match their operands [159, 476]. For instance, given the rule [483]:
    $$E \to E_1 + E_2 \quad \{ E.\text{type} = \max(E_1.\text{type}, E_2.\text{type}) \}$$
3.  **Intermediate Code Generation (ICG)**: Constructs AST nodes or emits three-address statements during parsing [160, 460].

---
## Module 5: Runtime Environments

### 5.1 Logic & Memory Organization: Code, Static, Stack, and Heap
At runtime, the operating system allocates a logical address space for the executable target program, managed as distinct segments [570-571]:

```text
       Low Memory   ┌─────────────────────────────────────┐
                    │               Code                  │  ──► Static (Executable code) [573]
                    ├─────────────────────────────────────┤
                    │              Static                 │  ──► Static (Global variables, constants) [573]
                    ├─────────────────────────────────────┤
                    │               Heap                  │  ──► Dynamic (Grows downwards, explicit allocations) [570]
                    │                  │                  │
                    │                  ▼                  │
                    │                                     │
                    │                  ▲                  │
                    │                  │                  │
                    │               Stack                 │  ──► Dynamic (Grows upwards, procedure calls) [570]
       High Memory  └─────────────────────────────────────┘
```

1.  **Code Segment**: A statically allocated, read-only segment that holds the executable machine instructions [573].
2.  **Static Data Segment**: Holds global variables, constant values, and metadata generated by the compiler [573].
3.  **Stack Segment**: Dynamically manages space for activation records (stack frames) as procedures are called and return [570, 586].
4.  **Heap Segment**: Dynamically manages memory allocated and freed at runtime (e.g., via `new` in Java or `malloc` in C) [570].

### 5.2 Activation Records & Stack Frames
Each active procedure call is represented by an **Activation Record (AR)** or **Stack Frame** on the runtime stack [570, 574]. A typical stack frame layout contains [575-576]:

```text
               High Address ┌───────────────────────────┐
                            │     Actual Parameters     │  ──► Passed by caller [575]
                            ├───────────────────────────┤
                            │    Saved Machine Status   │  ──► Registers, program counter [575-576]
                            ├───────────────────────────┤
                            │       Access Link         │  ──► Resolves non-local nested scope [575]
                            ├───────────────────────────┤
                            │       Control Link        │  ──► Points to caller's stack frame [575]
                            ├───────────────────────────┤
                            │       Return Value        │  ──► Returned value location [575]
                            ├───────────────────────────┤
                            │      Local Variables      │  ──► Statically sized variables [576]
                            ├───────────────────────────┤
                            │        Temporaries        │  ──► Expression evaluation values [652]
               Low Address  └───────────────────────────┘
```

### 5.3 Procedure Call/Return Linkage Sequences
The compiler generates a precise calling sequence of instructions to handle transitions between the **caller** and the **callee** [6]:

#### 1. The Calling Sequence (Actions by Caller)
*   Evaluates and pushes the actual arguments onto the stack [575].
*   Saves the return address and machine status registers [575, 625].
*   Increments the Stack Pointer (SP) to allocate the callee's frame [626].
*   Jumps to the first instruction of the callee [625].

#### 2. The Prologue Sequence (Actions by Callee)
*   Saves remaining registers that it needs to modify [575-576].
*   Initializes local variables and begins execution [576].

#### 3. The Epilogue & Return Sequence (Actions by Callee)
*   Places the return value in the designated return slot [575].
*   Restores the saved registers and machine status [575-576].
*   Decrements SP to pop its frame off the stack [626].
*   Jumps to the saved return address [625].

### 5.4 Parameter Passing Mechanisms
Languages transfer actual variables to formal parameters using different protocols [213]:
*   **Call-by-Value**: The caller evaluates the actual parameter and passes its *copy* to the callee [213]. Modifications within the callee do not affect the caller's variable [213].
*   **Call-by-Reference**: The caller passes a *pointer* (reference) to the address of the actual variable [213]. Any modification in the callee immediately changes the caller's variable [214].
*   **Call-by-Value-Result (Copy-Restore)**: The callee copies the actual parameter's value into its local variable. On return, the final value is copied *back* into the caller's memory location [6].

---
## Module 6: Intermediate Code Generation

### 6.1 ASTs vs. Directed Acyclic Graphs (DAGs)
During compilation, expressions can be represented as high-level trees or graphs [462]:
*   **Abstract Syntax Tree (AST)**: A hierarchical tree where each interior node represents an operator, and children represent its operands [157, 462]. It mirrors the nesting of the source code exactly [463].
*   **Directed Acyclic Graph (DAG)**: An optimization of the AST [462, 465]. A DAG identifies and merges nodes representing identical subexpressions, allowing the compiler to avoid redundant computations [468, 641].

```text
        AST for: a + a * (b - c)                  DAG for: a + a * (b - c)
                  +                                         +
                 / ╲                                       / ╲
                a   *                                     ┌───►a  *
                   / ╲                                    │     / ╲
                  a   -                                   └────┼─── -
                     / ╲                                       │  / ╲
                    b   c                                      b     c
```

### 6.2 Three-Address Code (TAC) Representations: Quadruples & Triples
**Three-Address Code (TAC)** is a linearized representation of an AST or DAG [468]. It consists of a sequence of instructions, each having at most three operands and one operator [462, 467]:
$$x = y \text{ op } z$$ [161]

We represent TAC using three common data structures [104, 469]:
1.  **Quadruples**: Explicitly records four fields: `op`, `arg1`, `arg2`, and `result` [366, 474].
2.  **Triples**: Eliminates the `result` field [474]. The result of an operation is referred to by its index in the triple array [474]. This saves space but makes code motion optimizations harder because moving a triple requires updating all its references [474].
3.  **Indirect Triples**: An optimization of triples [474]. It uses a separate pointer array to index into the triple table [474]. The compiler can reorder instructions by simply rearranging the pointer array, without moving the triples [474].

### 6.3 Control-Flow & Boolean Short-Circuit Generation
In programming languages, boolean expressions are often evaluated using **short-circuit evaluation** [108, 524]. This means that the evaluation of $B_1 \ \|\| \ B_2$ terminates immediately if $B_1$ is true, without ever executing $B_2$ [525].

To generate short-circuit code, the compiler inherits two labels for each boolean expression [562]:
*   `B.true`: The label to jump to if the expression evaluates to true [562].
*   `B.false`: The label to jump to if the expression evaluates to false [562].

For example, the production $B \to B_1 \ \|\| \ B_2$ translates into [527]:
$$\begin{aligned}
B_1.\text{true} &= B.\text{true} \\
B_1.\text{false} &= \text{newlabel}() \\
B_2.\text{true} &= B.\text{true} \\
B_2.\text{false} &= B.\text{false} \\
B.\text{code} &= B_1.\text{code} \parallel \text{label}(B_1.\text{false}) \parallel B_2.\text{code}
\end{aligned}$$ [527]

### 6.4 One-Pass Code Generation via Backpatching
When generating code in a single pass, the target of a jump (e.g., the false exit of a condition) may not be known when the jump instruction is emitted [530]. **Backpatching** solves this by generating jump instructions with empty target addresses, maintaining them in lists, and filling in the targets later when they become known [531, 563].

The compiler manages lists of jump instructions using three primitives [532]:
1.  **$\text{makelist}(i)$**: Creates a new list containing only instruction index $i$, and returns a pointer [532].
2.  **$\text{merge}(p_1, p_2)$**: Concatenates the lists pointed to by $p_1$ and $p_2$ [532].
3.  **$\text{backpatch}(p, i)$**: Interates through the instruction list $p$ and inserts index $i$ as the target for each of those jumps [532].

---
## Module 7: Local Optimization

### 7.1 Basic Block Construction & Leader Identification
An optimizing compiler partitions intermediate code into **basic blocks**, which are maximal sequences of instructions where control enters strictly at the first instruction and leaves strictly at the last, with no branching in the middle [276, 630].

We construct basic blocks using **Algorithm 8.5** to identify **leaders** [631-632]:
1.  **Rule 1**: The first instruction in the intermediate code is a leader [632].
2.  **Rule 2**: Any instruction that is the target of a conditional or unconditional jump is a leader [632].
3.  **Rule 3**: Any instruction that immediately follows a conditional or unconditional jump is a leader [632].

Once leaders are identified, a basic block consists of a leader and all instructions up to (but not including) the next leader [632]. The blocks are connected to form a **Control Flow Graph (CFG)** [630].

### 7.2 Value Numbering & DAG-Based Transformations
Local optimizations are performed on basic blocks by constructing a DAG [640].

*   **Value Numbering**: As nodes are added to the DAG, the compiler checks if there is already an existing node with the identical operator and children in the same order [642]. If so, it reuses the existing node, eliminating the redundant computation [642-643].
*   **Variable Killing**: If a variable $x$ is redefined in a statement (e.g., $x = y + z$), any subsequent use of $x$ must refer to this new node [643]. Any existing active nodes whose value depended on the previous value of $x$ are **killed** and can no longer receive label updates [647].

### 7.3 Local Optimizations: Constant Folding, CSE, Copy Propagation
Using the DAG, the compiler applies the following semantics-preserving transformations:
*   **Constant Folding**: If all operands of an operation are constants, the compiler evaluates the operation at compile time [163, 645]. For example, `x = 2 * 3.14` is simplified directly to `x = 6.28` [513].
*   **Common Subexpression Elimination (CSE)**: Reuses the result of a previously computed expression if its operands have not been modified [163, 641].
*   **Copy Propagation**: If the code contains an assignment $x = y$, the compiler replaces subsequent uses of $x$ with $y$ [121, 590], enabling further optimizations such as dead-code elimination [121].
*   **Dead-Code Elimination**: Removes instructions whose results are never used along any execution path [121, 641].

---
## Module 8: Data-Flow Analysis

### 8.1 Control Flow Graphs & Data-Flow Frameworks
Global optimizations require information about how values are transmitted across basic blocks [169, 711]. We represent this mathematically using a **Data-Flow Analysis Framework** [751]:
$$(D, V, \wedge, F)$$ [751]

Where:
*   $D$ is the **direction** of data flow (Forwards or Backwards) [751].
*   $V$ is the **domain of values** representing program facts [751].
*   $\wedge$ is the **meet operator** used to merge data-flow values at confluence points [751, 752].
*   $F$ is a family of **transfer functions** $f_B: V \to V$ that model the effect of executing block $B$ [751-752].

### 8.2 Liveness Analysis: Equations & Iterative Solution
**Liveness Analysis** determines, for each program point, whether the value held by a variable will be used in the future before it is redefined [711, 739].

*   **Domain**: Sets of variables [747].
*   **Direction**: Backwards [741, 747].
*   **use_B**: Variables read in block $B$ before they are defined [739].
*   **def_B**: Variables defined in block $B$ before any use [739].

#### Data-Flow Equations:
$$\begin{aligned}
\text{IN}[\text{exit}] &= \emptyset \\
\text{IN}[B] &= \text{use}_B \cup (\text{OUT}[B] \setminus \text{def}_B) \\
\text{OUT}[B] &= \bigcup_{S \in \text{succ}(B)} \text{IN}[S]
\end{aligned}$$ [739]

### 8.3 Available Expressions & Global CSE Analysis
**Available Expressions Analysis** determines, for each program point, whether an expression $x + y$ has been computed along every path reaching that point without its operands being subsequently modified [744]. This is the mathematical foundation for **Global Common Subexpression Elimination** [802].

*   **Domain**: Sets of expressions [747].
*   **Direction**: Forwards [747].
*   **e\_gen_B**: Expressions evaluated in $B$ with no subsequent redefinition of their operands [742, 744].
*   **e\_kill_B**: Expressions killed in $B$ (any of their operands are defined in $B$) [744, 776].

#### Data-Flow Equations:
$$\begin{aligned}
\text{OUT}[\text{entry}] &= \emptyset \\
\text{OUT}[B] &= e\_\text{gen}_B \cup (\text{IN}[B] \setminus e\_\text{kill}_B) \\
\text{IN}[B] &= \bigcap_{P \in \text{pred}(B)} \text{OUT}[P]
\end{aligned}$$ [745]

### 8.4 Reaching Definitions & Iterative Fixed-Point Analysis
A definition $d: x = y + z$ reaches a point $p$ if there is an execution path from the point immediately following $d$ to $p$ along which $x$ is not redefined [730].

*   **Domain**: Sets of definitions [747].
*   **Direction**: Forwards [747].
*   **gen_B**: Definitions inside $B$ that are downwards-exposed [734-735].
*   **kill_B**: All other definitions of variables in the program that are redefined in $B$ [732, 735].

#### Data-Flow Equations:
$$\begin{aligned}
\text{OUT}[\text{entry}] &= \emptyset \\
\text{OUT}[B] &= \text{gen}_B \cup (\text{IN}[B] \setminus \text{kill}_B) \\
\text{IN}[B] &= \bigcup_{P \in \text{pred}(B)} \text{OUT}[P]
\end{aligned}$$ [735]

#### Iterative Fixed-Point Algorithm
```text
Algorithm: Iterative_Reaching_Definitions
Input: CFG with gen and kill sets computed for each block
Output: IN and OUT sets for each basic block

Initialize OUT[entry] = empty set [735]
For each basic block B other than entry:
    OUT[B] = empty set [754, 749]

While (changes to any OUT set occur) {
    For each basic block B other than entry {
        IN[B] = Union of OUT[P] for all predecessors P of B [735]
        OUT[B] = gen_B union (IN[B] - kill_B) [735]
    }
}
``` [735-736]
