/**
 * Recursively scan a directory for .uasset files and return a tree structure.
 */
const fs = require('fs');
const path = require('path');

function scanDirectory(rootDir) {
  const tree = { name: path.basename(rootDir), path: rootDir, children: [], isDir: true };
  buildTree(rootDir, tree);
  return tree;
}

function buildTree(dirPath, node) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch { return; }

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const child = { name: entry.name, path: fullPath, children: [], isDir: true };
      buildTree(fullPath, child);
      if (child.children.length > 0) node.children.push(child);
    } else if (entry.name.endsWith('.uasset')) {
      node.children.push({ name: entry.name, path: fullPath, isDir: false });
    }
  }
}

module.exports = { scanDirectory };
