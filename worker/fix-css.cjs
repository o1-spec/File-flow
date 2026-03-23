const fs = require('fs');
const path = '../frontend/src/app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// fix topbar background
css = css.replace(/background:\s*rgba\(13,15,20,0\.85\);/g, 'background: rgba(10,10,10,0.85);');

// fix .btn-primary text color
css = css.replace(/\.btn-primary\s*\{\s*background:\s*var\(--accent\);\s*color:\s*#fff;/g, '.btn-primary {\n  background: var(--accent);\n  color: #000;');

// fix brand icon color
css = css.replace(/\.topbar-brand \.brand-icon\s*\{\s*width: 30px; height: 30px;\s*background: var\(--accent\);/g, '.topbar-brand .brand-icon {\n  width: 30px; height: 30px;\n  background: var(--accent);\n  color: #000;');

// Also active step circle from accent to black text
css = css.replace(/\.step\.active \.step-circle\s*\{[^\}]*\}/g, '.step.active .step-circle  { border-color: var(--text-primary); color: #000; background: var(--text-primary); }');
css = css.replace(/\.step\.active \.step-label\s*\{[^\}]*\}/g, '.step.active .step-label   { color: var(--text-primary); }');


// Replace accent glow logic if anything looks off
fs.writeFileSync(path, css);
console.log('css fixed');
