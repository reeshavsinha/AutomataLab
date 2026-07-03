const fs = require('fs');

// Fix App.tsx imports
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/import UnsavedChangesGuard from '@\/components\/layout\/UnsavedChangesGuard'/, "import UnsavedChangesGuard from '@/components/layout/UnsavedChangesGuard'\nimport { ErrorBoundary } from '@/components/layout/ErrorBoundary'");
fs.writeFileSync('src/App.tsx', appCode);

// Fix ErrorBoundary.tsx
let ebCode = fs.readFileSync('src/components/layout/ErrorBoundary.tsx', 'utf8');
ebCode = ebCode.replace(/import \{ Button \} from '@\/components\/ui\/button';/, '');
ebCode = ebCode.replace(/<Button/g, '<button');
ebCode = ebCode.replace(/<\/Button>/g, '</button>');
ebCode = ebCode.replace(/className=\"bg-blue-600 hover:bg-blue-700 text-white\"/g, 'className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"');
ebCode = ebCode.replace(/className=\"bg-gray-700 hover:bg-gray-600 text-white\"/g, 'className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"');
fs.writeFileSync('src/components/layout/ErrorBoundary.tsx', ebCode);

// Fix builder.ts
let bCode = fs.readFileSync('src/engines/parser/builder.ts', 'utf8');
bCode = bCode.replace(/catch \(e\) \{/, 'catch (e: any) {');
fs.writeFileSync('src/engines/parser/builder.ts', bCode);
