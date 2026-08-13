// src/components/layout/WorkspaceHub.tsx
import React from "react";
import { useMachineStore, isPristineTab } from "@/store/machineStore";
import { useFileActions } from "@/hooks/useFileActions";
import "./WorkspaceHub.css";

const cards = [
  {
    title: "Finite Automata & PDA Simulator",
    description: "The infinite canvas. Design and simulate NFAs, DFAs, and Pushdown Automata.",
    hash: "#/machine",
    type: "DFA",
    enabled: true,
    number: "1",
  },
  {
    title: "Grammar Laboratory",
    description: "Write context-free grammars, compute FIRST/FOLLOW sets, and convert to CNF.",
    hash: "#/grammar",
    type: "CFG",
    enabled: true,
    number: "2",
  },
  {
    title: "Parser Studio",
    description: "Debugger-style multi-pane view. Trace LL/LR parsing matrices and syntax trees.",
    hash: "#/parser",
    type: "CFG_PARSER",
    enabled: true,
    number: "3",
  },
  {
    title: "Open File",
    description: "Import AutomataLab JSON or JFLAP (.jff) files to continue your work.",
    hash: "open",
    type: null,
    enabled: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
        <path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3"/>
      </svg>
    ),
  },
];

export default function WorkspaceHub() {
  const { machine, addTab } = useMachineStore();
  const { handleOpen } = useFileActions();

  const handleCardClick = (e: React.MouseEvent, card: typeof cards[0]) => {
    e.preventDefault();
    if (!card.enabled) return;

    if (card.hash === 'open') {
      handleOpen();
      return;
    }

    if (card.hash === '#/machine') {
      const isMachine = machine && ['DFA', 'NFA', 'ENFA', 'PDA', 'DPDA', 'NPDA', 'TM', 'LBA'].includes(machine.type);
      if (!isMachine) {
        addTab('DFA');
      }
    } else if (card.hash === '#/grammar') {
      const isGrammar = machine && ['CFG', 'CSG'].includes(machine.type);
      if (!isGrammar) {
        addTab('CFG');
      }
    } else if (card.hash === '#/parser') {
      const isParser = machine && machine.type === 'CFG_PARSER';
      if (!isParser) {
        addTab('CFG_PARSER');
      }
    }

    window.location.hash = card.hash;
  };

  return (
    <div className="workspace-hub-container">
      <section className="workspace-hub">
        <header className="hub-header">
          <div className="hub-logo">
            <svg width="64" height="64" viewBox="12 12 76 76" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#00E5FF" />
                  <stop offset="100%" stop-color="#7B2CBF" />
                </linearGradient>
              </defs>
              <g transform="translate(3, 0)">
                <circle cx="55" cy="50" r="16" fill="none" stroke="url(#logo-grad)" stroke-width="2" />
                <circle cx="55" cy="50" r="26" fill="none" stroke="url(#logo-grad)" stroke-width="5" />
                <path d="M 14 36 L 28 50 L 14 64" fill="none" stroke="url(#logo-grad)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
              </g>
            </svg>
          </div>
          <div className="hub-title-group">
            <h1 className="hub-title">AutomataLab</h1>
            <p className="hub-subtitle">The Educational Compiler & Automata Workbench</p>
          </div>
        </header>
        
        <div className="hub-cards">
          {cards.map((c, i) => (
            <a
              key={i}
              href={c.enabled && c.hash !== 'open' ? c.hash : undefined}
              onClick={(e) => handleCardClick(e, c)}
              className={`hub-card ${c.enabled ? "" : "disabled"}`}
            >
              <div className="hub-card-left">
                {c.number ? <span className="hub-card-number">{c.number}</span> : c.icon}
              </div>
              <div className="hub-card-content">
                <h2>{c.title}</h2>
                <p>{c.description}</p>
                {!c.enabled && <span className="badge">Coming soon</span>}
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
