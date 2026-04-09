/**
 * Basic UE .uasset binary parser.
 * Extracts name table, import table, and export table to reconstruct the object tree.
 */
const fs = require('fs');

const PACKAGE_FILE_TAG = 0x9E2A83C1;

class BufferReader {
  constructor(buffer) {
    this.buf = buffer;
    this.pos = 0;
  }
  readInt32() {
    const v = this.buf.readInt32LE(this.pos);
    this.pos += 4;
    return v;
  }
  readUInt32() {
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v;
  }
  readInt64() {
    const v = this.buf.readBigInt64LE(this.pos);
    this.pos += 8;
    return Number(v);
  }
  readGuid() {
    const g = this.buf.slice(this.pos, this.pos + 16);
    this.pos += 16;
    return g.toString('hex');
  }
  readFString() {
    const len = this.readInt32();
    if (len === 0) return '';
    if (len > 0) {
      const str = this.buf.toString('utf8', this.pos, this.pos + len - 1);
      this.pos += len;
      return str;
    }
    // Negative = UTF-16LE, count is number of characters
    const charCount = -len;
    const str = this.buf.toString('utf16le', this.pos, this.pos + charCount * 2 - 2);
    this.pos += charCount * 2;
    return str;
  }
  skip(n) { this.pos += n; }
  seek(pos) { this.pos = pos; }
}

/**
 * Parse the FPackageFileSummary header.
 */
function parseHeader(r) {
  const h = {};
  h.tag = r.readUInt32();
  if (h.tag !== PACKAGE_FILE_TAG) throw new Error('Not a valid .uasset file');

  h.legacyFileVersion = r.readInt32();
  h.legacyUE3Version = r.readInt32();
  h.fileVersionUE4 = r.readInt32();

  if (h.legacyFileVersion <= -8) {
    h.fileVersionUE5 = r.readInt32();
  } else {
    h.fileVersionUE5 = 0;
  }

  h.fileVersionLicenseeUE = r.readInt32();

  // Custom versions
  const customVersionCount = r.readInt32();
  h.customVersions = [];
  for (let i = 0; i < customVersionCount; i++) {
    const guid = r.readGuid();
    const version = r.readInt32();
    h.customVersions.push({ guid, version });
  }

  h.totalHeaderSize = r.readInt32();
  h.folderName = r.readFString();
  h.packageFlags = r.readUInt32();

  h.nameCount = r.readInt32();
  h.nameOffset = r.readInt32();

  // UE5 soft object paths (conditional)
  if (h.fileVersionUE5 >= 1002) {
    h.softObjectPathsCount = r.readInt32();
    h.softObjectPathsOffset = r.readInt32();
  }

  // Localization ID
  if (h.fileVersionUE4 >= 516) {
    h.localizationId = r.readFString();
  }

  h.gatherableTextDataCount = r.readInt32();
  h.gatherableTextDataOffset = r.readInt32();

  h.exportCount = r.readInt32();
  h.exportOffset = r.readInt32();

  h.importCount = r.readInt32();
  h.importOffset = r.readInt32();

  h.dependsOffset = r.readInt32();

  if (h.fileVersionUE4 >= 384) {
    h.softPackageReferencesCount = r.readInt32();
    h.softPackageReferencesOffset = r.readInt32();
  }

  if (h.fileVersionUE4 >= 510) {
    h.searchableNamesOffset = r.readInt32();
  }

  h.thumbnailTableOffset = r.readInt32();

  h.guid = r.readGuid();

  // Persistent GUID (UE5)
  if (h.fileVersionUE5 >= 1003) {
    h.persistentGuid = r.readGuid();
  }

  // Generations
  const genCount = r.readInt32();
  h.generations = [];
  if (genCount > 0 && genCount < 100) {
    for (let i = 0; i < genCount; i++) {
      h.generations.push({
        exportCount: r.readInt32(),
        nameCount: r.readInt32()
      });
    }
  }

  return h;
}

/**
 * Parse the name table.
 */
function parseNameTable(r, header) {
  r.seek(header.nameOffset);
  const names = [];
  for (let i = 0; i < header.nameCount; i++) {
    const name = r.readFString();
    // UE4 has NonCasePreservingHash (uint16) + CasePreservingHash (uint16)
    if (header.fileVersionUE5 > 0) {
      r.skip(4); // hash
    } else {
      r.skip(4); // two uint16 hashes
    }
    names.push(name);
  }
  return names;
}

/**
 * Resolve a name from the name table, handling numbered instances.
 */
function resolveName(names, nameIndex, number) {
  const base = names[nameIndex] || `Unknown_${nameIndex}`;
  if (number > 0) return `${base}_${number - 1}`;
  return base;
}

/**
 * Parse the import table using fixed-size entries.
 * Layout per entry (40 bytes for UE5): FName ClassPackage(8), FName ClassName(8),
 * int32 OuterIndex(4), FName ObjectName(8), extra(12)
 */
