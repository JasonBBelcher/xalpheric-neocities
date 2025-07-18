
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import fetch from 'node-fetch';
import FormData from 'form-data';

const notesDir = './thoughts-and-musings';
const outputDir = './public/musings';

fs.readdirSync(notesDir).forEach(file => {
  if (file.endsWith('.md')) {
    const markdown = fs.readFileSync(path.join(notesDir, file), 'utf8');
    const html = marked.parse(markdown);
    const outputFile = file.replace('.md', '.html');
    fs.writeFileSync(path.join(outputDir, outputFile), html);
  }
});

// Upload to Neocities
const form = new FormData();
fs.readdirSync(outputDir).forEach(file => {
  const filePath = path.join(outputDir, file);
  const relPath = path.relative(outputDir, filePath);
  form.append('file', fs.createReadStream(filePath), relPath);
});

const res = await fetch('https://neocities.org/api/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.NEOCITIES_API_KEY}`
  },
  body: form
});

console.log(await res.text());
