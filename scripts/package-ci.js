const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const output = 'artifacts';
const backendOutput = join(output, 'backend');
const frontendOutput = join(output, 'frontend');

for (const directory of ['dist', join('frontend', 'dist')]) {
  if (!existsSync(directory)) {
    throw new Error(`${directory} does not exist. Run the corresponding build first.`);
  }
}

rmSync(output, { recursive: true, force: true });
mkdirSync(backendOutput, { recursive: true });

// El backend se compila con TypeScript. La salida ejecutable es dist/index.js;
// index.js y src/ ya no existen en una compilación limpia.
for (const source of ['dist', 'package.json', 'package-lock.json', 'public']) {
  cpSync(source, join(backendOutput, source), { recursive: true });
}

cpSync(join('frontend', 'dist'), frontendOutput, { recursive: true });
console.log(`CI artifacts created in ${output}/.`);
