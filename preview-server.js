const http = require('http');
const fs = require('fs');
const path = require('path');

// Local preview: serves the files in this folder at http://127.0.0.1:5177
// Usage: node preview-server.js   (then open the printed address; Ctrl+C to stop)
const root = __dirname;
const port = 5177;

http.createServer((req, res) => {
  const requested = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'buckshot-roulette-tracker.html';
  const filePath = path.resolve(root, requested);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.readFile(filePath, (err, body) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
    res.end(body);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}`);
});