function parseImportTable(r, header, names) {
  const buf = r.buf;
  const base = header.importOffset;
  const tableEnd = header.exportOffset;
  const entrySize = header.importCount > 0 ? Math.floor((tableEnd - base) / header.importCount) : 28;

  const imports = [];
  for (let i = 0; i < header.importCount; i++) {
    const off = base + i * entrySize;
    const classPackageIdx = buf.readInt32LE(off);
    const classPackageNum = buf.readInt32LE(off + 4);
    const classNameIdx = buf.readInt32LE(off + 8);
    const classNameNum = buf.readInt32LE(off + 12);
    const outerIndex = buf.readInt32LE(off + 16);
    const objectNameIdx = buf.readInt32LE(off + 20);
    const objectNameNum = buf.readInt32LE(off + 24);

    imports.push({
      index: -(i + 1),
      classPackage: resolveName(names, classPackageIdx, classPackageNum),
      className: resolveName(names, classNameIdx, classNameNum),
      outerIndex,
      objectName: resolveName(names, objectNameIdx, objectNameNum)
    });
  }
  return imports;
}

/**
 * Parse the export table using fixed-size entries.
 * Layout: ClassIndex(4), SuperIndex(4), TemplateIndex(4), OuterIndex(4),
 * FName ObjectName(8), ObjectFlags(4), SerialSize(8), SerialOffset(8), ...
 */
function parseExportTable(r, header, names) {
  const buf = r.buf;
  const base = header.exportOffset;
  const tableEnd = header.dependsOffset;
  const entrySize = header.exportCount > 0 ? Math.floor((tableEnd - base) / header.exportCount) : 100;

  const exports = [];
  for (let i = 0; i < header.exportCount; i++) {
    const off = base + i * entrySize;
    const classIndex = buf.readInt32LE(off);       // +0
    const superIndex = buf.readInt32LE(off + 4);    // +4
    // +8: TemplateIndex (skipped)
    const outerIndex = buf.readInt32LE(off + 12);   // +12
    const objectNameIndex = buf.readInt32LE(off + 16);  // +16
    const objectNameNumber = buf.readInt32LE(off + 20); // +20

    let serialSize = 0, serialOffset = 0;
    try {
      serialSize = Number(buf.readBigInt64LE(off + 28));
      serialOffset = Number(buf.readBigInt64LE(off + 36));
    } catch { /* fallback: leave as 0 */ }

    exports.push({
      index: i + 1,
      classIndex,
      superIndex,
      outerIndex,
      objectName: resolveName(names, objectNameIndex, objectNameNumber),
      serialSize,
      serialOffset
    });
  }
  return exports;
}

/**
 * Get class name for an export by resolving its classIndex.
 * Negative → import reference, Positive → export reference, Zero → Class.
 */
function getClassName(exp, imports, exports) {
  if (exp.classIndex < 0) {
    const impIdx = -exp.classIndex - 1;
    if (impIdx < imports.length) return imports[impIdx].objectName;
  }
  if (exp.classIndex > 0 && exports) {
    const ref = exports.find(e => e.index === exp.classIndex);
    if (ref) return ref.objectName;
  }
  if (exp.classIndex > 0) return `Export_${exp.classIndex}`;
  return 'Class';
}

/**
 * Detect if an export references another blueprint via its class import.
 * Returns the /Game/ package path or null.
 */
function findBlueprintRef(exp, imports) {
  if (exp.classIndex >= 0) return null;
  const impIdx = -exp.classIndex - 1;
  if (impIdx >= imports.length) return null;
  const classImport = imports[impIdx];

  // Only user blueprint classes, not engine classes
  if (classImport.className !== 'WidgetBlueprintGeneratedClass' &&
      classImport.className !== 'BlueprintGeneratedClass') return null;

  // Find the Package import via outerIndex
  if (classImport.outerIndex >= 0) return null;
  const outerImpIdx = -classImport.outerIndex - 1;
  if (outerImpIdx >= imports.length) return null;
  const pkgImport = imports[outerImpIdx];

  if (!pkgImport.objectName.startsWith('/Game/')) return null;
  return pkgImport.objectName;
}

/**
 * Build a node tree from exports.
 */
function buildNodeTree(exports, imports, names, buf) {
  const nodes = exports.map(exp => {
    const node = {
      id: exp.index,
      name: exp.objectName,
      className: getClassName(exp, imports, exports),
      outerIndex: exp.outerIndex,
      serialSize: exp.serialSize,
      children: []
    };
    const bpRef = findBlueprintRef(exp, imports);
    if (bpRef) node.blueprintRef = bpRef;

    // Scan serialized data for resource references (textures, materials, etc.)
    if (buf) {
      const resRefs = scanExportForImportRefs(buf, exp, imports, [
        'Texture2D', 'MaterialInstanceDynamic', 'MaterialInterface', 'Material', 'Font', 'SoundWave'
      ]);
      if (resRefs.length > 0) {
        node.resourceRefs = resRefs;
      }
    }

    return node;
  });

  const nodeMap = new Map();
  for (const n of nodes) nodeMap.set(n.id, n);

  const roots = [];
  for (const n of nodes) {
    if (n.outerIndex > 0 && nodeMap.has(n.outerIndex)) {
      nodeMap.get(n.outerIndex).children.push(n);
    } else {
      roots.push(n);
    }
  }

  return roots;
}

