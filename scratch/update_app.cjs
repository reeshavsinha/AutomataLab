const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
code = code.replace(/import \{ UnsavedChangesGuard \} from '@\/components\/UnsavedChangesGuard';/, 
"import { UnsavedChangesGuard } from '@/components/UnsavedChangesGuard';\nimport { ErrorBoundary } from '@/components/layout/ErrorBoundary';");

// Wrap content
code = code.replace(/content = <MachineWorkspace isDemoMode=\{true\} \/>;/, 'content = <ErrorBoundary fallbackName="Demo Workspace"><MachineWorkspace isDemoMode={true} /></ErrorBoundary>;');
code = code.replace(/content = <MachineWorkspace \/>;/, 'content = <ErrorBoundary fallbackName="Machine Workspace"><MachineWorkspace /></ErrorBoundary>;');
code = code.replace(/content = <GrammarWorkspace \/>;/, 'content = <ErrorBoundary fallbackName="Grammar Workspace"><GrammarWorkspace /></ErrorBoundary>;');
code = code.replace(/content = <RegexWorkspace \/>;/, 'content = <ErrorBoundary fallbackName="Regex Workspace"><RegexWorkspace /></ErrorBoundary>;');
code = code.replace(/content = <ParserWorkspace \/>;/, 'content = <ErrorBoundary fallbackName="Parser Workspace"><ParserWorkspace /></ErrorBoundary>;');

fs.writeFileSync('src/App.tsx', code);
