// ModDB — Modifier Database (mirrors POB Classes/ModDB.lua)
// Hash-map based storage: mods indexed by name for fast lookup.

const { ModType } = require('../data/constants');

class ModDB {
  constructor(parent = null) {
    this.mods = {};        // { modName: [mod, mod, ...] }
    this.parent = parent;  // parent ModDB for hierarchical lookup
    this.conditions = {};  // { conditionName: bool }
    this.multipliers = {}; // { multiplierName: number }
  }

  addMod(mod) {
    if (!mod || !mod.name) return;
    if (!this.mods[mod.name]) {
      this.mods[mod.name] = [];
    }
    this.mods[mod.name].push(mod);
  }

  addList(modList) {
    if (!modList) return;
    for (const mod of modList) {
      this.addMod(mod);
    }
  }

  addDB(otherDB) {
    if (!otherDB) return;
    for (const name of Object.keys(otherDB.mods)) {
      for (const mod of otherDB.mods[name]) {
        this.addMod(mod);
      }
    }
  }

  removeMod(modToRemove) {
    const list = this.mods[modToRemove.name];
    if (!list) return;
    const idx = list.indexOf(modToRemove);
    if (idx >= 0) list.splice(idx, 1);
    if (list.length === 0) delete this.mods[modToRemove.name];
  }

  setCondition(name, value) {
    this.conditions[name] = value;
  }

  getCondition(name) {
    if (name in this.conditions) return this.conditions[name];
    if (this.parent) return this.parent.getCondition(name);
    return false;
  }

  setMultiplier(name, value) {
    this.multipliers[name] = value;
  }

  getMultiplier(name) {
    let val = this.multipliers[name] || 0;
    if (this.parent) val += this.parent.getMultiplier(name);
    return val;
  }

  // Collect all mods matching the given names (varargs), respecting flags
  _collectMods(modNames, cfg) {
    const result = [];
    const flags = cfg?.flags || 0;
    const keywordFlags = cfg?.keywordFlags || 0;
    const source = cfg?.source || null;

    for (const name of modNames) {
      const list = this.mods[name];
      if (list) {
        for (const mod of list) {
          if (this._matchMod(mod, flags, keywordFlags, source)) {
            result.push(mod);
          }
        }
      }
    }
    if (this.parent) {
      result.push(...this.parent._collectMods(modNames, cfg));
    }
    return result;
  }

  _matchMod(mod, flags, keywordFlags, source) {
    // Flag matching: if mod has flags, require intersection
    if (mod.flags && flags) {
      if ((mod.flags & flags) === 0) return false;
    }
    // Keyword flag matching
    if (mod.keywordFlags && keywordFlags) {
      if ((mod.keywordFlags & keywordFlags) === 0) return false;
    }
    // Source filtering
    if (source && mod.source && mod.source !== source) return false;
    return true;
  }

  /**
   * Sum all BASE modifiers for the given mod names.
   * Returns total base value.
   */
  sumBase(cfg, ...modNames) {
    const mods = this._collectMods(modNames, cfg);
    let total = 0;
    for (const mod of mods) {
      if (mod.type === ModType.BASE) {
        total += this._resolveValue(mod);
      }
    }
    return total;
  }

  /**
   * Sum all INC (increased) modifiers for the given mod names.
   * Returns total % increase (additive).
   */
  sumInc(cfg, ...modNames) {
    const mods = this._collectMods(modNames, cfg);
    let total = 0;
    for (const mod of mods) {
      if (mod.type === ModType.INC) {
        total += this._resolveValue(mod);
      }
    }
    return total;
  }

  /**
   * Calculate the multiplicative product of all MORE modifiers.
   * Each MORE mod is (1 + value/100), multiplied together.
   * Returns the final multiplier (e.g., 1.5 for 50% more).
   */
  productMore(cfg, ...modNames) {
    const mods = this._collectMods(modNames, cfg);
    let product = 1;
    for (const mod of mods) {
      if (mod.type === ModType.MORE) {
        product *= (1 + this._resolveValue(mod) / 100);
      }
    }
    return product;
  }

  /**
   * Check if any FLAG modifier exists for the given mod names.
   */
  flag(cfg, ...modNames) {
    const mods = this._collectMods(modNames, cfg);
    for (const mod of mods) {
      if (mod.type === ModType.FLAG && this._resolveValue(mod)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get OVERRIDE value if any exists, otherwise return undefined.
   */
  override(cfg, ...modNames) {
    const mods = this._collectMods(modNames, cfg);
    for (const mod of mods) {
      if (mod.type === ModType.OVERRIDE) {
        return this._resolveValue(mod);
      }
    }
    return undefined;
  }

  /**
   * Collect all LIST values for the given mod names.
   */
  list(cfg, ...modNames) {
    const mods = this._collectMods(modNames, cfg);
    const result = [];
    for (const mod of mods) {
      if (mod.type === ModType.LIST) {
        result.push(this._resolveValue(mod));
      }
    }
    return result;
  }

  /**
   * Calculate final stat value: base * (1 + inc/100) * more
   */
  calcStat(cfg, ...modNames) {
    const base = this.sumBase(cfg, ...modNames);
    const inc = this.sumInc(cfg, ...modNames);
    const more = this.productMore(cfg, ...modNames);
    return base * (1 + inc / 100) * more;
  }

  _resolveValue(mod) {
    if (typeof mod.value === 'function') {
      return mod.value(this);
    }
    return mod.value;
  }

  hasMod(modType, ...modNames) {
    for (const name of modNames) {
      const list = this.mods[name];
      if (list) {
        for (const mod of list) {
          if (!modType || mod.type === modType) return true;
        }
      }
    }
    if (this.parent) return this.parent.hasMod(modType, ...modNames);
    return false;
  }

  clear() {
    this.mods = {};
    this.conditions = {};
    this.multipliers = {};
  }

  /** Debug: list all mod names */
  listModNames() {
    const names = new Set(Object.keys(this.mods));
    if (this.parent) {
      for (const n of this.parent.listModNames()) names.add(n);
    }
    return [...names];
  }
}

module.exports = ModDB;