/**
 * Scan an export's serialized data for references to specific import classes.
 * Uses byte-level scan for int32 import indices (handles UE5 alignment variations).
 * @param {Buffer} buf - Full file buffer
 * @param {Object} exp - Export with serialOffset and serialSize
 * @param {Array} imports - Import table entries
 * @param {Array} targetClasses - Import classNames to look for (e.g. ['Texture2D', 'MaterialInstanceDynamic'])
 * @returns {Array} Array of { importIndex, name, class, packagePath }
 */
function scanExportForImportRefs(buf, exp, imports, targetClasses) {
  const refs = [];
  if (!exp.serialOffset || !exp.serialSize || exp.serialSize < 4) return refs;

  // Build lookup: import index → info, filtered to target classes
  const targetImports = new Map();
  for (const imp of imports) {
    if (!targetClasses.includes(imp.className)) continue;
    let pkgPath = '';
    if (imp.outerIndex < 0) {
      const outerIdx = -imp.outerIndex - 1;
      if (outerIdx < imports.length) {
        pkgPath = imports[outerIdx].objectName;
      }
    }
    targetImports.set(imp.index, { name: imp.objectName, class: imp.className, packagePath: pkgPath });
  }

  if (targetImports.size === 0) return refs;

  const end = Math.min(exp.serialOffset + exp.serialSize - 3, buf.length - 3);
  const seen = new Set();
  for (let i = exp.serialOffset; i < end; i++) {
    const v = buf.readInt32LE(i);
    if (targetImports.has(v) && !seen.has(v)) {
      seen.add(v);
      const info = targetImports.get(v);
      refs.push({ importIndex: v, ...info });
    }
  }
  return refs;
}

/**
 * Main parse function.
 */
function parseUAsset(filePath) {
  const data = fs.readFileSync(filePath);
  const r = new BufferReader(data);

  let header;
  try {
    header = parseHeader(r);
  } catch (e) {
    return { error: `Header parse failed: ${e.message}`, fallback: extractStrings(data) };
  }

  let nameTable;
  try {
    nameTable = parseNameTable(r, header);
  } catch (e) {
    return { error: `Name table parse failed: ${e.message}`, fallback: extractStrings(data) };
  }

  let imports = [];
  try {
    imports = parseImportTable(r, header, nameTable);
  } catch (e) {
    // non-fatal: continue without imports
  }

  let exports = [];
  try {
    exports = parseExportTable(r, header, nameTable);
  } catch (e) {
    // non-fatal: we still have the name table
  }

  const tree = buildNodeTree(exports, imports, nameTable, data);

  // Extract cross-blueprint references from imports
  const blueprintRefs = [];
  for (const imp of imports) {
    if (imp.className === 'WidgetBlueprintGeneratedClass' || imp.className === 'BlueprintGeneratedClass') {
      // Find the Package import via outerIndex
      if (imp.outerIndex < 0) {
        const outerIdx = -imp.outerIndex - 1;
        if (outerIdx < imports.length) {
          const pkg = imports[outerIdx];
          if (pkg.objectName.startsWith('/Game/')) {
            blueprintRefs.push({
              className: imp.objectName,
              packagePath: pkg.objectName
            });
          }
        }
      }
    }
  }

  return {
    fileName: require('path').basename(filePath),
    packageName: header.folderName || '',
    nameCount: header.nameCount,
    importCount: header.importCount,
    exportCount: header.exportCount,
    fileVersionUE4: header.fileVersionUE4,
    fileVersionUE5: header.fileVersionUE5,
    names: nameTable,
    imports: imports.map(imp => ({
      index: imp.index,
      className: imp.className,
      objectName: imp.objectName,
      classPackage: imp.classPackage
    })),
    exports: exports.map(exp => ({
      index: exp.index,
      objectName: exp.objectName,
      className: getClassName(exp, imports, exports),
      outerIndex: exp.outerIndex,
      serialSize: exp.serialSize
    })),
    tree,
    blueprintRefs
  };
}

/**
 * Fallback: extract readable strings from binary.
 */
function extractStrings(buffer) {
  const strings = [];
  let current = '';
  for (let i = 0; i < buffer.length; i++) {
    const b = buffer[i];
    if (b >= 32 && b < 127) {
      current += String.fromCharCode(b);
    } else {
      if (current.length >= 3) strings.push(current);
      current = '';
    }
  }
  if (current.length >= 3) strings.push(current);
  // Filter to likely UMG-related strings
  const umgKeywords = /Widget|Panel|Canvas|Button|Text|Image|Border|Box|Overlay|Wrap|Scroll|Grid|Slot|Spacer|Throbber|Progress|Slider|Check|Combo|Edit|Rich|List|Tile|Tree|Uniform|Size|Scale|Anchor|Alignment|Padding|Margin/i;
  return strings.filter(s => umgKeywords.test(s)).slice(0, 200);
}

module.exports = { parseUAsset };
