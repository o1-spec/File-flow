const fs = require('fs');
const path = '../frontend/src/app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// Updating colors
css = css.replace(/--bg:\s*#0d0f14;/g, '--bg:          #0a0a0a;');
css = css.replace(/--bg-card:\s*#13161e;/g, '--bg-card:     #111111;');
css = css.replace(/--bg-elevated:\s*#1a1d28;/g, '--bg-elevated: #1a1a1a;');
css = css.replace(/--border:\s*rgba\(255,255,255,0\.07\);/g, '--border:      rgba(255,255,255,0.1);');
css = css.replace(/--border-focus:rgba\(99,102,241,0\.7\);/g, '--border-focus:rgba(255,255,255,0.4);');
css = css.replace(/--text-primary:\s*#f0f2f8;/g, '--text-primary:   #ffffff;');
css = css.replace(/--text-secondary:\s*#8b90a7;/g, '--text-secondary: #a1a1aa;');
css = css.replace(/--text-muted:\s*#4e5469;/g, '--text-muted:     #71717a;');
css = css.replace(/--accent:\s*#6366f1; \/\* indigo-500 \*\//g, '--accent:       #ffffff;');
css = css.replace(/--accent-light:\s*#818cf8; \/\* indigo-400 \*\//g, '--accent-light: #e4e4e7;');
css = css.replace(/--accent-glow:\s*rgba\(99,102,241,0\.18\);/g, '--accent-glow:  rgba(255,255,255,0.05);');
css = css.replace(/--radius: 12px;/g, '--radius: 8px;');
css = css.replace(/--radius-sm: 8px;/g, '--radius-sm: 6px;');

fs.writeFileSync(path, css);
console.log('globals tokens updated');
