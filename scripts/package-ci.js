const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const output = 'artifacts';
const backendOutput = join(output, 'backend');
const frontendOutput = join(output, 'frontend');

if (!existsSync(join('frontend', 'dist'))) {
  throw new Error('frontend/dist does not exist. Run the frontend build first.');
}

rmSync(output, { recursive: true, force: true });
mkdirSync(backendOutput, { recursive: true });

for (const source of ['index.js', 'package.json', 'package-lock.json', 'src', 'public']) {
  cpSync(source, join(backendOutput, source), { recursive: true });
}

cpSync(join('frontend', 'dist'), frontendOutput, { recursive: true });
console.log(`CI artifacts created in ${output}/.`);
