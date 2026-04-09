// Modifier Flags — mirrors POB Global.lua ModFlag bitmasks
const ModFlag = {
  Attack:    0x00000001,
  Spell:     0x00000002,
  Hit:       0x00000004,
  Dot:       0x00000008,
  Cast:      0x00000010,
  Melee:     0x00000100,
  Area:      0x00000200,
  Projectile:0x00000400,
  SourceProjectile: 0x00000800,
  Ailment:   0x00001000,
  MeleeHit:  0x00002000,
  Weapon:    0x00010000,
  Weapon1H:  0x00020000,
  Weapon2H:  0x00040000,
  WeaponMelee: 0x00080000,
  WeaponRanged: 0x00100000,
  Axe:       0x00200000,
  Bow:       0x00400000,
  Claw:      0x00800000,
  Dagger:    0x01000000,
  Mace:      0x02000000,
  Staff:     0x04000000,
  Sword:     0x08000000,
  Wand:      0x10000000,
};

// Keyword Flags — mirrors POB KeywordFlag
const KeywordFlag = {
  Aura:      0x00000001,
  Curse:     0x00000002,
  Warcry:    0x00000004,
  Movement:  0x00000008,
  Physical:  0x00000010,
  Fire:      0x00000020,
  Cold:      0x00000040,
  Lightning: 0x00000080,
  Chaos:     0x00000100,
  Vaal:      0x00000200,
  Bow:       0x00000400,
  Arrow:     0x00000800,
  Trap:      0x00001000,
  Mine:      0x00002000,
  Totem:     0x00004000,
  Minion:    0x00008000,
  Attack:    0x00010000,
  Spell:     0x00020000,
  Hit:       0x00040000,
  Ailment:   0x00080000,
  Brand:     0x00100000,
  Poison:    0x00200000,
  Bleed:     0x00400000,
  Ignite:    0x00800000,
  PhysicalDot: 0x01000000,
  LightningDot: 0x02000000,
  ColdDot:   0x04000000,
  FireDot:   0x08000000,
  ChaosDot:  0x10000000,
  MatchAll:  0x40000000,
};

// Modifier types
const ModType = {
  BASE: 'BASE',
  INC: 'INC',
  MORE: 'MORE',
  FLAG: 'FLAG',
  OVERRIDE: 'OVERRIDE',
  LIST: 'LIST',
};

// Damage types
const DamageType = {
  Physical: 'Physical',
  Fire: 'Fire',
  Cold: 'Cold',
  Lightning: 'Lightning',
  Chaos: 'Chaos',
};

// Item slots
const ItemSlot = {
  MainHand: 'Weapon 1',
  OffHand: 'Weapon 2',
  Head: 'Helmet',
  Body: 'Body Armour',
  Gloves: 'Gloves',
  Boots: 'Boots',
  Amulet: 'Amulet',
  Ring1: 'Ring 1',
  Ring2: 'Ring 2',
  Belt: 'Belt',
  Flask1: 'Flask 1',
  Flask2: 'Flask 2',
  Flask3: 'Flask 3',
  Flask4: 'Flask 4',
  Flask5: 'Flask 5',
};

// Color codes for display (HTML-safe)
const RarityColor = {
  NORMAL: '#C8C8C8',
  MAGIC: '#8888FF',
  RARE: '#FFFF77',
  UNIQUE: '#AF6025',
  RELIC: '#60C060',
  GEM: '#1AA29B',
  CURRENCY: '#AA9E82',
};

// Base class stats per class
const ClassBases = {
  Scion:     { str: 20, dex: 20, int: 20 },
  Marauder:  { str: 32, dex: 14, int: 14 },
  Ranger:    { str: 14, dex: 32, int: 14 },
  Witch:     { str: 14, dex: 14, int: 32 },
  Duelist:   { str: 23, dex: 23, int: 14 },
  Templar:   { str: 23, dex: 14, int: 23 },
  Shadow:    { str: 14, dex: 23, int: 23 },
};

module.exports = {
  ModFlag, KeywordFlag, ModType, DamageType,
  ItemSlot, RarityColor, ClassBases,
};
