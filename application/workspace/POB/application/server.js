// Path of Building — Node.js Clone
// Port 3225

const express = require('express');
const path = require('path');

const buildRoutes = require('./src/routes/build');
const calcRoutes = require('./src/routes/calc');
const sessionRoutes = require('./src/routes/session');

const app = express();
const PORT = 3225;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/build', buildRoutes);
app.use('/api/calc', calcRoutes);
app.use('/api/session', sessionRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    name: 'pob-nodejs',
    version: '1.0.0',
    status: 'running',
    features: [
      'build-import',
      'build-decode',
      'mod-system',
      'calc-defence',
      'calc-offence'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[POB-Node] Server running on http://127.0.0.1:${PORT}`);
});
