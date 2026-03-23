const fs = require('fs');
const path = '../frontend/src/app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// The inputs use border-focus. Since `--accent` is white, we might need to adjust form-inputs to fit styling
css = css.replace(/\.form-input\s*\{[^\}]*\}/g, `.form-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color var(--transition), box-shadow var(--transition);
  outline: none;
}`);

css = css.replace(/\.form-input:focus\s*\{[^\}]*\}/g, `.form-input:focus {
  border-color: rgba(255,255,255,0.5);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.05);
}`);

// Logo icon
css = css.replace(/\.logo-icon\s*\{[^\}]*\}/g, `.logo-icon {
  width: 28px; height: 28px;
  background: #fff;
  color: #000;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}`);

fs.writeFileSync(path, css);
console.log("auth css inputs fixed");
