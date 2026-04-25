#!/usr/bin/env node
// Electron treats ELECTRON_RUN_AS_NODE=<any value, even ""> as truthy and runs
// as plain Node, which breaks `require('electron')` in the main process.
// This wrapper deletes the var entirely before spawning electron-vite/electron.
import { spawn } from 'node:child_process';

delete process.env.ELECTRON_RUN_AS_NODE;

const [, , cmd, ...args] = process.argv;
const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 1));
