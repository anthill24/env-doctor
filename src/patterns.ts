/**
 * Built-in source patterns for detecting environment-variable references.
 *
 * Each entry is a regular-expression source string with exactly one capture
 * group that yields the variable NAME. Users can add their own patterns (for
 * other languages or access styles) via `.envdoctorrc.json`.
 */
export const DEFAULT_PATTERNS: readonly string[] = [
  // dot access: process.env.<NAME>
  'process\\.env\\.([A-Za-z_][A-Za-z0-9_]*)',
  // bracket access: process.env['<NAME>'] / ["<NAME>"] / [`<NAME>`]
  'process\\.env\\[\\s*[\'"`]([A-Za-z_][A-Za-z0-9_]*)[\'"`]\\s*\\]',
  // Vite/client dot access: import.meta.env.<NAME>
  'import\\.meta\\.env\\.([A-Za-z_][A-Za-z0-9_]*)',
  // Vite/client bracket access: import.meta.env['<NAME>'] / etc.
  'import\\.meta\\.env\\[\\s*[\'"`]([A-Za-z_][A-Za-z0-9_]*)[\'"`]\\s*\\]',
];
