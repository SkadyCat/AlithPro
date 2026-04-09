// ── POE Mod Text → Chinese Translation ─────────────────────────
// Ordered regex rules: first match wins.
// Each rule: [regex, replacer(match) → string]

const _ELE = { Physical:'物理', Fire:'火焰', Cold:'冰霜', Lightning:'闪电', Chaos:'混沌', Elemental:'元素' };
const _ATTR = { Strength:'力量', Dexterity:'敏捷', Intelligence:'智慧' };
const _elZh = s => _ELE[s] || s;
const _atZh = s => _ATTR[s] || s;

const _rules = [
  // ── Metadata / base stats ──
  [/^Quality:\s*\+?(\d+)%/, (m)=>`品质: +${m[1]}%`],
  [/^Energy Shield:\s*(\d+)/, (m)=>`能量护盾: ${m[1]}`],
  [/^Evasion:\s*(\d+)/, (m)=>`闪避值: ${m[1]}`],
  [/^Armour:\s*(\d+)/, (m)=>`护甲: ${m[1]}`],
  [/^EvasionBasePercentile:/, ()=>null],
  [/^EnergyShieldBasePercentile:/, ()=>null],
  [/^ArmourBasePercentile:/, ()=>null],
  [/^Radius:\s*(.+)/, (m)=>{
    const r = {Small:'小',Medium:'中',Large:'大',Variable:'可变'}; return `半径: ${r[m[1]]||m[1]}`;
  }],
  [/^Historic$/, ()=>'历史性'],
  [/^Corrupted$/, ()=>'已腐化'],
  [/^Passage$/, ()=>'通途'],

  // ── Adds flat damage ──
  [/^Adds?\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage\s+to\s+Attacks/i,
    (m)=>`攻击附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],
  [/^Adds?\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage\s+to\s+Spells/i,
    (m)=>`法术附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],
  [/^Adds?\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage\s+with\s+Bow\s+Attacks/i,
    (m)=>`弓攻击附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],
  [/^Adds?\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage$/i,
    (m)=>`附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],
  [/^Adds?\s+(\d+)\s+to\s+(\d+)\s+Added\s+(Fire|Cold|Lightning)\s+Damage\s+with\s+Bow\s+Attacks/i,
    (m)=>`弓攻击附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],
  [/^(\d+)\s+to\s+(\d+)\s+Added\s+(Fire|Cold|Lightning|Chaos|Physical)\s+Damage\s+with\s+Bow\s+Attacks/i,
    (m)=>`弓攻击附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],
  [/^Adds?\s+(\d+)\s+to\s+(\d+)\s+(Lightning)\s+Damage\s+for\s+each\s+Shocked\s+Enemy/i,
    (m)=>`每个近期击杀的感电敌人附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],
  [/^Adds?\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage$/i,
    (m)=>`附加 ${m[1]} 到 ${m[2]} ${_elZh(m[3])}伤害`],

  // ── % increased / reduced — Attack Speed ──
  [/^(\d+)%\s+increased\s+Attack\s+Speed\s+with\s+Bows/i, (m)=>`${m[1]}% 弓攻击速度提高`],
  [/^(\d+)%\s+increased\s+Attack\s+Speed\s+while\s+holding\s+a\s+Shield/i, (m)=>`${m[1]}% 持盾时攻击速度提高`],
  [/^(\d+)%\s+increased\s+Attack\s+Speed$/i, (m)=>`${m[1]}% 攻击速度提高`],
  [/^(\d+)%\s+increased\s+Melee\s+Critical\s+Strike\s+Chance/i, (m)=>`${m[1]}% 近战暴击率提高`],

  // ── Critical Strike ──
  [/^\+?(\d+(?:\.\d+)?)%\s+to\s+Critical\s+Strike\s+Chance\s+while\s+affected\s+by\s+(.+)/i,
    (m)=>`受${_buffZh(m[2])}影响时 +${m[1]}% 暴击率`],
  [/^\+?(\d+)%\s+to\s+Global\s+Critical\s+Strike\s+Multiplier/i, (m)=>`+${m[1]}% 全局暴击伤害加成`],
  [/^\+?(\d+)%\s+to\s+Critical\s+Strike\s+Multiplier\s+with\s+Lightning\s+Skills/i, (m)=>`+${m[1]}% 闪电技能暴击伤害加成`],
  [/^\+?(\d+)%\s+to\s+Critical\s+Strike\s+Multiplier\s+with\s+Bows/i, (m)=>`+${m[1]}% 弓暴击伤害加成`],
  [/^\+?(\d+)%\s+to\s+Critical\s+Strike\s+Multiplier\s+for\s+Attack\s+Damage/i, (m)=>`+${m[1]}% 攻击暴击伤害加成`],
  [/^\+?(\d+)%\s+to\s+Critical\s+Strike\s+Multiplier/i, (m)=>`+${m[1]}% 暴击伤害加成`],
  [/^(\d+)%\s+increased\s+Critical\s+Strike\s+Chance$/i, (m)=>`${m[1]}% 暴击率提高`],

  // ── Movement Speed ──
  [/^(\d+)%\s+increased\s+Movement\s+Speed\s+if\s+you\s+haven't\s+been\s+Hit\s+Recently/i,
    (m)=>`近期未被击中时 ${m[1]}% 移动速度提高`],
  [/^(\d+)%\s+increased\s+Movement\s+Speed$/i, (m)=>`${m[1]}% 移动速度提高`],

  // ── Increased Damage (specific) ──
  [/^(\d+)%\s+increased\s+Physical\s+Damage$/i, (m)=>`${m[1]}% 物理伤害提高`],
  [/^(\d+)%\s+increased\s+Elemental\s+Damage\s+with\s+Attack\s+Skills/i, (m)=>`${m[1]}% 攻击技能元素伤害提高`],
  [/^(\d+)%\s+increased\s+Projectile\s+Damage$/i, (m)=>`${m[1]}% 投射物伤害提高`],
  [/^(\d+)%\s+increased\s+Spell\s+Damage$/i, (m)=>`${m[1]}% 法术伤害提高`],
  [/^(\d+)%\s+increased\s+Damage\s+with\s+Bow\s+Skills/i, (m)=>`${m[1]}% 弓技能伤害提高`],
  [/^(\d+)%\s+increased\s+Damage\s+with\s+Hits\s+against\s+Chilled\s+Enemies/i, (m)=>`${m[1]}% 对冰缓敌人的击中伤害提高`],
  [/^(\d+)%\s+increased\s+Attack\s+Damage\s+while\s+affected\s+by\s+Precision/i, (m)=>`${m[1]}% 受精准影响时攻击伤害提高`],
  [/^(\d+)%\s+increased\s+Physical\s+Damage\s+with\s+Attack\s+Skills/i, (m)=>`${m[1]}% 攻击技能物理伤害提高`],
  [/^(\d+)%\s+increased\s+Damage$/i, (m)=>`${m[1]}% 伤害提高`],
  [/^(\d+)%\s+increased\s+(Fire|Cold|Lightning|Chaos)\s+Damage$/i, (m)=>`${m[1]}% ${_elZh(m[2])}伤害提高`],
  [/^(\d+)%\s+increased\s+Damage\s+Over\s+Time\s+with\s+Bow\s+Skills/i, (m)=>`${m[1]}% 弓技能持续伤害提高`],

  // ── More / Less ──
  [/^(\d+)%\s+more\s+(.+Damage)/i, (m)=>`${m[1]}% 额外${_damageTypeZh(m[2])}`],
  [/^(\d+)%\s+less\s+(.+Damage)/i, (m)=>`${m[1]}% 较少${_damageTypeZh(m[2])}`],

  // ── % increased generic stats ──
  [/^(\d+)%\s+increased\s+Evasion\s+and\s+Energy\s+Shield$/i, (m)=>`${m[1]}% 闪避与能量护盾提高`],
  [/^(\d+)%\s+increased\s+Evasion\s+Rating\s+during\s+Effect/i, (m)=>`${m[1]}% 药剂效果期间闪避值提高`],
  [/^(\d+)%\s+increased\s+Armour\s+from\s+Equipped\s+Helmet\s+and\s+Gloves/i, (m)=>`${m[1]}% 头盔和手套的护甲提高`],
  [/^(\d+)%\s+increased\s+maximum\s+Life$/i, (m)=>`${m[1]}% 最大生命提高`],
  [/^(\d+)%\s+increased\s+maximum\s+Mana$/i, (m)=>`${m[1]}% 最大魔力提高`],
  [/^(\d+)%\s+increased\s+maximum\s+Energy\s+Shield$/i, (m)=>`${m[1]}% 最大能量护盾提高`],
  [/^(\d+)%\s+increased\s+Rarity\s+of\s+Items?\s+found$/i, (m)=>`${m[1]}% 物品稀有度提高`],
  [/^(\d+)%\s+increased\s+Rarity\s+of\s+Items?\s+found\s+during\s+Effect/i, (m)=>`${m[1]}% 药剂效果期间物品稀有度提高`],
  [/^(\d+)%\s+increased\s+Rarity\s+of\s+Items?\s+Dropped\s+by\s+Slain\s+Rare\s+or\s+Unique\s+Enemies/i,
    (m)=>`${m[1]}% 击杀稀有或传奇怪物掉落的物品稀有度提高`],
  [/^(\d+)%\s+increased\s+Area\s+of\s+Effect$/i, (m)=>`${m[1]}% 效果范围扩大`],
  [/^(\d+)%\s+increased\s+Area\s+of\s+Effect\s+during\s+Effect/i, (m)=>`${m[1]}% 药剂效果期间效果范围扩大`],
  [/^(\d+)%\s+increased\s+Projectile\s+Speed$/i, (m)=>`${m[1]}% 投射物速度提高`],
  [/^(\d+)%\s+increased\s+Stun\s+and\s+Block\s+Recovery$/i, (m)=>`${m[1]}% 晕眩和格挡恢复提高`],
  [/^(\d+)%\s+increased\s+Duration$/i, (m)=>`${m[1]}% 持续时间延长`],
  [/^(\d+)%\s+increased\s+Charge\s+Recovery$/i, (m)=>`${m[1]}% 充能恢复提高`],
  [/^(\d+)%\s+increased\s+Charges?\s+per\s+use$/i, (m)=>`${m[1]}% 每次使用充能数增加`],
  [/^(\d+)%\s+increased\s+Flask\s+Effect\s+Duration$/i, (m)=>`${m[1]}% 药剂效果持续时间延长`],
  [/^(\d+)%\s+increased\s+Mana\s+Regeneration\s+Rate$/i, (m)=>`${m[1]}% 魔力回复速率提高`],
  [/^(\d+)%\s+increased\s+Energy\s+Shield\s+Recharge\s+Rate$/i, (m)=>`${m[1]}% 能量护盾充能速率提高`],
  [/^(\d+)%\s+increased\s+Chance\s+to\s+Block$/i, (m)=>`${m[1]}% 格挡几率提高`],
  [/^(\d+)%\s+increased\s+Reservation\s+Efficiency\s+of\s+Skills/i, (m)=>`${m[1]}% 技能保留效能提高`],
  [/^(\d+)%\s+increased\s+Trap\s+Throwing\s+Speed$/i, (m)=>`${m[1]}% 陷阱投掷速度提高`],
  [/^(\d+)%\s+increased\s+Action\s+Speed$/i, (m)=>`${m[1]}% 行动速度提高`],
  [/^(\d+)%\s+increased\s+effect\s+of\s+Non-Curse\s+Auras\s+from\s+your\s+Skills/i,
    (m)=>`${m[1]}% 你技能的非诅咒光环效果提高`],
  [/^(\d+)%\s+increased\s+effect$/i, (m)=>`${m[1]}% 效果提高`],
  [/^(\d+)%\s+increased\s+bonuses\s+gained\s+from\s+Equipped\s+Quiver/i, (m)=>`${m[1]}% 装备箭袋获得的加成提高`],
  [/^(\d+)%\s+increased\s+Explicit\s+(.+?)\s+Modifier\s+magnitudes/i,
    (m)=>`${m[1]}% 后缀${_modTypeZh(m[2])}词缀幅度提高`],
  [/^(\d+)%\s+increased\s+Explicit\s+Modifier\s+magnitudes/i,
    (m)=>`${m[1]}% 后缀词缀幅度提高`],

  // ── % reduced ──
  [/^(\d+)%\s+reduced\s+Charges?\s+per\s+use$/i, (m)=>`${m[1]}% 每次使用充能数减少`],
  [/^(\d+)%\s+reduced\s+Duration$/i, (m)=>`${m[1]}% 持续时间缩短`],
  [/^(\d+)%\s+reduced\s+Effect\s+of\s+Chill\s+on\s+you/i, (m)=>`${m[1]}% 冰缓对你的效果降低`],
  [/^(\d+)%\s+reduced\s+Effect\s+of\s+Curses\s+on\s+you\s+during\s+Effect/i, (m)=>`${m[1]}% 药剂效果期间诅咒对你的效果降低`],
  [/^(\d+)%\s+reduced\s+Effect\s+of\s+Shock\s+on\s+you\s+during\s+Effect/i, (m)=>`${m[1]}% 药剂效果期间感电对你的效果降低`],
  [/^(\d+)%\s+reduced\s+Amount\s+Recovered$/i, (m)=>`${m[1]}% 恢复量降低`],
  [/^(\d+)%\s+reduced\s+Attribute\s+Requirements$/i, (m)=>`${m[1]}% 属性需求降低`],

  // ── + to maximum stats ──
  [/^\+(\d+)\s+to\s+maximum\s+Life$/i, (m)=>`+${m[1]} 最大生命`],
  [/^\+(\d+)\s+to\s+maximum\s+Mana$/i, (m)=>`+${m[1]} 最大魔力`],
  [/^\+(\d+)\s+to\s+maximum\s+Energy\s+Shield$/i, (m)=>`+${m[1]} 最大能量护盾`],

  // ── + to Resistances ──
  [/^\+(\d+)%\s+to\s+all\s+Elemental\s+Resistances$/i, (m)=>`+${m[1]}% 全部元素抗性`],
  [/^-(\d+)%\s+to\s+all\s+Elemental\s+Resistances$/i, (m)=>`-${m[1]}% 全部元素抗性`],
  [/^\+(\d+)%\s+to\s+(Fire|Cold|Lightning|Chaos)\s+Resistance$/i, (m)=>`+${m[1]}% ${_elZh(m[2])}抗性`],
  [/^\+(\d+)%\s+to\s+(Fire|Cold|Lightning)\s+and\s+(Fire|Cold|Lightning|Chaos)\s+Resistances$/i,
    (m)=>`+${m[1]}% ${_elZh(m[2])}与${_elZh(m[3])}抗性`],
  [/^\+(\d+)%\s+to\s+Chaos\s+Resistance\s+while\s+affected\s+by\s+Purity\s+of\s+Elements/i,
    (m)=>`受元素净化影响时 +${m[1]}% 混沌抗性`],

  // ── + to Attributes ──
  [/^\+(\d+)\s+to\s+all\s+Attributes$/i, (m)=>`+${m[1]} 全属性`],
  [/^\+(\d+)\s+to\s+(Strength|Dexterity|Intelligence)$/i, (m)=>`+${m[1]} ${_atZh(m[2])}`],
  [/^\+(\d+)\s+to\s+(Strength|Dexterity|Intelligence)\s+and\s+(Strength|Dexterity|Intelligence)$/i,
    (m)=>`+${m[1]} ${_atZh(m[2])}与${_atZh(m[3])}`],

  // ── + to Evasion / Accuracy ──
  [/^\+(\d+)\s+to\s+Evasion\s+Rating$/i, (m)=>`+${m[1]} 闪避值`],
  [/^\+(\d+)\s+to\s+Accuracy\s+Rating$/i, (m)=>`+${m[1]} 命中值`],
  [/^\+(\d+)\s+to\s+Accuracy\s+Rating\s+per\s+Frenzy\s+Charge/i, (m)=>`每个狂怒球 +${m[1]} 命中值`],

  // ── Charges ──
  [/^\+(\d+)\s+to\s+Maximum\s+Frenzy\s+Charges$/i, (m)=>`+${m[1]} 最大狂怒球数量`],
  [/^\+(\d+)\s+to\s+Minimum\s+Frenzy\s+Charges$/i, (m)=>`+${m[1]} 最小狂怒球数量`],
  [/^\+(\d+)\s+to\s+Maximum\s+Charges$/i, (m)=>`+${m[1]} 最大充能数`],
  [/^(\d+)%\s+chance\s+to\s+gain\s+a\s+Frenzy\s+Charge\s+on\s+Kill/i, (m)=>`${m[1]}% 几率在击杀时获得狂怒球`],

  // ── Block ──
  [/^\+(\d+)%\s+Chance\s+to\s+Block\s+Attack\s+Damage\s+during\s+Effect/i, (m)=>`+${m[1]}% 药剂效果期间格挡攻击几率`],
  [/^\+(\d+)%\s+Chance\s+to\s+Block\s+Spell\s+Damage\s+during\s+Effect/i, (m)=>`+${m[1]}% 药剂效果期间格挡法术几率`],

  // ── Suppress ──
  [/^\+?(\d+)%\s+chance\s+to\s+Suppress\s+Spell\s+Damage/i, (m)=>`+${m[1]}% 法术伤害压制几率`],

  // ── Conversion ──
  [/^(\d+)%\s+of\s+Physical\s+Damage\s+Converted\s+to\s+(Fire|Cold|Lightning|Chaos)\s+Damage/i,
    (m)=>`${m[1]}% 物理伤害转化为${_elZh(m[2])}伤害`],
  [/^(\d+)%\s+of\s+Physical\s+Damage\s+from\s+Hits\s+taken\s+as\s+(Fire|Cold|Lightning|Chaos)\s+Damage/i,
    (m)=>`${m[1]}% 承受的物理击中伤害视为${_elZh(m[2])}伤害`],

  // ── Gain extra damage ──
  [/^Gain\s+(\d+)%\s+of\s+Physical\s+Damage\s+as\s+Extra\s+(Fire|Cold|Lightning|Chaos)\s+Damage/i,
    (m)=>`获得 ${m[1]}% 物理伤害的额外${_elZh(m[2])}伤害`],
  [/^Gain\s+(\d+)%\s+of\s+Physical\s+Damage\s+as\s+Extra\s+Damage\s+of\s+a\s+random\s+Element/i,
    (m)=>`获得 ${m[1]}% 物理伤害的随机元素额外伤害`],
  [/^Gain\s+(\d+)\s+Life\s+per\s+Enemy\s+Killed/i, (m)=>`每击杀一个敌人获得 ${m[1]} 生命`],
  [/^Gain\s+(\d+)\s+Rage\s+on\s+Attack\s+Hit/i, (m)=>`攻击命中时获得 ${m[1]} 怒火`],

  // ── Mana Cost ──
  [/^Non-Channelling\s+Skills\s+have\s+(-?\d+)\s+to\s+Total\s+Mana\s+Cost/i,
    (m)=>`非引导技能的总魔力消耗 ${m[1]}`],

  // ── Bow / Projectile ──
  [/^Bow\s+Attacks?\s+fire\s+(\d+)\s+additional\s+Arrows?$/i, (m)=>`弓攻击发射 ${m[1]} 支额外箭矢`],
  [/^Bow\s+Attacks?\s+fire\s+an\s+additional\s+Arrow$/i, ()=>`弓攻击发射 1 支额外箭矢`],
  [/^Skills?\s+fire\s+(\d+)\s+additional\s+Projectiles?\s+during\s+Effect/i, (m)=>`药剂效果期间技能发射 ${m[1]} 个额外投射物`],
  [/^Projectiles\s+Return\s+to\s+you$/i, ()=>'投射物返回到你身边'],
  [/^Projectiles\s+are\s+fired\s+in\s+random\s+directions$/i, ()=>'投射物向随机方向发射'],

  // ── Flask mechanics ──
  [/^Instant\s+Recovery$/i, ()=>'瞬间恢复'],
  [/^Used\s+when\s+Charges\s+reach\s+full$/i, ()=>'充能满时自动使用'],
  [/^Used\s+when\s+you\s+Hit\s+a\s+Rare\s+or\s+Unique\s+Enemy/i, ()=>'命中稀有或传奇敌人时自动使用'],
  [/^Recharges\s+(\d+)\s+Charges?\s+when\s+you\s+Consume\s+an\s+Ignited\s+corpse/i,
    (m)=>`消耗点燃的尸体时恢复 ${m[1]} 充能`],
  [/^Recover\s+(\d+)%\s+of\s+Energy\s+Shield\s+when\s+you\s+Kill\s+an\s+Enemy\s+during\s+Effect/i,
    (m)=>`药剂效果期间击杀敌人时恢复 ${m[1]}% 能量护盾`],
  [/^Grants\s+Immunity\s+to\s+Bleeding\s+for\s+(\d+)\s+seconds/i, (m)=>`使用时免疫流血 ${m[1]} 秒`],
  [/^Grants\s+Immunity\s+to\s+Corrupted\s+Blood\s+for\s+(\d+)\s+seconds/i, (m)=>`使用时免疫腐化之血 ${m[1]} 秒`],
  [/^Grants\s+a\s+random\s+Divination\s+Buff\s+for\s+(\d+)\s+seconds/i, (m)=>`使用时获得随机占卜增益 ${m[1]} 秒`],
  [/^Grants\s+(\d+)%\s+increased\s+Elemental\s+Damage\s+per\s+(\d+)%\s+Quality/i,
    (m)=>`每 ${m[2]}% 品质获得 ${m[1]}% 元素伤害`],

  // ── Kill / Hit / Recently ──
  [/^Enemies\s+you\s+Kill\s+have\s+a\s+(\d+)%\s+chance\s+to\s+Explode.*?Physical\s+Damage/i,
    (m)=>`被你击杀的敌人有 ${m[1]}% 几率爆炸，造成其最大生命十分之一的物理伤害`],
  [/^When\s+you\s+Kill\s+a\s+Rare\s+monster.*?(\d+)\s+seconds/i,
    (m)=>`击杀稀有怪物时获得其词缀，持续 ${m[1]} 秒`],
  [/^(\d+)%\s+chance\s+to\s+Blind\s+Enemies\s+on\s+Hit\s+with\s+Attacks/i, (m)=>`${m[1]}% 几率攻击命中时致盲敌人`],
  [/^(\d+)%\s+chance\s+to\s+gain\s+Phasing\s+for\s+(\d+)\s+seconds\s+on\s+Kill/i,
    (m)=>`${m[1]}% 几率击杀时获得迷踪 ${m[2]} 秒`],
  [/^Corrupted\s+Blood\s+cannot\s+be\s+inflicted\s+on\s+you$/i, ()=>'腐化之血无法施加于你'],

  // ── Ignite / Shock / Chill ──
  [/^Enemies\s+Ignited\s+by\s+you\s+during\s+Effect\s+have\s+Malediction/i, ()=>'药剂效果期间被你点燃的敌人拥有恶毒诅咒'],
  [/^Enemies\s+Ignited\s+by\s+you\s+during\s+Effect\s+take\s+(\d+)%\s+increased\s+Damage/i,
    (m)=>`药剂效果期间被你点燃的敌人承受 ${m[1]}% 额外伤害`],

  // ── Reflect ──
  [/^(\d+)%\s+of\s+Damage\s+from\s+your\s+Hits\s+cannot\s+be\s+Reflected/i, (m)=>`${m[1]}% 你的击中伤害无法被反射`],

  // ── Progenesis ──
  [/^When\s+Hit\s+during\s+effect.*?(\d+)%\s+of\s+Life\s+loss.*?(\d+)\s+seconds/i,
    (m)=>`药剂效果期间被击中时，${m[1]}% 生命损失改为在 ${m[2]} 秒内承受`],

  // ── Trigger / Socketed ──
  [/^Trigger\s+a\s+Socketed\s+Bow\s+Skill.*?(\d+)\s+second\s+Cooldown/i,
    (m)=>`弓攻击时触发插槽中的弓技能，冷却 ${m[1]} 秒`],
  [/^Socketed\s+Skill\s+Gems\s+get\s+a\s+(\d+)%\s+Cost\s+&\s+Reservation\s+Multiplier/i,
    (m)=>`插槽中的技能石获得 ${m[1]}% 消耗与保留乘数`],

  // ── Sockets / Has ──
  [/^Has\s+(\d+)\s+Abyssal\s+Sockets?$/i, (m)=>`拥有 ${m[1]} 个深渊插槽`],
  [/^Has\s+(\d+)\s+Sockets?$/i, (m)=>`拥有 ${m[1]} 个插槽`],

  // ── Jewel / Cluster ──
  [/^Adds?\s+(\d+)\s+Passive\s+Skills$/i, (m)=>`增加 ${m[1]} 个天赋技能`],
  [/^(\d+)\s+Added\s+Passive\s+Skills?\s+(?:is|are)\s+Jewel\s+Sockets?$/i, (m)=>`${m[1]} 个新增天赋为珠宝插槽`],
  [/^(\d+)\s+Added\s+Passive\s+Skill\s+is\s+(.+)$/i, (m)=>`1 个新增天赋为「${m[2]}」`],
  [/^Added\s+Small\s+Passive\s+Skills\s+also\s+grant:\s+(.+)$/i, (m)=>`小型天赋同时给予: ${_translateInner(m[1])}`],
  [/^Added\s+Small\s+Passive\s+Skills\s+grant:\s+(.+)$/i, (m)=>`小型天赋给予: ${_translateInner(m[1])}`],
  [/^Added\s+Small\s+Passive\s+Skills\s+have\s+(\d+)%\s+increased\s+Effect$/i, (m)=>`小型天赋效果提高 ${m[1]}%`],
  [/^Allocated\s+Small\s+Passive\s+Skills\s+in\s+Radius\s+grant\s+nothing$/i, ()=>'半径内已配置的小型天赋不给予任何效果'],
  [/^Passive\s+Skills\s+in\s+Radius\s+can\s+be\s+Allocated\s+without\s+being\s+connected/i,
    ()=>'半径内的天赋可以在不连接的情况下配置'],
  [/^Grants\s+all\s+bonuses\s+of\s+Unallocated\s+Small\s+Passive\s+Skills\s+in\s+Radius/i,
    ()=>'给予半径内所有未配置小型天赋的加成'],
  [/^Only\s+affects\s+Passives\s+in\s+(Massive|Large|Medium|Small)\s+Ring$/i,
    (m)=>{ const r={Massive:'巨型',Large:'大型',Medium:'中型',Small:'小型'}; return `仅影响${r[m[1]]||m[1]}环内天赋`; }],
  [/^Passives\s+in\s+radius\s+are\s+Conquered\s+by\s+the\s+Karui$/i, ()=>'半径内的天赋被卡鲁征服'],
  [/^Commanded\s+leadership\s+over\s+(\d+)\s+warriors\s+under\s+(.+)$/i, (m)=>`在${m[2]}麾下统率 ${m[1]} 名战士`],

  // ── Allocates ──
  [/^Allocates\s+(.+)$/i, (m)=>`配置「${m[1]}」`],

  // ── Vendor / Item sells ──
  [/^Item\s+sells\s+for\s+much\s+more\s+to\s+vendors$/i, ()=>'物品卖给商人时价格大幅提高'],
  [/^Quality\s+does\s+not\s+increase\s+Physical\s+Damage$/i, ()=>'品质不提高物理伤害'],

  // ── Crafting ──
  [/^Cannot\s+roll\s+Caster\s+Modifiers$/i, ()=>'无法出现施法者词缀'],
  [/^Implicit\s+Modifiers\s+Cannot\s+Be\s+Changed$/i, ()=>'固有词缀无法被改变'],
  [/^-(\d+)\s+Suffix\s+Modifier\s+allowed$/i, (m)=>`后缀词缀上限 -${m[1]}`],
  [/^-(\d+)\s+Prefix\s+Modifiers?\s+allowed$/i, (m)=>`前缀词缀上限 -${m[1]}`],

  // ── Culling / Mutated ──
  [/^Culling\s+Strike$/i, ()=>'终结打击'],

  // ── Aura / Effect ──
  [/^(\d+)%\s+less\s+Duration$/i, (m)=>`${m[1]}% 持续时间缩短`],
];

// ── Helper: translate sub-expressions inside cluster mods ──
function _translateInner(text) {
  // Try a simpler pass for common cluster small passive grants
  let t = text;
  t = t.replace(/\+(\d+)\s+to\s+All\s+Attributes/i, '+$1 全属性');
  t = t.replace(/\+(\d+)%\s+to\s+all\s+Elemental\s+Resistances/i, '+$1% 全部元素抗性');
  t = t.replace(/(\d+)%\s+increased\s+Attack\s+Speed/i, '$1% 攻击速度提高');
  t = t.replace(/(\d+)%\s+increased\s+Damage/i, '$1% 伤害提高');
  t = t.replace(/Regenerate\s+([\d.]+)%\s+of\s+Life\s+per\s+Second/i, '每秒回复 $1% 生命');
  t = t.replace(/(\d+)%\s+increased\s+Damage\s+Over\s+Time\s+with\s+Bow\s+Skills/i, '$1% 弓技能持续伤害提高');
  t = t.replace(/(\d+)%\s+increased\s+Damage\s+with\s+Bows/i, '$1% 弓伤害提高');
  t = t.replace(/(\d+)%\s+increased\s+(Lightning|Fire|Cold|Chaos)\s+Damage/i, (_, v, e)=>`${v}% ${_elZh(e)}伤害提高`);
  return t;
}

function _buffZh(name) {
  const m = { Hatred:'憎恨', Precision:'精准', Wrath:'雷霆', Anger:'愤怒', Grace:'优雅',
    Determination:'坚决', Discipline:'纪律', Malevolence:'恶意', Zealotry:'狂热',
    'Purity of Elements':'元素净化', 'Purity of Fire':'火焰净化',
    'Purity of Ice':'冰霜净化', 'Purity of Lightning':'闪电净化',
    Haste:'迅捷', Vitality:'活力', Clarity:'清晰' };
  return m[name] || name;
}

function _damageTypeZh(text) {
  let t = text;
  for (const [en, zh] of Object.entries(_ELE)) t = t.replace(new RegExp(en, 'gi'), zh);
  t = t.replace(/\bDamage\b/gi, '伤害');
  t = t.replace(/\bSpell\b/gi, '法术');
  t = t.replace(/\bAttack\b/gi, '攻击');
  t = t.replace(/\bProjectile\b/gi, '投射物');
  t = t.replace(/\bArea\b/gi, '范围');
  t = t.replace(/\bMelee\b/gi, '近战');
  return t;
}

function _modTypeZh(text) {
  if (/Physical/i.test(text)) return '物理';
  if (/Fire/i.test(text)) return '火焰';
  if (/Cold/i.test(text)) return '冰霜';
  if (/Lightning/i.test(text)) return '闪电';
  return text;
}

// ── Main entry: translate one mod line ──
function translateMod(line) {
  if (!line) return '';
  const clean = line.replace(/^\{(crafted|fractured|mutated)\}/, '').trim();
  if (!clean) return '';

  for (const [re, fn] of _rules) {
    const m = clean.match(re);
    if (m) {
      const result = fn(m);
      if (result === null) return null; // skip line (e.g. percentile metadata)
      // Restore prefix tag
      let prefix = '';
      if (line.startsWith('{crafted}')) prefix = '{crafted}';
      if (line.startsWith('{fractured}')) prefix = '{fractured}';
      if (line.startsWith('{mutated}')) prefix = '{mutated}';
      return prefix + result;
    }
  }
  return line; // fallback: return original
}

// ── Translate a full multi-line item text block ──
function translateItemText(text) {
  if (!text) return '';
  return text.split('\n').map(l => {
    const t = translateMod(l);
    return t === null ? '' : t;
  }).filter(l => l !== '').join('\n');
}

// ── Base type translation dictionary ──
const _baseTypes = {
  'Spine Bow':'脊弓','Crude Bow':'粗制弓','Leather Belt':'皮革腰带',
  'Phantom Boots':'幽灵之靴','Simplex Amulet':'简约护身符','Phantom Mitts':'幽灵手套',
  'Amethyst Ring':'紫晶戒指','Topaz Ring':'黄晶戒指','Ornate Quiver':'华丽箭袋',
  "Torturer's Mask":'拷问者面具','Necrotic Armour':'亡灵护甲',
  'Gold Flask':'黄金药剂','Silver Flask':'白银药剂','Amethyst Flask':'紫晶药剂',
  'Ruby Flask':'红玉药剂','Quicksilver Flask':'水银药剂',
  'Crimson Jewel':'赤红珠宝','Viridian Jewel':'翠绿珠宝','Cobalt Jewel':'钴蓝珠宝',
  'Prismatic Jewel':'三相珠宝','Large Cluster Jewel':'大型星团珠宝',
  'Medium Cluster Jewel':'中型星团珠宝','Small Cluster Jewel':'小型星团珠宝',
  'Timeless Jewel':'永恒珠宝','Searching Eye Jewel':'探知之眼珠宝',
  'Ghastly Eye Jewel':'惊骇之眼珠宝','Murderous Eye Jewel':'凶残之眼珠宝',
  'Hypnotic Eye Jewel':'催眠之眼珠宝',
};

function translateBaseType(bt) {
  return _baseTypes[bt] || bt;
}

// ── Unique item name translations ──
const _uniqueNames = {
  'Headhunter':'猎首','Nimis':'尼米斯','Widowhail':'寡妇哀嚎',
  "Maloney's Mechanism":'马洛尼的机关','Wine of the Prophet':'先知之酒',
  'Cinderswallow Urn':'灰烬吞噬之瓮','Progenesis':'原始起源',
  'Dying Sun':'垂死之日','Thread of Hope':'希望之线',
  "Watcher's Eye":'守望之眼','Unnatural Instinct':'非自然本能',
  'Lethal Pride':'致命骄傲',
  'Foulborn Headhunter':'污秽猎首',
};

function translateUniqueName(name) {
  if (!name) return name;
  // Try full match first (includes prefix like "Foulborn Headhunter")
  const base = name.split(' (')[0];
  if (_uniqueNames[base]) return _uniqueNames[base];
  return name;
}
