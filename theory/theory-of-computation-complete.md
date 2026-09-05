# Complete Theory of Computation Reference Handbook

This handbook provides an exhaustive, mathematically rigorous reference for the **Theory of Computation (TOC)**, constructed directly from the core curriculum topics defined in your syllabus source. It details regular languages, context-free languages, pumping lemmas, Turing machines, decidability, and complexity theory, providing formal definitions, proofs, transition systems, and algorithmic constructions.

---

## Table of Contents
1. [Module 1: Regular Expressions & Finite Automata](#module-1-regular-expressions--finite-automata)
   - [1.1 Regular Expressions (Algebraic Foundations)](#11-regular-expressions-algebraic-foundations)
   - [1.2 Deterministic Finite Automata (DFA)](#12-deterministic-finite-automata-dfa)
   - [1.3 Nondeterministic Finite Automata (NFA) & $\epsilon$-NFAs](#13-nondeterministic-finite-automata-nfa---nfas)
   - [1.4 DFA/NFA Equivalence & Subset Construction](#14-dfanfa-equivalence--subset-construction)
   - [1.5 State Minimization & Table-Filling Algorithm](#15-state-minimization--table-filling-algorithm)
   - [1.6 Formal Properties & Product Construction](#16-formal-properties--product-construction)
2. [Module 2: Context-Free Grammars & Pushdown Automata](#module-2-context-free-grammars--pushdown-automata)
   - [2.1 Context-Free Grammars (CFG) & Derivations](#21-context-free-grammars-cfg--derivations)
   - [2.2 Parse Trees, Ambiguity, & Conversions](#22-parse-trees-ambiguity--conversions)
   - [2.3 Pushdown Automata (PDA) Formalisms](#23-pushdown-automata-pda-formalisms)
   - [2.4 Equivalence of PDAs and CFGs](#24-equivalence-of-pdas-and-cfgs)
   - [2.5 Chomsky Normal Form (CNF) & Conversions](#25-chomsky-normal-form-cnf--conversions)
3. [Module 3: Non-Regular & Non-Context-Free Languages (Pumping Lemmas)](#module-3-non-regular--non-context-free-languages-pumping-lemmas)
   - [3.1 Pumping Lemma for Regular Languages](#31-pumping-lemma-for-regular-languages)
   - [3.2 Pumping Lemma for Context-Free Languages](#32-pumping-lemma-for-context-free-languages)
   - [3.3 Decision & Closure Properties for Regular and CF Languages](#33-decision--closure-properties-for-regular-and-cf-languages)
4. [Module 4: Turing Machines & Computability Theory](#module-4-turing-machines--computability-theory)
   - [4.1 The Turing Machine (TM) Model](#41-the-turing-machine-tm-model)
   - [4.2 Programming Techniques & TM Subroutines](#42-programming-techniques--tm-subroutines)
   - [4.3 Variants & Restricted Turing Machines](#43-variants--restricted-turing-machines)
   - [4.4 Multistack & Counter Machines](#44-multistack--counter-machines)
5. [Module 5: Decidability, Undecidability & Complexity](#module-5-decidability-undecidability--complexity)
   - [5.1 Decidability & Recursive/RE Languages](#51-decidability--recursivere-languages)
   - [5.2 Diagonalization & The Undecidable Language $L_d$](#52-diagonalization--the-undecidable-language-l_d)
   - [5.3 The Universal Language $L_u$ & The Halting Problem](#53-the-universal-language-l_u--the-halting-problem)
   - [5.4 Undecidable Problems about Turing Machines & Rice's Theorem](#54-undecidable-problems-about-turing-machines--rices-theorem)
   - [5.5 Post's Correspondence Problem (PCP)](#55-posts-correspondence-problem-pcp)
   - [5.6 Complexity Theory Foundations ($P$, $NP$, and $PS$)](#56-complexity-theory-foundations-p-np-and-ps)

---

## Module 1: Regular Expressions & Finite Automata

### 1.1 Regular Expressions (Algebraic Foundations)

A regular expression (RE) is a declarative algebraic notation used to specify the patterns of strings forming a regular language [137, 534].

#### Core Concepts
1. **Alphabet ($\Sigma$)**: A finite, nonempty set of symbols [426]. Examples include the binary alphabet $\{0, 1\}$ or the ASCII alphabet [426-427].
2. **String (Word)**: A finite sequence of symbols chosen from an alphabet [427].
   - **Length ($|w|$)**: The number of symbols in the string [427].
   - **Empty String ($\epsilon$)**: The unique string of length zero [427].
3. **Empty Language ($\emptyset$)**: A language containing no strings ($\emptyset \neq \{\epsilon\}$ since $\{\epsilon\}$ contains one string of length zero) [430].
4. **Language ($L$)**: Any subset of $\Sigma^*$, the set of all strings over $\Sigma$ [428].

#### Operations on Languages
Let $L$ and $M$ be languages over an alphabet $\Sigma$ [135, 536]:
- **Union**: $L \cup M = \{ s \mid s \in L \text{ or } s \in M \}$ [136, 536].
- **Concatenation**: $L M = \{ st \mid s \in L \text{ and } t \in M \}$ [136, 536].
- **Kleene Closure**: $L^* = \bigcup_{i=0}^{\infty} L^i$, where $L^0 = \{\epsilon\}$ and $L^i = L^{i-1} L$ [135-136, 537].
- **Positive Closure**: $L^+ = \bigcup_{i=1}^{\infty} L^i = L^* \setminus \{\epsilon\}$ (unless $\epsilon \in L$) [135-136].

#### Algebraic Laws of Regular Expressions
Regular expressions obey several arithmetic-like properties under union ($+$) and concatenation ($\cdot$) [581]:
- **Commutativity of Union**: $R + S = S + R$ [582]. Concatenation is *not* commutative ($RS \neq SR$ in general) [584].
- **Associativity**: $(R + S) + T = R + (S + T)$ and $(RS)T = R(ST)$ [582-584].
- **Distributivity**: $R(S + T) = RS + RT$ and $(S + T)R = SR + TR$ [585].
- **Identities & Annihilators**: $\emptyset + R = R$, $\epsilon R = R\epsilon = R$, and $\emptyset R = R\emptyset = \emptyset$ [541].
- **Idempotence**: $R + R = R$ [587].
- **Closure Properties**: $(R^*)^* = R^*$, $\emptyset^* = \{\epsilon\}$, and $R^* = \epsilon + RR^*$ [543, 587].

#### Conversion: DFA to RE via Inductive Path Formula ($R_{ij}^{(k)}$)
To construct a regular expression from a DFA $A$ with states $\{1, 2, \dots, n\}$, we define $R_{ij}^{(k)}$ as the language of all path labels from state $i$ to state $j$ such that no intermediate state exceeds index $k$ [547-548].
- **Base Case ($k = 0$)**: No intermediate states are allowed [549].
  $$R_{ij}^{(0)} = \begin{cases} 
  \{a \mid \delta(i, a) = j\} & \text{if } i \neq j \\ 
  \{a \mid \delta(i, a) = j\} \cup \{\epsilon\} & \text{if } i = j 
  \end{cases}$$
- **Inductive Step ($k \ge 1$)**: A path from $i$ to $j$ passing through no state higher than $k$ either never goes through state $k$ at all (remaining in $R_{ij}^{(k-1)}$), or goes through state $k$ one or more times [550].
  $$R_{ij}^{(k)} = R_{ij}^{(k-1)} + R_{ik}^{(k-1)} (R_{kk}^{(k-1)})^* R_{kj}^{(k-1)}$$ [551]

The final regular expression of the automaton is:
$$R = \sum_{j \in F} R_{q_0 j}^{(n)}$$ [551-552]

#### State Elimination Method
To eliminate an intermediate state $s$, for every predecessor $q_i$ of $s$ and successor $p_j$ of $s$, we replace the direct edge $R_{ij}$ with [558]:
$$R'_{ij} = R_{ij} + Q_i S^* P_j$$ [559-560]
where $Q_i$ is the RE labeling the transition $q_i \to s$, $S$ is the loop at $s$, and $P_j$ is the transition $s \to p_j$ [558].

```text
       Q_i        S         P_j
(q_i) -----> ( s )() -----> (p_j)         ===>      (q_i) --------------> (p_j)
  |                         ^                             R_ij + Q_i S* P_j
  +--------- R_ij ----------+
```

---

### 1.2 Deterministic Finite Automata (DFA)

A **Deterministic Finite Automaton (DFA)** is a 5-tuple [284, 455]:
$$A = (Q, \Sigma, \delta, q_0, F)$$

Where:
- $Q$ is a finite set of **states** [283, 454].
- $\Sigma$ is a finite set of **input symbols** (the alphabet) [283, 454].
- $\delta: Q \times \Sigma \to Q$ is the deterministic **transition function** [283, 454].
- $q_0 \in Q$ is the unique **start state** [284, 455].
- $F \subseteq Q$ is the set of **accepting/final states** [284, 455].

#### Extended Transition Function ($\hat{\delta}$)
We inductively define $\hat{\delta}: Q \times \Sigma^* \to Q$ to describe string processing [463]:
- **Basis**: $\hat{\delta}(q, \epsilon) = q$ [464].
- **Inductive Step**: For $w = xa$ where $x \in \Sigma^*$ and $a \in \Sigma$ [464]:
  $$\hat{\delta}(q, xa) = \delta(\hat{\delta}(q, x), a)$$ [464]

#### Language of a DFA
The language accepted by a DFA $A$ is [469]:
$$L(A) = \{ w \in \Sigma^* \mid \hat{\delta}(q_0, w) \in F \}$$ [470]

---

### 1.3 Nondeterministic Finite Automata (NFA) & $\epsilon$-NFAs

An **NFA** allows transitions to zero, one, or multiple states from a single input symbol [57, 475]. Formally, it is a 5-tuple $N = (Q, \Sigma, \delta, q_0, F)$ [480-481] where the transition function returns subsets of states:
$$\delta: Q \times \Sigma \to \mathcal{P}(Q)$$ [319, 481]

#### Extended Transition Function ($\hat{\delta}$) for NFA
- **Basis**: $\hat{\delta}(q, \epsilon) = \{q\}$ [483].
- **Inductive Step**: For $w = xa$ [483]:
  $$\hat{\delta}(q, xa) = \bigcup_{p \in \hat{\delta}(q, x)} \delta(p, a)$$ [322, 483]

#### Finite Automata with $\epsilon$-Transitions ($\epsilon$-NFA)
An $\epsilon$-NFA can spontaneously transition without consuming input symbols [361, 505]. Its transition function allows $\epsilon$ as an input [508]:
$$\delta: Q \times (\Sigma \cup \{\epsilon\}) \to \mathcal{P}(Q)$$

#### $\epsilon$-Closure (ECLOSE)
The $\epsilon$-closure of a state $q$, denoted $\text{ECLOSE}(q)$, is the set of all states reachable from $q$ using only $\epsilon$-labeled transitions [366, 509]:
- **Basis**: $q \in \text{ECLOSE}(q)$ [367, 510].
- **Induction**: If $p \in \text{ECLOSE}(q)$ and $r \in \delta(p, \epsilon)$, then $r \in \text{ECLOSE}(q)$ [367, 510].

We extend this to a set of states $S$ [511]:
$$\text{ECLOSE}(S) = \bigcup_{q \in S} \text{ECLOSE}(q)$$ [369, 511]

### 1.4 DFA/NFA Equivalence & Subset Construction

Every NFA can be converted into an equivalent DFA that accepts the exact same language [487, 497]. The algorithm is known as the **Subset Construction** [329, 488].

Given an NFA $N = (Q_N, \Sigma, \delta_N, q_0, F_N)$, the equivalent DFA $D = (Q_D, \Sigma, \delta_D, q_D, F_D)$ is defined by [330, 489]:
1. **States**: $Q_D = \mathcal{P}(Q_N)$ (power set of states) [330, 489].
2. **Start State**: $q_D = \text{ECLOSE}(\{q_0\})$ (for $\epsilon$-NFAs; or $\{q_0\}$ for standard NFAs) [330, 515].
3. **Accepting States**: $F_D = \{ S \subseteq Q_N \mid S \cap F_N \neq \emptyset \}$ [331, 490].
4. **Transition Function**: For any subset $S \subseteq Q_N$ and input symbol $a \in \Sigma$ [331, 490]:
   $$\delta_D(S, a) = \text{ECLOSE}\left(\bigcup_{p \in S} \delta_N(p, a)\right)$$ [376, 516]

#### Worst-Case State Explosion
If an NFA has $n$ states, the corresponding DFA can have up to $2^n$ states [330, 489]. For example, the language:
$$L = \{ w \in \{0, 1\}^* \mid \text{the } n\text{-th symbol from the right is } 1 \}$$ [343, 473]
can be recognized by an NFA with $n+1$ states but requires at least $2^n$ states in any DFA, because the DFA must "remember" the exact sequence of the last $n$ symbols read [343, 498].

---

### 1.5 State Minimization & Table-Filling Algorithm

For any regular language, there exists a unique **minimum-state DFA** (up to state isomorphism) [135, 662]. State minimization is performed by identifying equivalent states [576, 662].

#### Equivalent vs. Distinguishable States
Two states $p$ and $q$ in a DFA are **equivalent** ($p \approx q$) if they produce the same acceptance decisions for all possible future input strings [577]:
$$\forall w \in \Sigma^* : (\hat{\delta}(p, w) \in F \iff \hat{\delta}(q, w) \in F)$$ [577]
If such a string $w$ exists that distinguishes them, they are **distinguishable** [578, 663]. State equivalence is an equivalence relation (transitive, symmetric, reflexive) and partitions the state set into disjoint blocks [668-669].

#### The Table-Filling Algorithm
The table-filling algorithm systematically computes distinguishable state pairs [580, 663]:
1. **Basis**: Mark all pairs $\{p, q\}$ where $p \in F$ and $q \notin F$ (or vice versa) as distinguishable [580, 664].
2. **Inductive Step**: For each unmarked pair $\{p, q\}$, if there exists an input symbol $a \in \Sigma$ such that the transitioned pair $\{\delta(p, a), \delta(q, a)\}$ is already marked as distinguishable, then mark $\{p, q\}$ as distinguishable [580, 663].
3. Iterate step 2 until no more pairs can be marked [580, 664].
4. Any pair $\{p, q\}$ that remains unmarked at termination represents equivalent states, which can be merged into a single state in the minimized DFA [580, 665, 670].

---

### 1.6 Formal Properties & Product Construction

#### Reachability
A state $q \in Q$ is **reachable** if there exists a string $w \in \Sigma^*$ such that $\hat{\delta}(q_0, w) = q$ [657]. Unreachable states can be safely deleted without changing the language of the automaton [492, 827].

#### Dead States
A **dead state** (or sink state) is a non-accepting state $q_d \notin F$ such that for all $a \in \Sigma$, $\delta(q_d, a) = q_d$ [140, 501]. 

#### Product Construction
To perform operations on two DFAs $A_1 = (Q_1, \Sigma, \delta_1, q_1, F_1)$ and $A_2 = (Q_2, \Sigma, \delta_2, q_2, F_2)$, we construct a **product automaton** [617-618]:
$$A_{prod} = (Q_1 \times Q_2, \Sigma, \delta_{prod}, (q_1, q_2), F_{prod})$$ [620]
Where:
$$\delta_{prod}((p, q), a) = (\delta_1(p, a), \delta_2(q, a))$$ [621]

The choosing of $F_{prod}$ determines the boolean operation [620, 648]:
- **Intersection ($L(A_1) \cap L(A_2)$)**: $F_{prod} = F_1 \times F_2$ [620].
- **Union ($L(A_1) \cup L(A_2)$)**: $F_{prod} = (F_1 \times Q_2) \cup (Q_1 \times F_2)$ [648].
- **Set Difference ($L(A_1) \setminus L(A_2)$)**: $F_{prod} = F_1 \times (Q_2 \setminus F_2)$ [648].

## Module 2: Context-Free Grammars & Pushdown Automata

### 2.1 Context-Free Grammars (CFG) & Derivations

A Context-Free Grammar is a 4-tuple [89, 168]:
$$G = (V, T, P, S)$$ [686]

Where:
- $V$ is a finite set of **variables** (nonterminals) [89, 169].
- $T$ is a finite set of **terminals** (disjoint from $V$) [89, 169].
- $P$ is a finite set of **productions**, each of the form $A \to \alpha$ where $A \in V$ and $\alpha \in (V \cup T)^*$ [170, 172].
- $S \in V$ is the distinguished **start symbol** [90, 170].

#### Derivations ($\Rightarrow$)
We use productions as rewriting rules [173]:
- **One-Step Derivation**: If $A \to \beta \in P$, then $\alpha A \gamma \Rightarrow \alpha \beta \gamma$ [174, 692].
- **Zero-or-More-Steps Derivation**: $\alpha \Rightarrow^* \beta$ [174-175, 693].
- **One-or-More-Steps Derivation**: $\alpha \Rightarrow^+ \beta$ [175].

#### Derivational Order
- **Leftmost Derivation ($\Rightarrow_{lm}$)**: At each step, the leftmost variable in the sentential form is rewritten [178, 696].
- **Rightmost Derivation ($\Rightarrow_{rm}$)**: At each step, the rightmost variable is rewritten [178, 696].

#### Language of a Grammar
The language of $G$ is the set of terminal-only strings derivable from the start symbol [175, 700]:
$$L(G) = \{ w \in T^* \mid S \Rightarrow^* w \}$$ [175, 700]

---

### 2.2 Parse Trees, Ambiguity, & Conversions

#### Parse Trees
A parse tree is a graphical representation of a derivation that filters out the replacement order [180, 707].
- The root of the tree is labeled by the start symbol $S$ [91, 708].
- Interior nodes are labeled by variables $A \in V$ [91, 708].
- Leaves are labeled by terminals $a \in T$ or $\epsilon$ [91, 708].
- If node $A$ has children $X_1, X_2, \dots, X_k$, then $A \to X_1 X_2 \dots X_k$ must be a production in $P$ [92, 709].

#### Yield of a Parse Tree
The yield of a parse tree is the string formed by reading the leaves from left to right [94, 181].

#### Ambiguity
A grammar $G$ is **ambiguous** if there exists some string $w \in L(G)$ that can produce two or more distinct parse trees (which is equivalent to producing two or more distinct leftmost derivations, or two or more distinct rightmost derivations) [185, 755, 762].

An important example is the classic arithmetic expression grammar [185, 752]:
$$E \to E + E \mid E \times E \mid \text{id}$$
The string $\text{id} + \text{id} \times \text{id}$ has two distinct parse trees [185, 752]. We resolve this by restructuring the grammar to encode operator precedence and associativity [97, 756]:
1. **Factor ($F$)**: Unbreakable basic blocks [97, 758]:
   $$F \to \text{id} \mid (E)$$ [97, 757]
2. **Term ($T$)**: Expressions bound by multiplicative operations [97, 758]:
   $$T \to T \times F \mid F$$ [98, 757]
3. **Expression ($E$)**: General additive expressions [98, 760]:
   $$E \to E + T \mid T$$ [98, 757]

#### Inherently Ambiguous Languages
A context-free language $L$ is **inherently ambiguous** if *all* grammars generating $L$ are ambiguous [763]. An example is [764]:
$$L = \{ a^n b^n c^m d^m \mid n \ge 1, m \ge 1 \} \cup \{ a^n b^m c^m d^n \mid n \ge 1, m \ge 1 \}$$ [764]
Any grammar for $L$ must generate strings of the form $a^n b^n c^n d^n$ in two distinct ways—one aligning $a$ with $b$ and $c$ with $d$, and another aligning $a$ with $d$ and $b$ with $c$ [765-767].

---

### 2.3 Pushdown Automata (PDA) Formalisms

A Pushdown Automaton is a nondeterministic finite automaton coupled with an external, infinite stack [782-783]. Formally, a PDA is a 7-tuple [788]:
$$P = (Q, \Sigma, \Gamma, \delta, q_0, Z_0, F)$$ [788]

Where:
- $Q, \Sigma, q_0, F$ are the states, alphabet, start state, and final states [788].
- $\Gamma$ is the finite **stack alphabet** [789].
- $Z_0 \in \Gamma$ is the **start stack symbol** [790].
- $\delta: Q \times (\Sigma \cup \{\epsilon\}) \times \Gamma \to \mathcal{P}(Q \times \Gamma^*)$ is the transition function [789].

#### Instantaneous Description (ID)
We define the state of the PDA at any step as a triple $(q, w, \gamma) \in Q \times \Sigma^* \times \Gamma^*$, representing the current state, the remaining unread input string, and the complete stack contents (top of stack is leftmost) [791].

A transition step is written [792]:
$$(q, aw, X\beta) \vdash_P (p, w, \alpha\beta)$$
where $(p, \alpha) \in \delta(q, a, X)$ [792].

#### Acceptance Mechanisms
A PDA can accept languages in two equivalent ways [796-797]:
1. **Acceptance by Final State ($L(P)$)** [797]:
   $$L(P) = \{ w \in \Sigma^* \mid (q_0, w, Z_0) \vdash^* (p, \epsilon, \gamma) \text{ for some } p \in F, \gamma \in \Gamma^* \}$$ [798]
2. **Acceptance by Empty Stack ($N(P)$)** [796]:
   $$N(P) = \{ w \in \Sigma^* \mid (q_0, w, Z_0) \vdash^* (p, \epsilon, \epsilon) \text{ for any state } p \in Q \}$$ [796]

### 2.4 Equivalence of PDAs and CFGs

The classes of languages accepted by final state, accepted by empty stack, and generated by context-free grammars are identical [804].

#### Grammar to PDA (Empty Stack)
To construct a 1-state PDA $P = (\{q\}, T, V \cup T, \delta, q, S, \emptyset)$ from a CFG $G = (V, T, P, S)$ that accepts by empty stack [805]:
1. For each variable $A \in V$, add the transition:
   $$\delta(q, \epsilon, A) = \{ (q, \beta) \mid A \to \beta \in P \}$$ [805]
2. For each terminal symbol $a \in T$, add the transition:
   $$\delta(q, a, a) = \{ (q, \epsilon) \}$$ [805]

The PDA simulates a leftmost derivation of the input string on its stack [806].

#### PDA (Empty Stack) to Grammar
To construct an equivalent CFG $G = (V, \Sigma, P, S)$ from a PDA $P = (Q, \Sigma, \Gamma, \delta, q_0, Z_0, \emptyset)$ accepting by empty stack, we define nonterminals of the form $[pXq]$ [808-810].
The variable $[pXq]$ generates all strings that cause the PDA to pop $X$ off the stack while transitioning from state $p$ to state $q$ [810].
1. For each state $p \in Q$, add the production:
   $$S \to [q_0 Z_0 p]$$ [801, 811]
2. For each transition $(r, Y_1 Y_2 \dots Y_k) \in \delta(p, a, X)$, and for all possible state sequences $s_1, s_2, \dots, s_k \in Q$, add the production [891]:
   $$[pXs_k] \to a [rY_1s_1][s_1Y_2s_2]\dots[s_{k-1}Y_ks_k]$$ [891]
   If $k = 0$ (stack popped), the production is:
   $$[pX r] \to a$$

---

### 2.5 Chomsky Normal Form (CNF) & Conversions

Any context-free grammar can be simplified into an equivalent grammar in **Chomsky Normal Form (CNF)** where all productions are strictly of the form [211, 845]:
$$A \to BC \quad \text{or} \quad A \to a$$
where $A, B, C \in V$ and $a \in T$ [211, 845].

#### The Simplification Pipeline
1. **Eliminate $\epsilon$-productions**: Identify **nullable variables** (variables $A \Rightarrow^* \epsilon$) [210, 834]. Remove productions $A \to \epsilon$, and for each production containing nullable variables, add copies with those variables omitted [834-835].
2. **Eliminate Unit Productions**: Identify **unit pairs** $(A, B)$ such that $A \Rightarrow^* B$ using only productions of the form $C \to D$ [838]. For all unit pairs $(A, B)$ and non-unit productions $B \to \alpha$, add the production $A \to \alpha$, then delete all unit productions [838, 842].
3. **Eliminate Useless Symbols**:
   - **Generating symbols**: Identify symbols that can derive terminal-only strings [830-831]. Delete all non-generating symbols and productions containing them [829].
   - **Reachable symbols**: Identify symbols reachable from the start symbol $S$ [830, 832]. Delete all unreachable symbols [828, 832].
4. **Chomsky Normal Form Conversion**:
   - For any production of length $\ge 2$ containing terminal symbols, replace each terminal $a$ with a new variable $X_a$ and add the production $X_a \to a$ [847].
   - Split long production bodies $A \to B_1 B_2 \dots B_k$ ($k \ge 3$) by introducing cascade variables $C_1, C_2, \dots$ [848]:
     $$A \to B_1 C_1, \quad C_1 \to B_2 C_2, \quad \dots \quad C_{k-2} \to B_{k-1} B_k$$ [848]

## Module 3: Non-Regular & Non-Context-Free Languages (Pumping Lemmas)

### 3.1 Pumping Lemma for Regular Languages

The **Pumping Lemma for Regular Languages** states that for every regular language $L$, there exists a constant $p$ (the pumping length) such that any string $z \in L$ of length $|z| \ge p$ can be split into three parts, $z = xyz$, satisfying three conditions [605]:
1. $y \neq \epsilon$ (i.e., $|y| \ge 1$) [607].
2. $|xy| \le p$ [606].
3. For all $i \ge 0$, $x y^i z \in L$ [607].

#### Proof of Non-Regularity for $\{a^n b^n \mid n \ge 0\}$
Suppose $L_1 = \{a^n b^n \mid n \ge 0\}$ is regular [606, 647].
1. Let $p$ be the pumping length [605].
2. Choose $z = a^p b^p$. Note $|z| = 2p \ge p$.
3. By condition 2, the split $z = xyz$ must satisfy $|xy| \le p$, meaning that $y$ consists entirely of $a$'s (i.e., $y = a^k$ for some $k \ge 1$) [606].
4. According to condition 3, pumping $y$ with $i = 2$ must yield $xy^2z \in L_1$.
5. However, $xy^2z = a^{p+k} b^p$. Since $k \ge 1$, the number of $a$'s ($p+k$) is strictly greater than the number of $b$'s ($p$), violating the language constraint.
6. This contradiction proves $L_1$ is not regular.

---

### 3.2 Pumping Lemma for Context-Free Languages

The **Pumping Lemma for Context-Free Languages** states that for every context-free language $L$, there exists a constant $n$ such that any string $z \in L$ of length $|z| \ge n$ can be split into five parts, $z = uvwxy$, satisfying [860]:
1. $vx \neq \epsilon$ (i.e., $|vx| \ge 1$) [860].
2. $|vwx| \le n$ [860].
3. For all $i \ge 0$, $u v^i w x^i y \in L$ [860].

#### Proof of Non-Context-Freedom for $\{a^k b^k c^k \mid k \ge 1\}$
Suppose $L_2 = \{a^k b^k c^k \mid k \ge 1\}$ is context-free [874].
1. Let $n$ be the pumping length [860-861].
2. Choose $z = a^n b^n c^n$, where $|z| \ge n$.
3. Since $|vwx| \le n$, the substring $vwx$ can span at most two distinct symbol types (either $a$'s and $b$'s, or $b$'s and $c$'s, but never all three) [860].
4. Since $|vx| \ge 1$, pumping $v$ and $x$ with $i = 2$ ($uv^2wx^2y$) increases the counts of the symbol types contained in $v$ and $x$, but leaves the count of the third symbol type unchanged.
5. This breaks the $1:1:1$ ratio, meaning $uv^2wx^2y \notin L_2$.
6. This contradiction proves $L_2$ is not context-free [875].

---

### 3.3 Decision & Closure Properties for Regular and CF Languages

| Operation | Regular Languages | Context-Free Languages |
| :--- | :--- | :--- |
| **Union** | **Yes** (via RE addition $R+S$) [609, 612] | **Yes** (via grammar union) [6, 872] |
| **Concatenation** | **Yes** (via RE concatenation $RS$) [609, 613] | **Yes** (via grammar concatenation) [6, 872] |
| **Kleene Star** | **Yes** (via RE star $R^*$) [609, 613] | **Yes** (via grammar star) [6, 872] |
| **Intersection** | **Yes** (via product construction) [609, 617-618] | **No** ($L_a \cap L_b$ can form $\{a^n b^n c^n\}$) [6, 874-875] |
| **Complement** | **Yes** (by swapping DFA final/non-final states) [609, 614] | **No** (due to DeMorgan's relation) [6, 882-883] |
| **Difference** | **Yes** ($L_1 \setminus L_2 = L_1 \cap \bar{L}_2$) [609, 623] | **No** ($T^* \setminus L$ would represent complement) [882-883] |
| **Reversal** | **Yes** (reversing RE structures inductively) [609, 625] | **Yes** (reversing production bodies) [873] |
| **Homomorphism** | **Yes** (substituting strings for symbols) [609, 628-629] | **Yes** (substituting CF languages for symbols) [864, 872] |
| **Inverse Hom.** | **Yes** (DFA state transition mapping $q \xrightarrow{h(a)} p$) [609, 631, 633] | **Yes** (PDA buffer-based simulation) [864, 884-885] |

#### Intersection of a CFL and a Regular Language
If $L$ is a CFL and $R$ is a regular language, then $L \cap R$ is always a CFL [389, 876]. This is proved by running a DFA for $R$ in parallel with a PDA for $L$, where the transition system tracks both states simultaneously while using the PDA stack [876-877].

#### Decision Algorithms for Regular Languages
- **Emptiness**: Solved in $O(|V| + |E|)$ via graph reachability from the start state to any accepting state [656-657].
- **Membership**: Simulating a DFA on string $w$ executes in $O(|w|)$ time [97, 659].
- **Equivalence**: Run the Table-Filling algorithm on the union of states of both DFAs; if their start states are equivalent, the DFAs are equivalent [662, 666-667].

#### Decision Algorithms for Context-Free Languages
- **Emptiness**: Solved in $O(|G|)$ time by computing the set of generating variables and verifying if the start symbol $S$ of $G$ is generating [830, 894].
- **Membership**: Solved in $O(n^3)$ time via the **CYK (Cocke-Younger-Kasami) Dynamic Programming Algorithm**, which fills a triangular table to determine if substring $w[i..j]$ can be derived from variable $A$ [164, 895-896].
- **Equivalence / Minimization**: **Undecidable** [897-898].

## Module 4: Turing Machines & Computability Theory

### 4.1 The Turing Machine (TM) Model

A Turing Machine (TM) is an abstract mathematical machine that models physical computers [404, 908]. Formally, a TM is a 7-tuple [926]:
$$M = (Q, \Sigma, \Gamma, \delta, q_0, B, F)$$ [926]

Where:
- $Q$ is the finite set of state controls [926].
- $\Sigma$ is the input alphabet [926].
- $\Gamma$ is the tape alphabet ($\Sigma \subset \Gamma$) [926].
- $B \in \Gamma \setminus \Sigma$ is the **blank symbol** [927].
- $q_0 \in Q$ is the start state [927].
- $F \subseteq Q$ is the set of accepting states [927].
- $\delta$ is the transition function mapping state and scanned symbol to next state, written symbol, and tape head direction [926]:
  $$\delta: Q \times \Gamma \to Q \times \Gamma \times \{L, R\}$$ [926]

```text
       Tape:   ... | B | B | X_1 | X_2 | ... | X_n | B | B | ...
                             ^
                             | (Tape Head reads and writes)
                     +-----------------+
                     |  Finite Control | ---> State q
                     +-----------------+
```

#### Instantaneous Description (ID)
A TM's configuration is represented as $\alpha_1 q \alpha_2$ [928]:
- $\alpha_1 \alpha_2 \in \Gamma^*$ is the tape contents up to the last non-blank symbol [928].
- $q \in Q$ is the current state [928].
- The tape head is scanned at the first symbol of $\alpha_2$ [928].

---

### 4.2 Programming Techniques & TM Subroutines

#### Storage in the State
The finite control can hold data by structuring the state set as a cartesian product $Q = Q' \times \Gamma_k$, allowing the machine to remember symbols read while transitioning [946-947].

#### Multiple Tracks
The tape alphabet can represent tuples $\Gamma = \Gamma_1 \times \Gamma_2 \times \dots$, allowing the single tape to behave as though it has multiple tracks [948].

#### Subroutines
A TM subroutine is a isolated partition of states with an entry start state and a return state [951]. A "call" is executed by transitioning to the subroutine's entry state [951].

---

### 4.3 Variants & Restricted Turing Machines

All the following variants have the **same computational power** as a standard single-tape Turing machine (they accept the class of recursively enumerable languages) [954]:

1. **Multitape Turing Machines**: Features $k$ separate tapes and tape heads [955]. A move is based on the vector of symbols scanned on all $k$ tapes [955, 1004].
   - *Simulation*: A single-tape TM simulates $k$ tapes by using $2k$ tracks—one track for tape contents, and one track holding a marker (like a dot) to represent the head position [957, 1004].
2. **Nondeterministic Turing Machines (NTM)**: The transition function yields multiple choices [960]:
   $$\delta: Q \times \Gamma \to \mathcal{P}(Q \times \Gamma \times \{L, R\})$$ [960]
   - *Simulation*: A deterministic TM simulates an NTM by using a queue on a second tape to perform a breadth-first search of all computational paths [961].
3. **Semi-Infinite Tape TMs**: The tape head cannot move left of the initial starting cell [966].
   - *Simulation*: Achieved by splitting the tape into two tracks representing the positive and negative directions of an infinite tape [966].

---

### 4.4 Multistack & Counter Machines

#### Multistack Machines
A $k$-stack machine is a deterministic PDA with $k$ separate stacks [969].
- A **2-stack machine** is Turing-complete (can simulate any TM) [967, 977].
  - *Simulation Strategy*: Stack 1 holds the tape contents to the left of the head; Stack 2 holds the tape contents to the right of the head [971]. Moving the head corresponds to popping from one stack and pushing onto the other [972].

#### Counter Machines
A counter machine is a restricted multistack machine where the stack alphabet consists of only two symbols: $Z_0$ (bottom marker) and $X$ [974]. Thus, each stack acts as a counter holding a nonnegative integer, where the machine can only increment/decrement by 1 and check for zero [973-975].
- **1-counter machine**: Can only accept a subset of context-free languages [976].
- **2-counter machine**: **Turing-complete** (can accept any RE language) [979].
  - *Proof Structure*: We represent the two stacks of a Turing-complete 2-stack machine as integers $i$ and $j$ in base $r$ (where $r$ is the stack alphabet size) [977]. A 3-counter machine can perform multiplication and division by $r$ to simulate stack pushes and pops [978]. We then simulate three counters $i, j, k$ with two counters by encoding their values as a single integer $m = 2^i 3^j 5^k$ [979]. Incrementing/decrementing a counter corresponds to multiplying/dividing $m$ by 2, 3, or 5 [980-981].

## Module 5: Decidability, Undecidability & Complexity

### 5.1 Decidability & Recursive/RE Languages

We classify formal languages into three distinct rings [1025]:

```text
  +--------------------------------------------+
  | Non-Recursively Enumerable (non-RE)        |
  |   e.g., L_d                                |
  |   +------------------------------------+   |
  |   | Recursively Enumerable (RE)        |   |
  |   |   e.g., L_u                        |   |
  |   |   +----------------------------+   |   |
  |   |   | Decidable (Recursive)      |   |   |
  |   |   |   e.g., L(A) for DFA       |   |   |
  |   |   +----------------------------+   |   |
  |   +------------------------------------+   |
  +--------------------------------------------+
```

1. **Decidable (Recursive) Languages**: A language $L$ is decidable if there exists a TM (a **decider**) that halts on *every* input string $w \in \Sigma^*$ [941, 1024].
   - If $w \in L$, the decider halts and accepts [1024].
   - If $w \notin L$, the decider halts and rejects [1024].
2. **Recursively Enumerable (RE) Languages**: A language $L$ is RE if there exists a TM (a **recognizer**) such that [939, 1002]:
   - If $w \in L$, the TM eventually halts and accepts [1023].
   - If $w \notin L$, the TM may run forever (infinite loop) or halt and reject [1023].
3. **Non-RE Languages**: No TM can recognize membership in the language, even with infinite time [1025].

#### Complement Closure Theorem
- **Theorem 1**: If a language $L$ is recursive (decidable), then its complement $\bar{L}$ is also recursive [1025-1026].
  - *Proof*: Run the decider $M$ for $L$. Swap its halting "accept" and "reject" configurations [1028-1029].
- **Theorem 2**: If both $L$ and $\bar{L}$ are recursively enumerable (RE), then $L$ is recursive [1030].
  - *Proof*: Run the recognizer $M_1$ for $L$ and $M_2$ for $\bar{L}$ in parallel (alternating steps) on a 2-tape TM [1030-1031]. Since $w$ must be in either $L$ or $\bar{L}$, one of the two machines is guaranteed to halt [1031]. If $M_1$ halts, accept; if $M_2$ halts, reject [1031].

---

### 5.2 Diagonalization & The Undecidable Language $L_d$

To prove that undecidable problems exist, we use Georg Cantor's **diagonalization proof technique** [1018].

#### Enumeration of Turing Machines
We can encode any TM as a unique binary string [1019]. We can order all binary strings by length and lexicographically: $w_1, w_2, w_3, \dots$ [1018]. Thus, we can list all possible Turing machines: $M_1, M_2, M_3, \dots$ [1018].

#### The Diagonalization Language ($L_d$)
We define $L_d$ as the set of strings $w_i$ such that the $i$-th TM $M_i$ does *not* accept its own binary representation $w_i$ [1020]:
$$L_d = \{ w_i \mid w_i \notin L(M_i) \}$$ [1020]

#### Proof that $L_d$ is not RE
Suppose $L_d$ is RE. Then there must exist some TM in our ordered list, say $M_k$, that accepts $L_d$ ($L(M_k) = L_d$) [1020].
1. Ask the membership question: Is $w_k \in L_d$?
2. **Case 1**: Assume $w_k \in L_d$. By definition of $L_d$, $w_k \notin L(M_k)$. But since $L(M_k) = L_d$, this implies $w_k \notin L_d$, a contradiction.
3. **Case 2**: Assume $w_k \notin L_d$. By definition of $L(M_k)$, this means $w_k \notin L(M_k)$. By definition of $L_d$, this implies $w_k \in L_d$, a contradiction.
4. Since $M_k$ can neither accept nor reject $w_k$ consistently, our assumption that $L_d$ is recognized by *any* TM is false. $L_d$ is **not recursively enumerable (non-RE)** [1021].

---

### 5.3 The Universal Language $L_u$ & The Halting Problem

#### The Universal Language ($L_u$)
The universal language consists of all encoded pairs $\langle M, w \rangle$ where $M$ is a TM and $w$ is an input string accepted by $M$ [1034]:
$$L_u = \{ \langle M, w \rangle \mid w \in L(M) \}$$ [1034]

- **Theorem**: $L_u$ is recursively enumerable (RE) but **undecidable** [1025].
  - *RE Proof*: We construct a **Universal Turing Machine ($U$)** that simulates $M$ on input $w$ [1034-1035]. If $M$ accepts $w$, $U$ accepts $\langle M, w \rangle$ [1037].
  - *Undecidability Proof (by contradiction)*: Suppose $L_u$ is decidable by a halting decider $H$. We construct a new decider $D$ that takes a TM code $x$ as input:
    - $D$ runs $H$ on the pair $\langle x, x \rangle$.
    - If $H$ accepts $\langle x, x \rangle$ (meaning $x$ accepts its own code), then $D$ rejects.
    - If $H$ rejects $\langle x, x \rangle$ (meaning $x$ does not accept its own code), then $D$ accepts.
    - This decider $D$ is equivalent to a decider for $\bar{L}_d$. But since $L(D) = L_d$, this means $L_d$ is decidable, which contradicts our proof that $L_d$ is non-RE. Thus, $L_u$ must be undecidable.

#### The Halting Problem ($H_M$)
The halting problem is the set of all pairs $\langle M, w \rangle$ such that $M$ eventually halts on input $w$ (either by accepting or rejecting) [1038]:
$$H_M = \{ \langle M, w \rangle \mid M \text{ halts on } w \}$$ [1038]
The Halting Problem is **RE but undecidable** [1038-1039].

### 5.4 Undecidable Problems about Turing Machines & Rice's Theorem

We can prove other problems undecidable by using **reductions** [1037]. A reduction from $P_1$ to $P_2$ is an algorithm that maps instances of $P_1$ to instances of $P_2$ such that [914, 1043]:
$$w \in P_1 \iff f(w) \in P_2$$ [916, 1044]
If $P_1$ is undecidable, then $P_2$ must also be undecidable [1044].

#### Rice's Theorem
**Rice's Theorem** states that **any nontrivial semantic property** of the languages accepted by Turing machines is undecidable [9, 1071].
- A property $\mathcal{P}$ is a set of RE languages [1050].
- $\mathcal{P}$ is **nontrivial** if it is neither empty (some RE languages have it) nor contains all RE languages (some RE languages do not have it) [1051].
- A property is **semantic** if it depends only on the *language accepted* by the TM, not on the TM's internal structure or code [1050]. That is, if $L(M_1) = L(M_2)$, then $M_1 \in \mathcal{P} \iff M_2 \in \mathcal{P}$.

#### Proof of Rice's Theorem
Let $\mathcal{P}$ be a nontrivial semantic property. Assume the empty language $\emptyset \notin \mathcal{P}$ (if $\emptyset \in \mathcal{P}$, we can simply work with the complement property $\bar{\mathcal{P}}$) [1051]. Since $\mathcal{P}$ is nontrivial, there exists some RE language $L \in \mathcal{P}$ accepted by TM $M_L$ [1051].

We reduce the undecidable Universal Language $L_u$ to $L_{\mathcal{P}}$ (the set of TMs whose language is in $\mathcal{P}$) [1051]. Given an instance $\langle M, w \rangle$ of $L_u$, we construct a new TM $M'$ that takes an input string $x$ [1048, 1051]:
1. $M'$ first simulates $M$ on input $w$ (ignoring $x$) [1048, 1051].
2. If $M$ accepts $w$, $M'$ then simulates $M_L$ on $x$, accepting if $M_L$ accepts [1051].

Now analyze the language of the constructed machine $M'$ [1051]:
- **Case 1**: If $M$ accepts $w$, then $M'$ will simulate $M_L$ on all inputs $x$. Thus, $L(M') = L(M_L) = L$. Since $L \in \mathcal{P}$, the code for $M'$ is in $L_{\mathcal{P}}$ [1051].
- **Case 2**: If $M$ does not accept $w$, then $M'$ will never progress to simulating $M_L$. Thus, $L(M') = \emptyset$. Since $\emptyset \notin \mathcal{P}$, the code for $M'$ is not in $L_{\mathcal{P}}$ [1051].

Therefore:
$$\langle M, w \rangle \in L_u \iff M' \in L_{\mathcal{P}}$$
Since $L_u$ is undecidable, deciding whether $L(M') \in \mathcal{P}$ is undecidable [1051].

---

### 5.5 Post's Correspondence Problem (PCP)

**Post's Correspondence Problem (PCP)** is an undecidable problem involving string matching [1055].

An instance of PCP consists of two lists of strings of equal length over an alphabet $\Sigma$ [1062]:
- List $A = w_1, w_2, \dots, w_k$ [1062]
- List $B = x_1, x_2, \dots, x_k$ [1062]

A **solution** to PCP is a sequence of indices $i_1, i_2, \dots, i_m$ ($m \ge 1$) such that the concatenation of strings from List $A$ matches the concatenation from List $B$ [1063]:
$$w_{i_1} w_{i_2} \dots w_{i_m} = x_{i_1} x_{i_2} \dots x_{i_m}$$ [1063]

#### Modified PCP (MPCP)
In Modified PCP, the solution sequence is forced to start with index 1 ($i_1 = 1$) [1056].
- **Theorem**: MPCP can be reduced to PCP, and the halting problem can be reduced to MPCP, proving **both PCP and MPCP are undecidable** [1055-1056].

#### Application: Undecidable Problems of CFGs
Using PCP, we can prove several important CFG questions are undecidable [397, 1073]:
1. **Ambiguity**: Is a given CFG $G$ ambiguous [897, 1073]?
   - *Proof*: Given a PCP instance with lists $A$ and $B$, we construct grammars $G_A$ and $G_B$ with productions [1062-1065]:
     $$S \to A \mid B$$
     $$A \to w_i A a_i \mid w_i a_i$$ [1063]
     $$B \to x_i B a_i \mid x_i a_i$$ [1065]
     where $a_i$ are unique index markers [1062]. If a PCP solution exists, then some sequence of choices yields the same string of terminals and indices from both $A$ and $B$, causing the grammar to have two distinct parse trees [1068].
2. **Equivalence**: Are two CFGs $G_1, G_2$ equivalent ($L(G_1) = L(G_2)$) [897, 1078]? (Undecidable) [897, 1078]
3. **Universality**: Does a CFG generate all possible strings ($L(G) = \Sigma^*$) [1068]? (Undecidable) [1068]

---

### 5.6 Complexity Theory Foundations ($P$, $NP$, and $PS$)

We classify decidable languages based on their consumption of computational resources (time and space) [1076, 1119]:

#### Class $P$ (Polynomial Time)
$$P = \bigcup_{k \ge 1} \text{TIME}(n^k)$$
The class of languages accepted by a deterministic Turing machine in worst-case time $O(n^k)$ [1088]. This corresponds to computationally tractable problems [1076, 1088].

#### Class $NP$ (Nondeterministic Polynomial Time)
$$NP = \bigcup_{k \ge 1} \text{NTIME}(n^k)$$
The class of languages accepted by a nondeterministic Turing machine where the execution tree along any valid branch has depth at most $O(n^k)$ [1088]. Alternatively, it is the class of languages whose solutions can be verified deterministically in polynomial time.
- **The $P$ vs. $NP$ Question**: We know $P \subseteq NP$, but we do not know if $P = NP$.

#### NP-Completeness
A language $L$ is **NP-complete** if [1077]:
1. $L \in NP$ [1077].
2. For every language $L' \in $ NP, $L'$ is polynomial-time reducible to $L$ ($L' \le_p L$) [1077].

The foundational NP-complete problem is the **Satisfiability Problem (SAT)** (proven by Cook's Theorem) [398, 1090].

#### Class $PS$ (Polynomial Space)
The class of languages accepted by a deterministic Turing machine using at most $O(n^k)$ tape cells [1095, 1119].
- **Savitch's Theorem**: Nondeterminism does not increase the power of space complexity classes. If a language is accepted by an NTM using $f(n)$ space, it can be accepted by a DTM using $f^2(n)$ space [1095, 1120]. Thus:
  $$\text{PS} = \text{NPS}$$ [1097, 1120]
- The known relationships among these classes are [1122]:
  $$P \subseteq NP \subseteq PS$$ [1098]
