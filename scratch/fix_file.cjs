const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', 'utf8');

// The replacement was:
// color: t === '$' ? 'var(--blue-400)' : 'var(--text-primary)',
// But due to $', it became: color: t === '[REST OF FILE]' ? 'var(--blue-400)' : 'var(--text-primary)',

// Let's find the prefix up to the replacement start
const searchStr = "color: t === '";
const idx = code.indexOf(searchStr);
if (idx !== -1) {
  const prefix = code.substring(0, idx);
  // The original text after this point was:
  // color: t === '$' ? '#60a5fa' : '#c9d1d9',
  
  // After this replacement, there were a few more replacements made!
  // I should just restore the original file from git if possible.
  // Wait, I can just reconstruct the file by running `git checkout src/components/workspaces/parser/ParseTablePanel.tsx` in git bash? No, it's not a git repo.
  
  // The rest of the file was appended. Let's find the end of the appended part.
  // The appended part ends with: `' ? 'var(--blue-400)' : 'var(--text-primary)',`
  const endMarker = "\\' ? 'var(--blue-400)' : 'var(--text-primary)',"; // Wait, in the string it's just ' ? '...
  // Let's just find the first ` ? 'var(--blue-400)' : 'var(--text-primary)',`
  const suffixIdx = code.indexOf(" ? 'var(--blue-400)' : 'var(--text-primary)',", idx);
  
  if (suffixIdx !== -1) {
    const originalRest = code.substring(idx + searchStr.length, suffixIdx);
    // originalRest contains the REST OF THE ORIGINAL FILE!
    // But it has subsequent replacements applied to it.
    
    // We can reconstruct the file:
    // prefix + "color: t === '$' ? 'var(--blue-400)' : 'var(--text-primary)',\n" + (the part of originalRest that comes AFTER the line)
    // Wait, originalRest is exactly the text that came AFTER `color: t === '$' ? '#60a5fa' : '#c9d1d9',` in the original file (but with subsequent replacements applied).
    // So the full reconstructed file is:
    // prefix + "color: t === '$' ? 'var(--blue-400)' : 'var(--text-primary)'," + originalRest;
    
    const reconstructed = prefix + "color: t === '$' ? 'var(--blue-400)' : 'var(--text-primary)'," + originalRest;
    fs.writeFileSync('src/components/workspaces/parser/ParseTablePanel.tsx.fixed', reconstructed);
    console.log("Fixed successfully. Length:", reconstructed.length);
  } else {
    console.log("Suffix not found");
  }
} else {
  console.log("Search string not found");
}
