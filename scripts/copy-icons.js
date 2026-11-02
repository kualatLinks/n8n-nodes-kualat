'use strict';

const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', 'nodes', 'Kualat', 'kualat.svg');
const target = path.join(__dirname, '..', 'dist', 'nodes', 'Kualat', 'kualat.svg');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);

console.log('Copied node icon to dist/nodes/Kualat/kualat.svg');
