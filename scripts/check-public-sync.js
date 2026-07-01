const fs = require('fs');
const path = require('path');

function collectHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function compareDirectories({ generatedDir, publicDir }) {
  const generatedFiles = collectHtmlFiles(generatedDir);
  const publicFiles = collectHtmlFiles(publicDir);

  const generatedRelative = generatedFiles.map((file) => path.relative(generatedDir, file));
  const publicRelative = publicFiles.map((file) => path.relative(publicDir, file));

  const missing = generatedRelative.filter((file) => !publicRelative.includes(file));
  const drift = generatedRelative.filter((file) => {
    const publicPath = path.join(publicDir, file);
    const generatedPath = path.join(generatedDir, file);

    if (!fs.existsSync(publicPath)) return false;
    return fs.readFileSync(generatedPath, 'utf8') !== fs.readFileSync(publicPath, 'utf8');
  });

  return { missing, drift };
}

module.exports = { compareDirectories, collectHtmlFiles };
