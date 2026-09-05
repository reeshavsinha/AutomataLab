# Complete Theory of Computation Reference Handbook (v2)

This handbook provides an exhaustive, mathematically rigorous reference for the **Theory of Computation (TOC)**, expanded and compiled directly from your syllabus and primary textbook sources. It covers formal languages, finite automata, context-free grammars, pushdown automata, pumping lemmas, Turing machines, decidability, and complexity theory, with detailed mathematical definitions, complete algorithm traces, and worked exam-style problems.

---

## Table of Contents
1. [Module 1: Regular Expressions & Finite Automata](#module-1-regular-expressions--finite-automata)
   - [1.1 Regular Expressions (Algebraic Foundations)](#11-regular-expressions-algebraic-foundations)
   - [1.2 Deterministic Finite Automata (DFA)](#12-deterministic-finite-automata-dfa)
   - [1.3 Nondeterministic Finite Automata (NFA) & $\epsilon$-NFAs](#13-nondeterministic-finite-automata-nfa---nfas)
   - [1.4 Thompson's Construction (RE to $\epsilon$-NFA)](#14-thompsons-construction-re-to-epsilon-nfa)
   - [1.5 DFA/NFA Equivalence & Subset Construction](#15-dfanfa-equivalence--subset-construction)
   - [1.6 Myhill–Nerode Theorem](#16-myhillnerode-theorem)
   - [1.7 State Minimization & Table-Filling Algorithm](#17-state-minimization--table-filling-algorithm)
   - [1.8 Formal Properties & Product Construction](#18-formal-properties--product-construction)
2. [Module 2: Context-Free Grammars & Pushdown Automata](#module-2-context-free-grammars--pushdown-automata)
   - [2.1 Context-Free Grammars (CFG) & Derivations](#21-context-free-grammars-cfg--derivations)
   - [2.2 Parse Trees, Ambiguity, & Conversions](#22-parse-trees-ambiguity--conversions)
   - [2.3 Pushdown Automata (PDA) Formalisms](#23-pushdown-automata-pda-formalisms)
   - [2.4 Equivalence of PDAs and CFGs](#24-equivalence-of-pdas-and-cfgs)
   - [2.5 Chomsky Normal Form (CNF) & Grammatical Simplifications](#25-chomsky-normal-form-cnf--grammatical-simplifications)
3. [Module 3: Non-Regular & Non-Context-Free Languages](#module-3-non-regular--non-context-free-languages)
   - [3.1 Pumping Lemma for Regular Languages](#31-pumping-lemma-for-regular-languages)
   - [3.2 Pumping Lemma for Context-Free Languages](#32-pumping-lemma-for-context-free-languages)
   - [3.3 Language Classification & Machine Equivalences](#33-language-classification--machine-equivalences)
   - [3.4 Closure Properties Cheat Sheet](#34-closure-properties-cheat-sheet)
   - [3.5 Decision Properties for Regular and Context-Free Languages](#35-decision-properties-for-regular-and-context-free-languages)
4. [Module 4: Turing Machines & Computability Theory](#module-4-turing-machines--computability-theory)
   - [4.1 The Turing Machine (TM) Model](#41-the-turing-machine-tm-model)
   - [4.2 Programming Techniques & TM Subroutines](#42-programming-techniques--tm-subroutines)
   - [4.3 Variants & Restricted Turing Machines](#43-variants--restricted-turing-machines)
   - [4.4 Multistack & Counter Machines](#44-multistack--counter-machines)
   - [4.5 GATE-Style TM Problem Solving & Tracing Tutorial](#45-gate-style-tm-problem-solving--tracing-tutorial)
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

#### Core Concepts [321]
1. **Alphabet ($\Sigma$)**: A finite, nonempty set of symbols [426]. Examples include the binary alphabet $\Sigma = \{0, 1\}$ or the ASCII character set [426-427].
2. **String (Word)**: A finite sequence of symbols chosen from an alphabet [427].
   - **Length ($|w|$)**: The number of symbol occurrences in the string [427].
   - **Empty String ($\epsilon$)**: The unique string of length zero [427].
3. **Empty Language ($\emptyset$)**: A language containing no strings ($\emptyset \neq \{\epsilon\}$ since $\{\epsilon\}$ contains one string of length zero) [430].
4. **Language ($L$)**: Any subset of $\Sigma^*$, the set of all strings over $\Sigma$ [428].

#### Operations on Languages [135, 536]
Let $L$ and $M$ be languages over an alphabet $\Sigma$ [135, 536]:
- **Union**: $L \cup M = \{ s \mid s \in L \text{ or } s \in M \}$ [136, 536].
- **Concatenation**: $L M = \{ st \mid s \in L \text{ and } t \in M \}$ [136, 536].
- **Kleene Closure**: $L^* = \bigcup_{i=0}^{\\infty} L^i$, where $L^0 = \{\epsilon\}$ and $L^i = L^{i-1} L$ [135-136, 537].
- **Positive Closure**: $L^+ = \bigcup_{i=1}^{\\infty} L^i = L^* \setminus \{\epsilon\}$ (unless $\epsilon \in L$) [135-136].

#### Algebraic Laws of Regular Expressions [581]
Regular expressions obey several arithmetic-like properties under union ($+$) and concatenation ($\cdot$) [581]:
- **Commutativity of Union**: $R + S = S + R$ [582]. Concatenation is *not* commutative ($RS \neq SR$ in general) [584].
- **Associativity**: $(R + S) + T = R + (S + T)$ and $(RS)T = R(ST)$ [582-584].
- **Distributivity**: $R(S + S) = RS + RT$ and $(S + T)R = SR + TR$ [585].
- **Identities & Annihilators**: $\emptyset + R = R$, $\epsilon R = R\epsilon = R$, and $\emptyset R = R\emptyset = \emptyset$ [541].
- **Idempotence**: $R + R = R$ [587].
- **Closure Properties**: $(R^*)^* = R^*$, $\emptyset^* = \{\epsilon\}$, and $R^* = \epsilon + RR^*$ [543, 587].

#### Conversion: DFA to RE via Inductive Path Formula ($R_{ij}^{(k)}$) [547-548]
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

#### State Elimination Method [558]
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

#### Extended Transition Function ($\hat{\delta}$) [463]
We inductively define $\hat{\delta}: Q \times \Sigma^* \to Q$ to describe string processing [463]:
- **Basis**: $\hat{\delta}(q, \epsilon) = q$ [464].
- **Inductive Step**: For $w = xa$ where $x \in \Sigma^*$ and $a \in \Sigma$ [464]:
  $$\hat{\delta}(q, xa) = \delta(\hat{\delta}(q, x), a)$$ [464]

#### Language of a DFA [469]
The language accepted by a DFA $A$ is [469]:
$$L(A) = \{ w \in \Sigma^* \mid \hat{\delta}(q_0, w) \in F \}$$ [470]

---

### 1.3 Nondeterministic Finite Automata (NFA) & $\epsilon$-NFAs

An **NFA** allows transitions to zero, one, or multiple states from a single input symbol [57, 475]. Formally, it is a 5-tuple $N = (Q, \Sigma, \delta, q_0, F)$ [480-481] where the transition function returns subsets of states:
$$\delta: Q \times \Sigma \to \mathcal{P}(Q)$$ [319, 481]

#### Extended Transition Function ($\hat{\delta}$) for NFA [483]
- **Basis**: $\hat{\delta}(q, \epsilon) = \{q\}$ [483].
- **Inductive Step**: For $w = xa$ [483]:
  $$\hat{\delta}(q, xa) = \bigcup_{p \in \hat{\delta}(q, x)} \delta(p, a)$$ [322, 483]

#### Finite Automata with $\epsilon$-Transitions ($\epsilon$-NFA) [361, 505]
An $\epsilon$-NFA can spontaneously transition without consuming input symbols [361, 505]. Its transition function allows $\epsilon$ as an input [508]:
$$\delta: Q \times (\Sigma \cup \{\epsilon\}) \to \mathcal{P}(Q)$$

#### $\epsilon$-Closure (ECLOSE) [509]
The $\epsilon$-closure of a state $q$, denoted $\text{ECLOSE}(q)$, is the set of all states reachable from $q$ using only $\epsilon$-labeled transitions [366, 509]:
- **Basis**: $q \in \text{ECLOSE}(q)$ [367, 510].
- **Induction**: If $p \in \text{ECLOSE}(q)$ and $r \in \delta(p, \epsilon)$, then $r \in \text{ECLOSE}(q)$ [367, 510].

We extend this to a set of states $S$ [511]:
$$\text{ECLOSE}(S) = \bigcup_{q \in S} \text{ECLOSE}(q)$$ [369, 511]
### 1.4 Thompson's Construction (RE to $\epsilon$-NFA) [79, 504]

The **McNaughton-Yamada-Thompson algorithm** mechanically converts any regular expression $r$ into an equivalent $\epsilon$-NFA $N(r)$ with a single accepting state and no transitions into its start state or out of its accepting state [79, 504, 507].

#### Basis Constructions [80, 507]
1. **For $r = \epsilon$**:
   ```text
   start ---> ( i ) -- epsilon --> (( f ))
   ```
2. **For $r = \emptyset$** (the empty language):
   ```text
   start ---> ( i )                (( f ))   (No transitions)
   ```
3. **For $r = a$** (where $a \in \Sigma$):
   ```text
   start ---> ( i ) ------ a -----> (( f ))
   ```

#### Inductive Constructions [81, 508]
Let $N(s)$ and $N(t)$ be the $\epsilon$-NFAs generated for regular expressions $s$ and $t$ [81, 508].

##### 1. Union ($r = s \mid t$ or $s \cup t$) [81, 509]
We introduce a new start state $i$ and a new accepting state $f$ [81, 509]. We add $\epsilon$-transitions from $i$ to the start states of $N(s)$ and $N(t)$, and $\epsilon$-transitions from their accepting states to $f$ [81, 509].
```text
                     e        +------+       e
                  +---------> | N(s) | ----------+
                  |           +------+           |
                  |                              v
       start ---> (i)                            ((f))
                  |                              ^
                  |  e        +------+       e   |
                  +---------> | N(t) | ----------+
                              +------+
```

##### 2. Concatenation ($r = st$) [82, 510]
The start state of $N(s)$ becomes the start of the combined machine, and the final state of $N(t)$ becomes the final state of the combined machine [82, 510]. The accepting state of $N(s)$ and the start state of $N(t)$ are merged into a single state [82, 510].
```text
       start ---> (i_s) === [ N(s) ] === (f_s / i_t) === [ N(t) ] === ((f_t))
```

##### 3. Kleene Closure ($r = s^*$) [83, 511]
We introduce a new start state $i$ and a new final state $f$ [83, 511]. We add $\epsilon$-transitions to allow bypassing $N(s)$ entirely, and $\epsilon$-transitions to loop back from the end of $N(s)$ to its beginning [83, 511].
```text
                              +--------------------+
                              |         e          |
                              v                    |
                     e     +------+       e        |
       start ---> (i) ----> | N(s) | ------------->((f))
                  |        +------+                 ^
                  |                                 |
                  +---------------------------------+
                                  e
```

#### Key Structural Properties of Thompson's NFAs [85]:
1. $N(r)$ has at most twice as many states as there are operators and operands in $r$ [85].
2. $N(r)$ has exactly one start state and one accepting state [85]. The start state has no incoming transitions, and the accepting state has no outgoing transitions [85].
3. Each state other than the accepting state has either exactly one transition on an alphabet symbol or at most two outgoing transitions, both on $\epsilon$ [85].

#### Example Trace: Converting $r = (a \mid b)^*abb$
Following the parse tree of $(a \mid b)^*abb$ [85-86]:
1. Create $N(a)$ (states 2, 3) and $N(b)$ (states 4, 5) [86].
2. Combine them via Union to form $N(a \mid b)$ with new start state 1 and new accepting state 6 [86].
3. Apply Kleene Star to $N(a \mid b)$ to form $N((a \mid b)^*)$ with new start state 0 and new accepting state 7 [86-87].
4. Concatenate $N((a \mid b)^*)$ with $N(a)$ (states 7' and 8; merging 7 and 7') [87].
5. Concatenate with $N(b)$ (states 8' and 9; merging 8 and 8') [87].
6. Concatenate with $N(b)$ (states 9' and 10; merging 9 and 9') [87].
The resulting $\epsilon$-NFA is [87, 73]:
```text
              e        +-----+       e
           +---------> | 2-3 | ----------+
           |           +-----+           |       a       b       b
start --> (0) -- e --> ( 1 ) -- e ----> (6) -e->(7) -a->(8) -b->(9) -b->((10))
           |  \                          ^       |
           |   +------> +-----+ --------+       |
           |            | 4-5 |                  |
           |            +-----+                  |
           +----------------- e -----------------+
```
### 1.5 DFA/NFA Equivalence & Subset Construction

Every NFA can be converted into an equivalent DFA that accepts the exact same language [487, 497]. The algorithm is known as the **Subset Construction** [329, 488].

Given an NFA $N = (Q_N, \\Sigma, \\delta_N, q_0, F_N)$, the equivalent DFA $D = (Q_D, \\Sigma, \\delta_D, q_D, F_D)$ is defined by [330, 489]:
1. **States**: $Q_D = \\mathcal{P}(Q_N)$ (power set of states) [330, 489].
2. **Start State**: $q_D = \\text{ECLOSE}(\\{q_0\\})$ (for $\\epsilon$-NFAs; or $\\{q_0\\}$ for standard NFAs) [330, 515].
3. **Accepting States**: $F_D = \\{ S \\subseteq Q_N \\mid S \\cap F_N \\neq \\emptyset \\}$ [331, 490].
4. **Transition Function**: For any subset $S \\subseteq Q_N$ and input symbol $a \\in \\Sigma$ [331, 490]:
   $$\\delta_D(S, a) = \\text{ECLOSE}\\left(\\bigcup_{p \\in S} \\delta_N(p, a)\\right)$$ [376, 516]

#### Worst-Case State Explosion
If an NFA has $n$ states, the corresponding DFA can have up to $2^n$ states [330, 489]. For example, the language:
$$L = \\{ w \\in \\{0, 1\\}^* \\mid \\text{the } n\\text{-th symbol from the right is } 1 \\}$$ [343, 473]
can be recognized by an NFA with $n+1$ states but requires at least $2^n$ states in any DFA, because the DFA must \"remember\" the exact sequence of the last $n$ symbols read [343, 498].

---

### 1.6 Myhill–Nerode Theorem [330]

The **Myhill–Nerode Theorem** provides a necessary and sufficient condition for a language to be regular, based on an equivalence relation on strings [330]. It is an essential tool for DFA state minimization and proving non-regularity [330].

#### The Indistinguishability Relation ($\equiv_L$)
Let $L$ be a language over $\Sigma$ [330]. We define a relation $\equiv_L$ on strings $x, y \in \Sigma^*$ as follows [330]:
$$x \equiv_L y \iff \forall z \in \Sigma^* : (xz \in L \iff yz \in L)$$
If $x \equiv_L y$, we say $x$ and $y$ are **indistinguishable** under $L$ [330]. If there exists some $z$ such that exactly one of $xz, yz$ is in $L$, then $z$ is a **distinguishing extension**, and $x$ and $y$ are distinguishable [330].

#### Properties of $\equiv_L$ [330]:
1. **Equivalence Relation**: It is reflexive ($x \equiv_L x$), symmetric ($x \equiv_L y \implies y \equiv_L x$), and transitive ($x \equiv_L y \land y \equiv_L z \implies x \equiv_L z$) [330]. Thus, it partitions $\Sigma^*$ into disjoint equivalence classes [330].
2. **Right Invariance**: It is right-invariant with respect to concatenation [330]. That is, if $x \equiv_L y$, then for any symbol $a \in \Sigma$, $xa \equiv_L ya$ [330].

#### Formal Statement of the Theorem [330]
The Myhill–Nerode Theorem states that:
1. A language $L \subseteq \Sigma^*$ is regular if and only if the number of equivalence classes of $\equiv_L$ (called the **index** of $\equiv_L$) is finite [330].
2. The number of states in the unique minimum-state DFA accepting $L$ is exactly equal to the index of $\equiv_L$ [330]. Each state of the minimum DFA corresponds exactly to one equivalence class of $\equiv_L$ [330].

#### Proving Non-Regularity using Myhill–Nerode
To prove that a language $L$ is not regular using the Myhill-Nerode theorem, we must show that $\equiv_L$ has an infinite number of equivalence classes [330]. We do this by constructing an infinite set of strings $S$ such that every pair of distinct strings in $S$ is distinguishable [330].

##### Worked Proof: $L = \{a^n b^n \mid n \ge 0\}$
Suppose we want to prove $L$ is not regular [557]:
1. Consider the infinite set of strings $S = \{a^i \mid i \ge 0\} = \{\epsilon, a, aa, aaa, \dots\}$.
2. Let $a^i$ and $a^j$ be two distinct strings in $S$ with $i \neq j$.
3. We choose the distinguishing extension $z = b^i$.
4. Concatenating $z$ to both strings yields:
   - $a^i z = a^i b^i \in L$ (since the number of $a$'s matches $b$'s).
   - $a^j z = a^j b^i \notin L$ (since $i \neq j$, so the number of $a$'s does not match $b$'s).
5. Since $a^i z \in L$ and $a^j z \notin L$, the extension $z$ distinguishes $a^i$ and $a^j$. Thus, $a^i \not\equiv_L a^j$ for any $i \neq j$.
6. This implies that every string in $S$ belongs to a completely different equivalence class of $\equiv_L$.
7. Since $S$ is infinite, $\equiv_L$ must have infinitely many equivalence classes (infinite index).
8. By the Myhill–Nerode Theorem, $L$ is **not regular**.

---

### 1.7 State Minimization & Table-Filling Algorithm

For any regular language, there exists a unique **minimum-state DFA** (up to state isomorphism) [135, 662]. State minimization is performed by identifying equivalent states [576, 662].

#### Equivalent vs. Distinguishable States
Two states $p$ and $q$ in a DFA are **equivalent** ($p \\approx q$) if they produce the same acceptance decisions for all possible future input strings [577]:
$$\\forall w \\in \\Sigma^* : (\\hat{\\delta}(p, w) \\in F \\iff \\hat{\\delta}(q, w) \\in F)$$ [577]
If such a string $w$ exists that distinguishes them, they are **distinguishable** [578, 663]. State equivalence is an equivalence relation (transitive, symmetric, reflexive) and partitions the state set into disjoint blocks [668-669].

#### The Table-Filling Algorithm
The table-filling algorithm systematically computes distinguishable state pairs [580, 663]:
1. **Basis**: Mark all pairs $\\{p, q\\}$ where $p \\in F$ and $q \\notin F$ (or vice versa) as distinguishable [580, 664].
2. **Inductive Step**: For each unmarked pair $\\{p, q\\}$, if there exists an input symbol $a \\in \\Sigma$ such that the transitioned pair $\\{\\delta(p, a), \\delta(q, a)\\}$ is already marked as distinguishable, then mark $\\{p, q\\}$ as distinguishable [580, 663].
3. Iterate step 2 until no more pairs can be marked [580, 664].
4. Any pair $\\{p, q\\}$ that remains unmarked at termination represents equivalent states, which can be merged into a single state in the minimized DFA [580, 665, 670].

---

### 1.8 Formal Properties & Product Construction

#### Reachability
A state $q \\in Q$ is **reachable** if there exists a string $w \\in \\Sigma^*$ such that $\\hat{\\delta}(q_0, w) = q$ [657]. Unreachable states can be safely deleted without changing the language of the automaton [492, 827].

#### Dead States
A **dead state** (or sink state) is a non-accepting state $q_d \\notin F$ such that for all $a \\in \\Sigma$, $\\delta(q_d, a) = q_d$ [140, 501]. 

#### Product Construction
To perform operations on two DFAs $A_1 = (Q_1, \\Sigma, \\delta_1, q_1, F_1)$ and $A_2 = (Q_2, \\Sigma, \\delta_2, q_2, F_2)$, we construct a **product automaton** [617-618]:
$$A_{prod} = (Q_1 \\times Q_2, \\Sigma, \\delta_{prod}, (q_1, q_2), F_{prod})$$ [620]
Where:
$$\\delta_{prod}((p, q), a) = (\\delta_1(p, a), \\delta_2(q, a))$$ [621]

The choosing of $F_{prod}$ determines the boolean operation [620, 648]:
- **Intersection ($L(A_1) \\cap L(A_2)$)**: $F_{prod} = F_1 \\times F_2$ [620].
- **Union ($L(A_1) \\cup L(A_2)$)**: $F_{prod} = (F_1 \\times Q_2) \\cup (Q_1 \\times F_2)$ [648].
- **Set Difference ($L(A_1) \\setminus L(A_2)$)**: $F_{prod} = F_1 \\times (Q_2 \\setminus F_2)$ [648].


## Module 2: Context-Free Grammars & Pushdown Automata

### 2.1 Context-Free Grammars (CFG) & Derivations

A Context-Free Grammar is a 4-tuple [89, 168]:
$$G = (V, T, P, S)$$ [686]

Where:
- $V$ is a finite set of **variables** (nonterminals or syntactic categories) [89, 169].
- $T$ is a finite set of **terminals** (disjoint from $V$) [89, 169].
- $P$ is a finite set of **productions**, each of the form $A \to \alpha$ where $A \in V$ and $\alpha \in (V \cup T)^*$ [170, 172].
- $S \in V$ is the distinguished **start symbol** [90, 170].

#### Derivations ($\Rightarrow$) [173]
We use productions as rewriting rules [173]:
- **One-Step Derivation**: If $A \to \beta \in P$, then $\alpha A \gamma \Rightarrow \alpha \beta \gamma$ [174, 692].
- **Zero-or-More-Steps Derivation**: $\alpha \Rightarrow^* \beta$ [174-175, 693].
- **One-or-More-Steps Derivation**: $\alpha \Rightarrow^+ \beta$ [175].

#### Derivational Order [178, 696]
- **Leftmost Derivation ($\Rightarrow_{lm}$)**: At each step, the leftmost variable in the sentential form is rewritten [178, 696].
- **Rightmost Derivation ($\Rightarrow_{rm}$)**: At each step, the rightmost variable is rewritten [178, 696].

#### Language of a Grammar [175, 700]
The language of $G$ is the set of terminal-only strings derivable from the start symbol [175, 700]:
$$L(G) = \{ w \in T^* \mid S \Rightarrow^* w \}$$ [175, 700]

---

### 2.2 Parse Trees, Ambiguity, & Conversions

#### Parse Trees [180, 707]
A parse tree is a graphical representation of a derivation that filters out the replacement order [180, 707].
- The root of the tree is labeled by the start symbol $S$ [91, 708].
- Interior nodes are labeled by variables $A \in V$ [91, 708].
- Leaves are labeled by terminals $a \in T$ or $\epsilon$ [91, 708].
- If node $A$ has children $X_1, X_2, \dots, X_k$, then $A \to X_1 X_2 \dots X_k$ must be a production in $P$ [92, 709].

#### Yield of a Parse Tree [94, 181]
The yield of a parse tree is the string formed by reading the leaves from left to right [94, 181].

#### Ambiguity [185, 755, 762]
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

#### Inherently Ambiguous Languages [763]
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

#### Instantaneous Description (ID) [791]
We define the state of the PDA at any step as a triple $(q, w, \gamma) \in Q \times \Sigma^* \times \Gamma^*$, representing the current state, the remaining unread input string, and the complete stack contents (top of stack is leftmost) [791].

A transition step is written [792]:
$$(q, aw, X\beta) \vdash_P (p, w, \alpha\beta)$$
where $(p, \alpha) \in \delta(q, a, X)$ [792].

#### Acceptance Mechanisms [796-797]
A PDA can accept languages in two equivalent ways [796-797]:
1. **Acceptance by Final State ($L(P)$)** [797]:
   $$L(P) = \{ w \in \Sigma^* \mid (q_0, w, Z_0) \vdash^* (p, \epsilon, \gamma) \text{ for some } p \in F, \gamma \in \Gamma^* \}$$ [798]
2. **Acceptance by Empty Stack ($N(P)$)** [796]:
   $$N(P) = \{ w \in \Sigma^* \mid (q_0, w, Z_0) \vdash^* (p, \epsilon, \epsilon) \text{ for any state } p \in Q \}$$ [796]

---

### 2.4 Equivalence of PDAs and CFGs

The classes of languages accepted by final state, accepted by empty stack, and generated by context-free grammars are identical [804].

#### Grammar to PDA (Empty Stack) [805]
To construct a 1-state PDA $P = (\{q\}, T, V \cup T, \delta, q, S, \emptyset)$ from a CFG $G = (V, T, P, S)$ that accepts by empty stack [805]:
1. For each variable $A \in V$, add the transition:
   $$\delta(q, \epsilon, A) = \{ (q, \beta) \mid A \to \beta \in P \}$$ [805]
2. For each terminal symbol $a \in T$, add the transition:
   $$\delta(q, a, a) = \{ (q, \epsilon) \}$$ [805]

The PDA simulates a leftmost derivation of the input string on its stack [806].

#### PDA (Empty Stack) to Grammar [808-810]
To construct an equivalent CFG $G' = (V', \Sigma, P', S')$ from a PDA $P = (Q, \Sigma, \Gamma, \delta, q_0, Z_0, \emptyset)$ accepting by empty stack, we define nonterminals of the form $[pXq]$ [808-810].
The variable $[pXq]$ generates all strings that cause the PDA to pop $X$ off the stack while transitioning from state $p$ to state $q$ [810].
1. For each state $p \in Q$, add the production:
   $$S' \to [q_0 Z_0 p]$$ [801, 811]
2. For each transition $(r, Y_1 Y_2 \dots Y_k) \in \delta(p, a, X)$, and for all possible state sequences $s_1, s_2, \dots, s_k \in Q$, add the production [891]:
   $$[pXs_k] \to a [rY_1s_1][s_1Y_2s_2]\dots[s_{k-1}Y_ks_k]$$ [891]
   If $k = 0$ (stack popped), the production is:
   $$[pX r] \to a$$

---

### 2.5 Chomsky Normal Form (CNF) & Grammatical Simplifications [211, 840, 845]

Any context-free grammar can be simplified into an equivalent grammar in **Chomsky Normal Form (CNF)** where all productions are strictly of the form [211, 845]:
$$A \to BC \quad \text{or} \quad A \to a$$
where $A, B, C \in V$ and $a \in T$ [211, 845]. To achieve this, the grammar must undergo five sequential simplification steps [838].

#### 1. Nullable Variables & $\epsilon$-Production Elimination [816]
An $\epsilon$-production is of the form $A \to \epsilon$ [816]. A variable $A$ is **nullable** if $A \Rightarrow^* \epsilon$ [817].

##### Finding Nullable Variables:
- **Basis**: If $A \to \epsilon$ is a production, then $A$ is nullable [818].
- **Inductive Step**: If there is a production $B \to C_1 C_2 \dots C_k$ where every $C_i$ is a nullable variable, then $B$ is nullable [818].

##### Elimination Algorithm:
Given CFG $G$, construct $P'$ by including all productions of $P$ with nullable variables omitted in all combinations [820-821]. If a production has a body of length $k$ containing $m$ nullable variables, it yields up to $2^m$ versions [821]. We omit versions with empty bodies and delete all $A \to \epsilon$ productions [820-821].

##### Example:
Given $S \to AB, \ A \to aAA \mid \epsilon, \ B \to bBB \mid \epsilon$ [822].
- Nullable variables: $A, B$ are directly nullable; $S$ is nullable because $S \to AB$ [822].
- New productions for $S \to AB$: Since both $A, B$ are nullable, we generate $S \to AB \mid A \mid B$ [822].
- New productions for $A \to aAA$: Since $A$ is nullable, we generate $A \to aAA \mid aA \mid a$ [823].
- New productions for $B \to bBB$: Since $B$ is nullable, we generate $B \to bBB \mid bB \mid b$ [824].
- Final simplified grammar has no $\epsilon$-productions [824].

#### 2. Unit Pairs & Unit Production Elimination [827]
A unit production is of the form $A \to B$ where $A, B \in V$ [827].

##### Finding Unit Pairs (pairs $(A, B)$ such that $A \Rightarrow^* B$ using only unit productions) [830]:
- **Basis**: $(A, A)$ is a unit pair for any variable $A$ [831].
- **Inductive Step**: If $(A, B)$ is a unit pair and $B \to C$ is a unit production, then $(A, C)$ is a unit pair [831].

##### Elimination Algorithm:
For each unit pair $(A, B)$ in $G$, if $B \to \alpha$ is a non-unit production in $P$, add the production $A \to \alpha$ to $P'$, and delete all unit productions from $P'$ [834].

##### Example:
Given $E \to E + T \mid T, \ T \to T \times F \mid F, \ F \to (E) \mid \text{id}$.
- Unit pairs: $(E, E), (T, T), (F, F)$, and inductively $(E, T), (E, F), (T, F)$ [831-832].
- For unit pair $(E, F)$, since $F \to (E)$ and $F \to \text{id}$ are non-unit, we add $E \to (E) \mid \text{id}$ to $P'$.
- For unit pair $(T, F)$, we add $T \to (E) \mid \text{id}$ to $P'$.
- Delete all unit productions, leaving only non-unit productions [834-835].

#### 3. Generating/Reachable & Useless Symbols Elimination [807]
A symbol $X \in (V \cup T)$ is **useful** if there is a derivation $S \Rightarrow^* \alpha X \beta \Rightarrow^* w$ for some $w \in T^*$ [808]. Otherwise, $X$ is useless and must be removed [808]. This requires two distinct steps: finding generating symbols and finding reachable symbols [809].
- **Generating Symbols**: $X$ is generating if $X \Rightarrow^* w$ for some $w \in T^*$ [809].
  - **Basis**: All terminals in $T$ are generating [809].
  - **Inductive Step**: If $A \to \alpha$ is a production and all symbols in $\alpha$ are generating, then $A$ is generating [818].
- **Reachable Symbols**: $X$ is reachable if $S \Rightarrow^* \alpha X \beta$ for some $\alpha, \beta \in (V \cup T)^*$ [809].
  - **Basis**: The start symbol $S$ is reachable [815].
  - **Inductive Step**: If variable $A$ is reachable and $A \to Y_1 Y_2 \dots Y_k$ is a production, then all $Y_i$ are reachable [815].

##### The Critical Order Rule:
To guarantee that *all* useless symbols are eliminated, we **MUST eliminate non-generating symbols first, and then eliminate unreachable symbols** [811].

##### Counterexample proving the order:
Consider the grammar:
$$S \to AB \mid a, \quad A \to a$$
where $B$ has no productions.
- **Applying Correct Order (Generating first, then Reachable)** [811]:
  1. *Generating*: $A$ and $a$ are generating [815]. $B$ is not generating (no productions). $S$ is generating because of $S \to a$. We delete $B$ and any production containing $B$ [811]. This removes $S \to AB$, leaving:
     $$S \to a, \quad A \to a$$
  2. *Reachable*: $S$ is reachable [815]. Since $S$ only transitions to $a$, the symbol $A$ is unreachable. We delete $A$ [812], leaving the correct, useless-free grammar:
     $$S \to a$$
- **Applying Incorrect Order (Reachable first, then Generating)** [811]:
  1. *Reachable*: Starting at $S$, we can reach $A$, $B$, and $a$. So all symbols $\{S, A, B, a\}$ are reachable. None are deleted.
  2. *Generating*: $B$ has no productions and is not generating. We delete $B$ and all productions containing $B$ ($S \to AB$ is deleted). We are left with:
     $$S \to a, \quad A \to a$$
  Notice that variable $A$ is **unreachable** from $S$, yet it remains in the grammar because reachability was checked *before* $B$ was deleted! Thus, the incorrect order fails to eliminate all useless symbols.

#### 4. Left Recursion Elimination [162]
A grammar is left-recursive if there is a variable $A$ such that $A \Rightarrow^+ A\alpha$ for some string $\alpha$ [162]. Left-recursive grammars cause top-down predictive parsers to loop infinitely [29, 162].

##### Immediate Left Recursion:
For productions of the form $A \to A\alpha_1 \mid A\alpha_2 \mid \dots \mid \beta_1 \mid \beta_2 \dots$ (where no $\beta_i$ starts with $A$) [164]:
We replace them with right-recursive productions using a new variable $A'$ [164]:
$$A \to \beta_1 A' \mid \beta_2 A' \mid \dots$$
$$A' \to \alpha_1 A' \mid \alpha_2 A' \mid \dots \mid \epsilon$$ [164]

##### General/Indirect Left Recursion (Algorithm 4.19) [165-166]:
We arrange the variables in an arbitrary order $A_1, A_2, \dots, A_n$ [166].
```text
for i = 1 to n:
    for j = 1 to i-1:
        replace each production Ai -> Aj gamma by Ai -> delta_1 gamma | delta_2 gamma | ...
        where Aj -> delta_1 | delta_2 | ... are all current Aj-productions
    eliminate immediate left recursion among Ai productions
```

##### Worked Example Trace:
Given $S \to Aa \mid b, \ A \to Ac \mid Sd \mid \epsilon$ [168]. Ordered variables: $A_1 = S, A_2 = A$ [168].
1. **$i = 1$**: No immediate left recursion for $S$.
2. **$i = 2$**: The inner loop for $j = 1$ requires substituting $S$-productions into $A \to Sd$.
   - Substitute $S \to Aa \mid b$ into $A \to Sd$ to get $A \to Aad \mid bd$ [168].
   - The set of $A$-productions is now: $A \to Ac \mid Aad \mid bd \mid \epsilon$ [169].
   - Eliminate immediate left recursion among $A$ (with $\alpha_1 = c, \alpha_2 = ad$ and $\beta_1 = bd, \beta_2 = \epsilon$) [164, 169]:
     $$A \to bd A' \mid A'$$ [169]
     $$A' \to c A' \mid ad A' \mid \epsilon$$ [169]
Final non-left-recursive grammar [169]:
$$S \to Aa \mid b, \quad A \to bdA' \mid A', \quad A' \to cA' \mid adA' \mid \epsilon$$ [169]

#### 5. Left Factoring [169]
Left factoring is a grammar transformation used to prepare a grammar for top-down parsers by deferring decision-making until enough input symbols have been read to resolve ambiguity [169].

##### Algorithm [171]:
If $A \to \alpha \beta_1 \mid \alpha \beta_2 \mid \dots \mid \gamma$ are $A$-productions with a common prefix $\alpha$ [171]:
We introduce a new variable $A'$ and replace them with [171]:
$$A \to \alpha A' \mid \gamma$$
$$A' \to \beta_1 \mid \beta_2 \mid \dots$$ [171]

##### Worked Example (The dangling-else problem) [172]:
Given $S \to i E t S \mid i E t S e S \mid a$ [172].
- Common prefix is $\alpha = i E t S$ [172].
- Applying left factoring [172]:
  $$S \to i E t S S' \mid a$$ [172]
  $$S' \to e S \mid \epsilon$$ [172]
This allows the parser to choose $S \to i E t S S'$ on reading input $i$, and defer matching the optional `else` ($e$) until the nested statement has been parsed [172].


## Module 3: Non-Regular & Non-Context-Free Languages

### 3.1 Pumping Lemma for Regular Languages

The **Pumping Lemma for Regular Languages** states that for every regular language $L$, there exists a constant $p$ (the pumping length) such that any string $z \in L$ of length $|z| \ge p$ can be split into three parts, $z = xyz$, satisfying three conditions [605]:
1. $y \neq \epsilon$ (i.e., $|y| \ge 1$) [607].
2. $|xy| \le p$ [606].
3. For all $i \ge 0$, $x y^i z \in L$ [607].

#### Proof of Non-Regularity for $L_1 = \{a^n b^n \mid n \ge 0\}$ [608]
Suppose $L_1 = \{a^n b^n \mid n \ge 0\}$ is regular [606, 647].
1. Let $p$ be the pumping length [605].
2. Choose $z = a^p b^p$. Note $|z| = 2p \ge p$.
3. By condition 2, the split $z = xyz$ must satisfy $|xy| \le p$, meaning that $y$ consists entirely of $a$'s (i.e., $y = a^k$ for some $k \ge 1$) [606].
4. According to condition 3, pumping $y$ with $i = 2$ must yield $xy^2z \in L_1$.
5. However, $xy^2z = a^{p+k} b^p$. Since $k \ge 1$, the number of $a$'s ($p+k$) is strictly greater than the number of $b$'s ($p$), violating the language constraint.
6. This contradiction proves $L_1$ is not regular [608].

---

### 3.2 Pumping Lemma for Context-Free Languages

The **Pumping Lemma for Context-Free Languages** states that for every context-free language $L$, there exists a constant $n$ such that any string $z \in L$ of length $|z| \ge n$ can be split into five parts, $z = uvwxy$, satisfying [860]:
1. $vx \neq \epsilon$ (i.e., $|vx| \ge 1$) [860].
2. $|vwx| \le n$ [860].
3. For all $i \ge 0$, $u v^i w x^i y \in L$ [860].

#### Proof of Non-Context-Freedom for $L_2 = \{a^k b^k c^k \mid k \ge 1\}$ [861]
Suppose $L_2 = \{a^k b^k c^k \mid k \ge 1\}$ is context-free [874].
1. Let $n$ be the pumping length [860-861].
2. Choose $z = a^n b^n c^n$, where $|z| \ge n$.
3. Since $|vwx| \le n$, the substring $vwx$ can span at most two distinct symbol types (either $a$'s and $b$'s, or $b$'s and $c$'s, but never all three) [860].
4. Since $|vx| \ge 1$, pumping $v$ and $x$ with $i = 2$ ($uv^2wx^2y$) increases the counts of the symbol types contained in $v$ and $x$, but leaves the count of the third symbol type unchanged.
5. This breaks the $1:1:1$ ratio, meaning $uv^2wx^2y \notin L_2$.
6. This contradiction proves $L_2$ is not context-free [861, 875].

---

### 3.3 Language Classification & Machine Equivalences [336, 1070]

We classify languages and their corresponding abstract recognizing machines into a nested hierarchy [336, 1070].

#### 1. Regular Languages (Type-3) [336]
- **Definition**: Languages accepted by DFAs, NFAs, or $\epsilon$-NFAs [476].
- **Generator**: Regular Expressions [476].

#### 2. Deterministic Context-Free Languages (DCFL) [336]
- **Definition**: Languages accepted by **Deterministic Pushdown Automata (DPDA)** by *final state* [788, 791, 803].
- **Generator**: Unambiguous Context-Free Grammars [797, 804].
- **The Prefix Property constraint for empty-stack acceptance** [793, 803]:
  A language $L$ has the **prefix property** if there are no two distinct strings $x, y \in L$ such that $x$ is a prefix of $y$ [793].
  - **Theorem**: A DPDA can accept a language $L$ by **empty stack** if and only if $L$ has the prefix property and $L = L(P)$ for some DPDA $P$ [795, 801].
  - **Example**: The language $L_{wcwr} = \{w c w^R \mid w \in \{0, 1\}^*\}$ has the prefix property because the center marker $c$ prevents any valid string from being a prefix of another [794]. It is accepted by a DPDA by empty stack [789].
  - **Counterexample**: The language $L_{wwr} = \{w w^R \mid w \in \{0, 1\}^*\}$ does *not* have the prefix property (e.g., $00 \in L_{wwr}$ is a prefix of $0000 \in L_{wwr}$). It cannot be accepted by any DPDA by empty stack [796, 802].

#### 3. Context-Free Languages (CFL) (Type-2) [336, 664]
- **Definition**: Languages accepted by nondeterministic Pushdown Automata (PDA) (by empty stack or final state) [664].
- **Generator**: Context-Free Grammars (CFGs) [663].

#### 4. Decidable / Recursive Languages [11, 962]
- **Definition**: Languages accepted by Turing Machines (TMs) that are guaranteed to halt (accept or reject) on every input [936, 962].
- **Equivalent**: Deciders or Algorithms [936, 962].

#### 5. Recursively Enumerable (RE) Languages (Type-0) [336, 935]
- **Definition**: Languages accepted by Turing Machines (where halting is only guaranteed if the string is accepted) [935, 952].
- **Equivalent**: Recognizers [954, 1024].

#### Venn Diagram of the Chomsky Hierarchy:
```text
  +-------------------------------------------------------------+
  | All Formal Languages over \Sigma                            |
  |                                                             |
  |   +-----------------------------------------------------+   |
  |   | Type-0: Recursively Enumerable (RE)                 |   |
  |   |   e.g., L_u = { <M, w> | M accepts w } [1034]       |   |
  |   |   +---------------------------------------------+   |   |
  |   |   | Decidable (Recursive)                       |   |   |
  |   |   |   e.g., H_M = { <M, w> | M halts on w } [1038]  |   |   |
  |   |   |   +-------------------------------------+   |   |   |
  |   |   |   | Type-2: Context-Free Languages (CFL)|   |   |   |
  |   |   |   |   e.g., { a^n b^n c^m d^m } [764]   |   |   |   |
  |   |   |   |   +-----------------------------+   |   |   |   |
  |   |   |   |   | DCFL                        |   |   |   |   |
  |   |   |   |   |   e.g., { w c w^R } [789]   |   |   |   |   |
  |   |   |   |   |   +---------------------+   |   |   |   |   |
  |   |   |   |   |   | Type-3: Regular     |   |   |   |   |   |
  |   |   |   |   |   |   e.g., { a^n b^m } |   |   |   |   |   |
  |   |   |   |   |   +---------------------+   |   |   |   |   |
  |   |   |   |   +-----------------------------+   |   |   |   |
  |   |   |   +-------------------------------------+   |   |   |
  |   +-----------------------------------------------------+   |
  +-------------------------------------------------------------+
```

---

### 3.4 Closure Properties Cheat Sheet [560, 864, 980]

The following matrix presents the complete closure properties of formal languages under the nine standard operations.

| Operation | Regular | DCFL | CFL | Decidable | RE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Union** | **Yes** [561] | **No** [1] | **Yes** [873] | **Yes** [980] | **Yes** [980] |
| **Intersection** | **Yes** [561] | **No** [2] | **No** [3] | **Yes** [980] | **Yes** [980] |
| **Complement** | **Yes** [561] | **Yes** [4] | **No** [5] | **Yes** [965] | **No** [6] |
| **Difference** | **Yes** [575] | **No** [7] | **No** [8] | **Yes** [9] | **No** [10] |
| **Concatenation** | **Yes** [566] | **No** [11] | **Yes** [874] | **Yes** [980] | **Yes** [980] |
| **Kleene Star** | **Yes** [566] | **No** [12] | **Yes** [874] | **Yes** [980] | **Yes** [980] |
| **Reversal** | **Yes** [578] | **No** [13] | **Yes** [875] | **Yes** [14] | **Yes** [15] |
| **Homomorphism** | **Yes** [582] | **No** [16] | **Yes** [874] | **No** [17] | **Yes** [18] |
| **Inverse Hom.** | **Yes** [588] | **Yes** [19] | **Yes** [888] | **Yes** [980] | **Yes** [980] |

#### Closure Footnotes & Proof Outlines:
- **[1] DCFL Union Counterexample**: $L_1 = \{a^n b^n c^m\}$ and $L_2 = \{a^m b^n c^n\}$ are DCFLs, but $L_1 \cup L_2$ is not a DCFL because it is inherently ambiguous [764].
- **[2] DCFL Intersection Counterexample**: $L_1 \cap L_2 = \{a^n b^n c^n\}$, which is not context-free [877].
- **[3] CFL Intersection Counterexample**: Same as DCFL [877].
- **[4] DCFL Complement Theorem**: DPDAs are closed under complementation because the state space can be expanded to track and swap accepting/rejecting configurations, taking care to avoid infinite loops on $\epsilon$-transitions [803].
- **[5] CFL Complement Counterexample**: If CFLs were closed under complement, they would be closed under intersection by DeMorgan's Law ($L_1 \cap L_2 = \overline{\bar{L}_1 \cup \bar{L}_2}$), which is false [886].
- **[6] RE Complement Counterexample**: If both $L$ and $\bar{L}$ are RE, then $L$ must be recursive [969]. Thus, the complement of an RE-but-not-recursive language (like $L_u$) is non-RE [974].
- **[7] DCFL/CFL Difference**: If closed under difference, they would be closed under complement (since $\bar{L} = \Sigma^* \setminus L$, and $\Sigma^*$ is regular/DCFL), which is false [886]. Note that the difference of a CFL and a Regular language ($L \setminus R$) **is** a CFL [885].
- **[11, 12, 13, 16] DCFL Concatenation, Star, Reversal, Homomorphism**: None of these preserve determinism because they introduce non-deterministic choice about boundary alignments (e.g., when the first word ends and the second begins).
- **[17] Decidable Homomorphism**: Decidable languages are not closed under homomorphism because any RE language is a homomorphic image of a decidable (recursive) language. If they were closed, all RE languages would be decidable, which is false [973].
- **[18] RE Homomorphism**: RE languages are closed under homomorphism. If $L$ is RE, we can simulate its TM and apply the homomorphism on-the-fly to find accepting computations [980].

---

### 3.5 Decision Properties for Regular and Context-Free Languages [329, 339, 897]

#### Regular Languages [329]:
- **Emptiness**: Solved in $O(|Q|)$ via graph reachability from the start state to any accepting state [621-622].
- **Membership**: Simulating a DFA on string $w$ executes in $O(|w|)$ time [625].
- **Equivalence**: Run the Table-Filling algorithm on the union of states of both DFAs; if their start states are equivalent, the DFAs are equivalent [637-638].

#### Context-Free Languages [339]:
- **Emptiness**: Solved in $O(|G|)$ time by computing the set of generating variables and verifying if the start symbol $S$ of $G$ is generating [906, 920].
- **Membership**: Solved in $O(n^3)$ time via the **CYK (Cocke-Younger-Kasami) Dynamic Programming Algorithm**, which fills a triangular table to determine if substring $w[i..j]$ can be derived from variable $A$ [191, 909-910].
- **Equivalence / Minimization**: **Undecidable** [914].


## Module 4: Turing Machines & Computability Theory

### 4.1 The Turing Machine (TM) Model [340, 933]

A Turing Machine (TM) is an abstract mathematical machine that models physical computers [404, 908]. Formally, a TM is a 7-tuple [933]:
$$M = (Q, \Sigma, \Gamma, \delta, q_0, B, F)$$ [933]

Where:
- $Q$ is the finite set of state controls [933].
- $\Sigma$ is the input alphabet [933].
- $\Gamma$ is the tape alphabet ($\Sigma \subset \Gamma$) [933].
- $B \in \Gamma \setminus \Sigma$ is the **blank symbol** [933].
- $q_0 \in Q$ is the start state [933].
- $F \subseteq Q$ is the set of accepting states [933].
- $\delta$ is the transition function mapping state and scanned symbol to next state, written symbol, and tape head direction [933]:
  $$\delta: Q \times \Gamma \to Q \times \Gamma \times \{L, R\}$$ [933]

```text
       Tape:   ... | B | B | X_1 | X_2 | ... | X_n | B | B | ...
                             ^
                             | (Tape Head reads and writes)
                     +-----------------+
                     |  Finite Control | ---> State q
                     +-----------------+
```

#### Instantaneous Description (ID) [340]
A TM's configuration is represented as $\alpha_1 q \alpha_2$ [340]:
- $\alpha_1 \alpha_2 \in \Gamma^*$ is the tape contents up to the last non-blank symbol [340].
- $q \in Q$ is the current state [340].
- The tape head is scanned at the first symbol of $\alpha_2$ [340].

---

### 4.2 Programming Techniques & TM Subroutines [341]

#### Storage in the State [341]
The finite control can hold data by structuring the state set as a cartesian product $Q = Q' \times \Gamma_k$, allowing the machine to remember symbols read while transitioning [341].

#### Multiple Tracks [341]
The tape alphabet can represent tuples $\Gamma = \Gamma_1 \times \Gamma_2 \times \dots$, allowing the single tape to behave as though it has multiple tracks [341].

#### Subroutines [341]
A TM subroutine is an isolated partition of states with an entry start state and a return state [341]. A "call" is executed by transitioning to the subroutine's entry state [341].

---

### 4.3 Variants & Restricted Turing Machines [341-342]

All the following variants have the **same computational power** as a standard single-tape Turing machine (they accept the class of recursively enumerable languages) [341-342]:

1. **Multitape Turing Machines**: Features $k$ separate tapes and tape heads [341]. A move is based on the vector of symbols scanned on all $k$ tapes [341].
   - *Simulation*: A single-tape TM simulates $k$ tapes by using $2k$ tracks—one track for tape contents, and one track holding a marker (like a dot) to represent the head position [341].
2. **Nondeterministic Turing Machines (NTM)**: The transition function yields multiple choices [341]:
   $$\delta: Q \times \Gamma \to \mathcal{P}(Q \times \Gamma \times \{L, R\})$$ [341]
   - *Simulation*: A deterministic TM simulates an NTM by using a queue on a second tape to perform a breadth-first search of all computational paths [341].
3. **Semi-Infinite Tape TMs**: The tape head cannot move left of the initial starting cell [342].
   - *Simulation*: Achieved by splitting the tape into two tracks representing the positive and negative directions of an infinite tape [342].

---

### 4.4 Multistack & Counter Machines [342]

#### Multistack Machines [342]
A $k$-stack machine is a deterministic PDA with $k$ separate stacks [342].
- A **2-stack machine** is Turing-complete (can simulate any TM) [342].
  - *Simulation Strategy*: Stack 1 holds the tape contents to the left of the head; Stack 2 holds the tape contents to the right of the head [342]. Moving the head corresponds to popping from one stack and pushing onto the other [342].

#### Counter Machines [342]
A counter machine is a restricted multistack machine where the stack alphabet consists of only two symbols: $Z_0$ (bottom marker) and $X$ [342]. Thus, each stack acts as a counter holding a nonnegative integer, where the machine can only increment/decrement by 1 and check for zero [342].
- **1-counter machine**: Can only accept a subset of context-free languages [342].
- **2-counter machine**: **Turing-complete** (can accept any RE language) [342].
  - *Proof Structure*: We represent the two stacks of a Turing-complete 2-stack machine as integers $i$ and $j$ in base $r$ (where $r$ is the stack alphabet size) [342]. A 3-counter machine can perform multiplication and division by $r$ to simulate stack pushes and pops [342]. We then simulate three counters $i, j, k$ with two counters by encoding their values as a single integer $m = 2^i 3^j 5^k$ [342]. Incrementing/decrementing a counter corresponds to multiplying/dividing $m$ by 2, 3, or 5 [342].

---

### 4.5 GATE-Style TM Problem Solving & Tracing Tutorial [10, 340, 934]

In competitive exams like GATE, Turing Machine questions typically require tracing execution, identifying the accepted language, or analyzing halting vs. infinite looping behavior [10, 340]. This section provides a complete tutorial on these skills.

#### 1. Instantaneous Descriptions (ID) and Tape Tracing [340]
An ID represents the exact state, head position, and tape contents [340]. The ID $X_1 \dots X_{i-1} q X_i \dots X_n$ indicates the tape contains $X_1 \dots X_n$, the state is $q$, and the head is scanning $X_i$ [340].
- **State Change & Movement**:
  - **Moving Right**: If $\delta(q, X_i) = (p, Y, R)$, then $X_1 \dots X_{i-1} q X_i X_{i+1} \dots X_n \vdash X_1 \dots X_{i-1} Y p X_{i+1} \dots X_n$ [340].
  - **Moving Left**: If $\delta(q, X_i) = (p, Y, L)$, then $X_1 \dots X_{i-1} q X_i X_{i+1} \dots X_n \vdash X_1 \dots p X_{i-1} Y X_{i+1} \dots X_n$ [340].

#### 2. Acceptance/Rejection vs. Halting/Looping [936]
- **Acceptance**: A TM accepts input $w$ if it eventually transitions into an accepting state $q_f \in F$, at which point it halts [935-936].
- **Rejection by Halting**: If the head is in state $q$ scanning $X$, and $\delta(q, X)$ is **undefined** (meaning no transition exists), and $q \notin F$, the TM halts [936]. This represents explicit rejection [936].
- **Infinite Looping**: If the TM continues to transition forever without reaching $q_f$, the input is rejected by infinite computation [10]. The TM fails to halt, representing a non-deciding recognizer [936, 960].

#### 3. Worked Example: TM for $L = \{0^n 1^n \mid n \ge 1\}$ [934]
We design and trace a TM $M_1$ that matches each 0 with a corresponding 1 [934].

##### Formal 7-tuple Specification [933]:
$$M_1 = (Q, \Sigma, \Gamma, \delta, q_0, B, F)$$
- $Q = \{q_0, q_1, q_2, q_3, q_4\}$
- $\Sigma = \{0, 1\}$
- $\Gamma = \{0, 1, X, Y, B\}$
- $F = \{q_4\}$ (state $q_4$ is accepting)

##### Transition Table $\delta(q, s)$ [934]:
| State $q$ | Input symbol $0$ | Input symbol $1$ | Symbol $X$ | Symbol $Y$ | Blank symbol $B$ |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **$q_0$** | $(q_1, X, R)$ | — | — | $(q_3, Y, R)$ | — |
| **$q_1$** | $(q_1, 0, R)$ | $(q_2, Y, L)$ | — | $(q_1, Y, R)$ | — |
| **$q_2$** | $(q_2, 0, L)$ | — | $(q_0, X, R)$ | $(q_2, Y, L)$ | — |
| **$q_3$** | — | — | — | $(q_3, Y, R)$ | $(q_4, B, R)$ |
| **$q_4$** | — | — | — | — | — |

*Note: "—" indicates the transition is undefined, causing the machine to halt and reject [936].*

##### Trace Case A: Acceptance of $0011$
We represent the transition steps using IDs [340]:
1. Start state scanning leftmost 0:
   $$q_0 0011$$
2. Replace leftmost 0 with $X$, move right, transition to $q_1$:
   $$X q_1 011$$
3. Scan right over 0 to find a 1 (remain in $q_1$):
   $$X0 q_1 11$$
4. Match leftmost 1: replace 1 with $Y$, move left, transition to $q_2$:
   $$X q_2 0Y1$$
5. Scan left over 0 to find the last-written $X$ (remain in $q_2$):
   $$q_2 X0Y1$$
6. Found $X$: move right, transition back to $q_0$ to look for the next 0:
   $$X q_0 0Y1$$
7. Found 0: replace with $X$, move right, transition to $q_1$:
   $$XX q_1 Y1$$
8. Scan right over $Y$ (remain in $q_1$):
   $$XXY q_1 1$$
9. Match 1: replace 1 with $Y$, move left, transition to $q_2$:
   $$XX q_2 YY$$
10. Scan left over $Y$ (remain in $q_2$):
    $$X q_2 XYY$$
11. Found $X$: move right, transition to $q_0$:
    $$XX q_0 YY$$
12. Scanning $Y$ in $q_0$: no more 0s left! Transition to $q_3$ to verify only $Y$s remain:
    $$XXY q_3 Y$$
13. Scan right over $Y$ (remain in $q_3$):
    $$XXYY q_3 B$$
14. Scanned Blank ($B$): the tape consists strictly of $XXYY$. Transition to accepting state $q_4$ and halt:
    $$XXYYB q_4 B$$ (Accepted!)

##### Trace Case B: Rejection by Halting on $010$
1. Start configuration:
   $$q_0 010$$
2. Match first 0 with $X$:
   $$X q_1 10$$
3. Match first 1 with $Y$, move left:
   $$q_2 X Y0$$
4. Found $X$: move right, transition to $q_0$:
   $$X q_0 Y0$$
5. Scanning $Y$ in $q_0$: transition to $q_3$ (verify only $Y$s and blanks remain):
   $$XY q_3 0$$
6. In state $q_3$, the head scans symbol `0`. Looking at the transition table, $\delta(q_3, 0)$ is **undefined** ("—") [934].
7. The machine halts immediately. Since $q_3 \notin F$, the input string $010$ is **rejected** [936].

##### Trace Case C: Simulating an Infinite Loop (Boundary Error)
Suppose we make a programming error in our TM: we forget to include state $q_2$'s transition on $X$ ($\delta(q_2, X) = (q_0, X, R)$), and instead incorrectly set it to loop left: $\delta(q_2, X) = (q_2, X, L)$.
1. Look at the transition sequence starting on $0011$:
   $$\dots \vdash q_2 X0Y1$$
2. Scanned $X$: according to the incorrect transition, the head writes $X$, moves left, and remains in $q_2$:
   $$q_2 B X0Y1$$
3. Now the head scans the blank $B$ on the left. Since $\delta(q_2, B)$ is undefined, the machine halts.
4. What if we incorrectly defined $\delta(q_2, B) = (q_2, B, R)$ and $\delta(q_2, X) = (q_2, X, L)$? The head would move left to $B$, transition to move right to $X$, move left to $B$, moving back and forth on the left boundary:
   $$\dots \vdash q_2 B X0Y1 \vdash B q_2 X0Y1 \vdash q_2 B X0Y1 \vdash B q_2 X0Y1 \dots$$
The tape configurations repeat infinitely, never reaching the accepting state $q_4$. This represents an **infinite loop**, rejecting the input by non-halting [10, 936].


## Module 5: Decidability, Undecidability & Complexity

### 5.1 Decidability & Recursive/RE Languages [11, 960, 962]

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

#### Complement Closure Theorem [1025]
- **Theorem 1**: If a language $L$ is recursive (decidable), then its complement $\bar{L}$ is also recursive [1025-1026].
  - *Proof*: Run the decider $M$ for $L$. Swap its halting "accept" and "reject" configurations [1028-1029].
- **Theorem 2**: If both $L$ and $\bar{L}$ are recursively enumerable (RE), then $L$ is recursive [1030].
  - *Proof*: Run the recognizer $M_1$ for $L$ and $M_2$ for $\bar{L}$ in parallel (alternating steps) on a 2-tape TM [1030-1031]. Since $w$ must be in either $L$ or $\bar{L}$, one of the two machines is guaranteed to halt [1031]. If $M_1$ halts, accept; if $M_2$ halts, reject [1031].

---

### 5.2 Diagonalization & The Undecidable Language $L_d$ [1018]

To prove that undecidable problems exist, we use Georg Cantor's **diagonalization proof technique** [1018].

#### Enumeration of Turing Machines [1019]
We can encode any TM as a unique binary string [1019]. We can order all binary strings by length and lexicographically: $w_1, w_2, w_3, \dots$ [1018]. Thus, we can list all possible Turing machines: $M_1, M_2, M_3, \dots$ [1018].

#### The Diagonalization Language ($L_d$) [1020]
We define $L_d$ as the set of strings $w_i$ such that the $i$-th TM $M_i$ does *not* accept its own binary representation $w_i$ [1020]:
$$L_d = \{ w_i \mid w_i \notin L(M_i) \}$$ [1020]

#### Proof that $L_d$ is not RE [1020]
Suppose $L_d$ is RE. Then there must exist some TM in our ordered list, say $M_k$, that accepts $L_d$ ($L(M_k) = L_d$) [1020].
1. Ask the membership question: Is $w_k \in L_d$?
2. **Case 1**: Assume $w_k \in L_d$. By definition of $L_d$, $w_k \notin L(M_k)$. But since $L(M_k) = L_d$, this implies $w_k \notin L_d$, a contradiction.
3. **Case 2**: Assume $w_k \notin L_d$. By definition of $L(M_k)$, this means $w_k \notin L(M_k)$. By definition of $L_d$, this implies $w_k \in L_d$, a contradiction.
4. Since $M_k$ can neither accept nor reject $w_k$ consistently, our assumption that $L_d$ is recognized by *any* TM is false. $L_d$ is **not recursively enumerable (non-RE)** [1021].

---

### 5.3 The Universal Language $L_u$ & The Halting Problem [1034]

#### The Universal Language ($L_u$) [1034]
The universal language consists of all encoded pairs $\langle M, w \rangle$ where $M$ is a TM and $w$ is an input string accepted by $M$ [1034]:
$$L_u = \{ \langle M, w \rangle \mid w \in L(M) \}$$ [1034]

- **Theorem**: $L_u$ is recursively enumerable (RE) but **undecidable** [1025].
  - *RE Proof*: We construct a **Universal Turing Machine ($U$)** that simulates $M$ on input $w$ [1034-1035]. If $M$ accepts $w$, $U$ accepts $\langle M, w \rangle$ [1037].
  - *Undecidability Proof (by contradiction)*: Suppose $L_u$ is decidable by a halting decider $H$. We construct a new decider $D$ that takes a TM code $x$ as input:
    - $D$ runs $H$ on the pair $\langle x, x \rangle$.
    - If $H$ accepts $\langle x, x \rangle$ (meaning $x$ accepts its own code), then $D$ rejects.
    - If $H$ rejects $\langle x, x \rangle$ (meaning $x$ does not accept its own code), then $D$ accepts.
    - This decider $D$ is equivalent to a decider for $\bar{L}_d$. But since $L(D) = L_d$, this means $L_d$ is decidable, which contradicts our proof that $L_d$ is non-RE. Thus, $L_u$ must be undecidable.

#### The Halting Problem ($H_M$) [1038]
The halting problem is the set of all pairs $\langle M, w \rangle$ such that $M$ eventually halts on input $w$ (either by accepting or rejecting) [1038]:
$$H_M = \{ \langle M, w \rangle \mid M \text{ halts on } w \}$$ [1038]
The Halting Problem is **RE but undecidable** [1038-1039].

---

### 5.4 Undecidable Problems about Turing Machines & Rice's Theorem [1037]

We can prove other problems undecidable by using **reductions** [1037]. A reduction from $P_1$ to $P_2$ is an algorithm that maps instances of $P_1$ to instances of $P_2$ such that [914, 1043]:
$$w \in P_1 \iff f(w) \in P_2$$ [916, 1044]
If $P_1$ is undecidable, then $P_2$ must also be undecidable [1044].

#### Rice's Theorem [9, 1071]
**Rice's Theorem** states that **any nontrivial semantic property** of the languages accepted by Turing machines is undecidable [9, 1071].
- A property $\mathcal{P}$ is a set of RE languages [1050].
- $\mathcal{P}$ is **nontrivial** if it is neither empty (some RE languages have it) nor contains all RE languages (some RE languages do not have it) [1051].
- A property is **semantic** if it depends only on the *language accepted* by the TM, not on the TM's internal structure or code [1050]. That is, if $L(M_1) = L(M_2)$, then $M_1 \in \mathcal{P} \iff M_2 \in \mathcal{P}$.

#### Proof of Rice's Theorem [1051]
Let $\mathcal{P}$ be a nontrivial semantic property. Assume the empty language $\emptyset \notin \mathcal{P}$ (if $\emptyset \in \mathcal{P}$, we can simply work with the complement property $\bar{\mathcal{P}}$) [1051]. Since $\mathcal{P}$ is nontrivial, there exists some RE language $L \in \mathcal{P}$ accepted by TM $M_L$ [1051].

We reduce the undecidable Universal Language $L_u$ to $L_{\mathcal{P}}$ (the set of TMs whose language is in $\mathcal{P}$) [1051]. Given an instance $\langle M, w \rangle$ of $L_u$, we construct a new TM $M'$ that takes an input string $x$ [1048, 1051]:
1. $M'$ first simulates $M$ on input $w$ (ignoring $x$) [1048, 1051].
2. If $M$ accepts $w$, $M'$ then simulates $M_L$ on $x$, accepting if $M_L$ accepts [1051].

Now analyze the language of the constructed machine $M'$ [1051]:
- **Case 1**: If $M$ accepts $w$, then $M'$ will simulate $M_L$ on all inputs $x$. Thus, $L(M') = L(M_L) = L$. Since $L \in \mathcal{P}$, the code for $M'$ is in $L_{\mathcal{P}}$ [1051].
- **Case 2**: If $M$ does not accept $w$, then $M'$ will never progress to simulating $M_L$. Thus, $L(M') = \emptyset$. Since $\emptyset \notin \mathcal{P}$, the code for $M'$ is not in $L_{\mathcal{P}}$ [1051].

Therefore:\n$$\langle M, w \rangle \in L_u \iff M' \in L_{\mathcal{P}}$$\nSince $L_u$ is undecidable, deciding whether $L(M') \in \mathcal{P}$ is undecidable [1051].

---

### 5.5 Post's Correspondence Problem (PCP) [1055]

**Post's Correspondence Problem (PCP)** is an undecidable problem involving string matching [1055].

An instance of PCP consists of two lists of strings of equal length over an alphabet $\Sigma$ [1062]:
- List $A = w_1, w_2, \dots, w_k$ [1062]
- List $B = x_1, x_2, \dots, x_k$ [1062]

A **solution** to PCP is a sequence of indices $i_1, i_2, \dots, i_m$ ($m \ge 1$) such that the concatenation of strings from List $A$ matches the concatenation from List $B$ [1063]:
$$w_{i_1} w_{i_2} \dots w_{i_m} = x_{i_1} x_{i_2} \dots x_{i_m}$$ [1063]

#### Modified PCP (MPCP) [1056]
In Modified PCP, the solution sequence is forced to start with index 1 ($i_1 = 1$) [1056].
- **Theorem**: MPCP can be reduced to PCP, and the halting problem can be reduced to MPCP, proving **both PCP and MPCP are undecidable** [1055-1056].

#### Application: Undecidable Problems of CFGs [397, 1073]
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

### 5.6 Complexity Theory Foundations ($P$, $NP$, and $PS$) [1076, 1119]

We classify decidable languages based on their consumption of computational resources (time and space) [1076, 1119]:

#### Class $P$ (Polynomial Time) [1088]
$$P = \bigcup_{k \ge 1} \text{TIME}(n^k)$$
The class of languages accepted by a deterministic Turing machine in worst-case time $O(n^k)$ [1088]. This corresponds to computationally tractable problems [1076, 1088].

#### Class $NP$ (Nondeterministic Polynomial Time) [1088]
$$NP = \bigcup_{k \ge 1} \text{NTIME}(n^k)$$
The class of languages accepted by a nondeterministic Turing machine where the execution tree along any valid branch has depth at most $O(n^k)$ [1088]. Alternatively, it is the class of languages whose solutions can be verified deterministically in polynomial time.
- **The $P$ vs. $NP$ Question**: We know $P \subseteq NP$, but we do not know if $P = NP$.

#### NP-Completeness [1077]
A language $L$ is **NP-complete** if [1077]:
1. $L \in NP$ [1077].
2. For every language $L' \in $ NP, $L'$ is polynomial-time reducible to $L$ ($L' \le_p L$) [1077].

The foundational NP-complete problem is the **Satisfiability Problem (SAT)** (proven by Cook's Theorem) [398, 1090].

#### Class $PS$ (Polynomial Space) [1095, 1119]
The class of languages accepted by a deterministic Turing machine using at most $O(n^k)$ tape cells [1095, 1119].
- **Savitch's Theorem**: Nondeterminism does not increase the power of space complexity classes. If a language is accepted by an NTM using $f(n)$ space, it can be accepted by a DTM using $f^2(n)$ space [1095, 1120]. Thus:
  $$\text{PS} = \text{NPS}$$ [1097, 1120]
- The known relationships among these classes are [1122]:
  $$P \subseteq NP \subseteq PS$$ [1098]


