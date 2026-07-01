const fs = require('fs');
const os = require('os');
const path = require('path');
const { compareDirectories } = require('./check-public-sync');

describe('check-public-sync', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-sync-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports html files that differ between generated output and public', () => {
    const generatedDir = path.join(tempDir, 'generated');
    const publicDir = path.join(tempDir, 'public');

    fs.mkdirSync(generatedDir, { recursive: true });
    fs.mkdirSync(publicDir, { recursive: true });

    fs.writeFileSync(path.join(generatedDir, 'index.html'), '<h1>from source</h1>');
    fs.writeFileSync(path.join(publicDir, 'index.html'), '<h1>edited manually</h1>');

    const result = compareDirectories({ generatedDir, publicDir });

    expect(result.drift).toEqual(['index.html']);
    expect(result.missing).toEqual([]);
  });

  it('reports html files that are missing from public', () => {
    const generatedDir = path.join(tempDir, 'generated');
    const publicDir = path.join(tempDir, 'public');

    fs.mkdirSync(generatedDir, { recursive: true });
    fs.mkdirSync(publicDir, { recursive: true });

    fs.writeFileSync(path.join(generatedDir, 'gallery.html'), '<h1>gallery</h1>');

    const result = compareDirectories({ generatedDir, publicDir });

    expect(result.drift).toEqual([]);
    expect(result.missing).toEqual(['gallery.html']);
  });
});
