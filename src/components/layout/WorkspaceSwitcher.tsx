import { useEffect, useState } from 'react';
import { useMachineStore } from '@/store/machineStore';

export default function WorkspaceSwitcher() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === '#/' || route === '') {
    return null; // Don't show in the hub
  }

  const navigateTo = (newRoute: string) => {
    // Attempt to select a relevant tab if switching to a new workspace type
    const state = useMachineStore.getState();
    
    // First, find if any tab matches the required type for the target workspace
    let targetType = '';
    if (newRoute.startsWith('#/machine')) targetType = 'DFA'; // DFA, NFA, eNFA, PDA, TM
    if (newRoute.startsWith('#/grammar')) targetType = 'CFG';
    if (newRoute.startsWith('#/parser')) targetType = 'CFG_PARSER';
    if (newRoute.startsWith('#/regex')) targetType = 'REG';

    // To be perfectly robust, we can just switch the route.
    // The App.tsx 'Anti-Trap' will handle tab switching or creation if necessary!
    window.location.hash = newRoute;
  };

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 ml-4 bg-[#111] rounded border border-gray-800">
      <button 
        onClick={() => navigateTo('#/machine')}
        className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${route.startsWith('#/machine') ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
      >
        Automata
      </button>
      <button 
        onClick={() => navigateTo('#/grammar')}
        className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${route.startsWith('#/grammar') ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
      >
        Grammar
      </button>
      <button 
        onClick={() => navigateTo('#/parser')}
        className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${route.startsWith('#/parser') ? 'bg-green-600/20 text-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
      >
        Parser
      </button>
      <button 
        onClick={() => navigateTo('#/regex')}
        className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${route.startsWith('#/regex') ? 'bg-orange-600/20 text-orange-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
      >
        Regex
      </button>
    </div>
  );
}
