const fs = require('node:fs');
const path = require('node:path');

const outputDirectory = path.resolve(__dirname, '../dist-web');
const webEntry = path.join(outputDirectory, 'index-web.html');
const workerEntry = path.join(outputDirectory, 'index.html');

if (!fs.existsSync(webEntry)) {
  throw new Error(`Web build entry was not found: ${webEntry}`);
}

fs.copyFileSync(webEntry, workerEntry);
