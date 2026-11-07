import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const children = [];
let stopping = false;
function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill('SIGTERM');
    process.exitCode = code;
}
for (const [args, directory] of [
    [['--env-file=.env', '--watch', 'server.js'], 'backend/'],
    [['node_modules/vite/bin/vite.js', ...process.argv.slice(2)], 'frontend/']
]) {
    const child = spawn(process.execPath, args, { cwd: fileURLToPath(new URL(directory, root)), stdio: 'inherit' });
    children.push(child);
    child.on('error', error => { console.error(error.message); stop(1); });
    child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
