// generate_skill_catalog.js
// 生成 100 个主动技能 + 500 个辅助石的完整技能目录
// 输出: Lua 类文件 + skill_registry.lua + skill-catalog.json

const fs = require('fs');
const path = require('path');

// ─── 配置 ───────────────────────────────────────────────────────────────────
const CONTENT_SCRIPT = 'G:\\GameExPro3\\MagicWorld\\Content\\Script\\com\\ability\\node\\MagicAsset\\AsAsset\\MagicAbility';
const SCRIPT_DIR     = 'G:\\GameExPro3\\MagicWorld\\Script\\com\\ability\\node\\MagicAsset\\AsAsset\\MagicAbility';
const REGISTRY_PATH  = 'G:\\GameExPro3\\MagicWorld\\Content\\Script\\com\\ability\\skill_registry.lua';
const CATALOG_JSON   = path.join(__dirname, '..', 'public', 'skill-catalog.json');
const BASE_ID        = 2000000001; // 新技能从此 ID 开始，避免与现有 176961xxxx 冲突

// ─── 元素系统 ───────────────────────────────────────────────────────────────
const ELEMENTS = [
  { key: 'fire',    cn: '炎', desc: '灼烧' },
  { key: 'ice',     cn: '冰', desc: '冰冻' },
  { key: 'thunder', cn: '雷', desc: '雷击' },
  { key: 'poison',  cn: '毒', desc: '腐蚀' },
  { key: 'water',   cn: '水', desc: '潮涌' },
  { key: 'dark',    cn: '暗', desc: '暗蚀' },
  { key: 'light',   cn: '光', desc: '圣辉' },
  { key: 'wind',    cn: '风', desc: '风裂' },
  { key: 'earth',   cn: '岩', desc: '震碎' },
  { key: 'void',    cn: '虚', desc: '湮灭' },
];

// ─── 主技能形态模板 ─────────────────────────────────────────────────────────
const PRIMARY_FORMS = [
  {
    formType: 'projectile', count: 25, nativeClass: 'MagicBall',
    baseProps: { speed: 1000, lifeSpan: 5 },
    names: [
      '流星弹','灵魂箭','气旋弹','裂空弹','穿心矢',
      '幽魂弹','崩坏球','天陨弹','蚀心矢','极光弹',
      '星尘弹','冥府箭','碎星弹','灭世弹','苍穹矢',
      '破晓弹','暮光箭','深渊弹','曙光弹','混沌弹',
      '净化弹','毁灭弹','回旋弹','追魂矢','末日弹',
    ],
    descTpl: '凝聚{elem}之力化为投射物，以{Speed}的速度贯穿前方一切障碍',
  },
  {
    formType: 'ground_target', count: 15, nativeClass: 'MagicDefault',
    baseProps: { radius: 300, delay: 0.5, duration: 1 },
    names: [
      '落雷','天谴','陨石坠','地裂','天罚',
      '星陨','灭世雷','审判之光','深渊之门','天火',
      '冰封领域','毒雨','大地崩裂','虚空裂隙','圣光降临',
    ],
    descTpl: '在目标位置召唤{elem}之力，半径{radius}范围内造成毁灭性打击',
  },
  {
    formType: 'persistent_zone', count: 12, nativeClass: 'MagicDefault',
    baseProps: { radius: 400, duration: 5, tickInterval: 0.5 },
    names: [
      '毒沼','烈焰之地','冰霜领域','雷暴场','暗影领域',
      '圣域','风暴眼','熔岩池','腐化之地','虚空裂谷',
      '净化之地','瘴气场',
    ],
    descTpl: '在目标区域创建{elem}法术场，持续{duration}秒，每{tickInterval}秒对域内目标造成伤害',
  },
  {
    formType: 'melee', count: 12, nativeClass: 'MagicDefault',
    baseProps: { range: 200, arc: 120, hitCount: 1 },
    names: [
      '断空斩','裂魂击','碎岩拳','旋风斩','穿刺击',
      '灭杀斩','破甲击','龙牙斩','飞燕斩','暴风击',
      '天崩击','灭神斩',
    ],
    descTpl: '挥动武器释放{elem}之力，在{range}范围内造成{arc}度扇形打击',
  },
  {
    formType: 'summon', count: 8, nativeClass: 'MagicDefault',
    baseProps: { summonCount: 1, duration: 30 },
    names: [
      '召唤火元素','召唤冰灵','召唤雷兽','召唤毒蛇',
      '召唤暗影','召唤圣灵','召唤风精','召唤岩魔',
    ],
    descTpl: '召唤{elem}属性的仆从，持续{duration}秒为你作战',
  },
  {
    formType: 'aura', count: 8, nativeClass: 'MagicDefault',
    baseProps: { radius: 500, duration: 0 },
    names: [
      '烈焰光环','冰霜护罩','雷电领域','剧毒气场',
      '暗影笼罩','神圣光辉','狂风之翼','大地之力',
    ],
    descTpl: '释放{elem}属性光环，对{radius}范围内的目标施加持续效果',
  },
  {
    formType: 'self_buff', count: 8, nativeClass: 'MagicDefault',
    baseProps: { duration: 10, buffValue: 0.3 },
    names: [
      '烈焰附魔','冰甲术','雷霆之体','剧毒之躯',
      '暗影隐身','圣光护盾','疾风步','岩石皮肤',
    ],
    descTpl: '以{elem}之力强化自身，持续{duration}秒获得增益效果',
  },
  {
    formType: 'channeling', count: 6, nativeClass: 'MagicDefault',
    baseProps: { channelDuration: 3, tickInterval: 0.2 },
    names: [
      '灼热射线','冰霜吐息','闪电链','毒液喷射',
      '暗影通道','圣光之柱',
    ],
    descTpl: '持续引导{elem}之力，对前方目标造成每{tickInterval}秒一次的伤害',
  },
  {
    formType: 'dash', count: 4, nativeClass: 'MagicDefault',
    baseProps: { distance: 600, speed: 2000 },
    names: [
      '烈焰突进','寒冰闪现','雷霆冲刺','暗影步',
    ],
    descTpl: '化为{elem}之力瞬间位移{distance}距离，对路径上的目标造成伤害',
  },
  {
    formType: 'trap', count: 2, nativeClass: 'MagicDefault',
    baseProps: { triggerRadius: 150, armTime: 1, duration: 30 },
    names: [
      '烈焰陷阱','寒冰陷阱',
    ],
    descTpl: '在当前位置放置{elem}陷阱，{armTime}秒后激活，敌人进入{triggerRadius}范围时引爆',
  },
];

// ─── 被动石分类模板 ─────────────────────────────────────────────────────────
const PASSIVE_CATEGORIES = [
  {
    category: 'trajectory', parentClass: 'MagicPassive', count: 60,
    names: [
      '直射','曲射','螺旋弹道','锯齿弹道','回旋弹道',
      '波浪弹道','折射弹道','贯穿弹道','追踪弹道','弧线弹道',
      '散射弹道','扇形弹道','交叉弹道','平行弹道','锁定弹道',
      '蛇形弹道','闪烁弹道','瞬移弹道','漂移弹道','反弹弹道',
      '旋转弹道','上升弹道','俯冲弹道','横扫弹道','穿透弹道',
      '连锁弹道','扭曲弹道','裂变弹道','聚合弹道','跳弹弹道',
      '延迟弹道','脉冲弹道','震荡弹道','偏转弹道','离散弹道',
      '回溯弹道','镜像弹道','分身弹道','残影弹道','幻影弹道',
      '重力弹道','反重力弹道','磁力弹道','共振弹道','涡旋弹道',
      '星轨弹道','月弧弹道','日冕弹道','黑洞弹道','白洞弹道',
      '棱镜弹道','折叠弹道','维度弹道','时空弹道','因果弹道',
      '量子弹道','纠缠弹道','坍缩弹道','跃迁弹道','湮灭弹道',
    ],
    descTpl: '改变投射物的飞行轨迹为{name}模式',
    // 节点属性模板：每个属性 [min, max, step] 会在范围内轮换
    nodeProps: {
      trajectoryType: { type: 'enum', values: ['linear','curve','spiral','zigzag','wave','homing','bounce','teleport'] },
      angleOffset: { min: 0, max: 90, step: 5 },
      curveIntensity: { min: 0.1, max: 3.0, step: 0.1 },
      trackingRadius: { min: 200, max: 2000, step: 100 },
      updateInterval: { min: 0.05, max: 0.5, step: 0.05 },
    },
  },
  {
    category: 'split', parentClass: 'MagicPassive', count: 50,
    names: [
      '二分裂','三分裂','五分裂','七分裂','环形扩散',
      '星形爆发','螺旋扩散','锥形散射','球形扩散','十字分裂',
      '链式分裂','延迟分裂','碰撞分裂','定时分裂','触发分裂',
      '递归分裂','级联分裂','衰减分裂','增殖分裂','脉冲分裂',
      '共振分裂','对称分裂','非对称分裂','随机分裂','定向分裂',
      '旋转分裂','交叉分裂','平行分裂','放射分裂','内爆分裂',
      '量子分裂','维度分裂','时间分裂','空间分裂','因果分裂',
      '镜像分裂','幻影分裂','残影分裂','分身分裂','克隆分裂',
      '裂变反应','聚变反应','连锁反应','雪崩效应','蝴蝶效应',
      '多米诺分裂','棱镜分裂','折射分裂','衍射分裂','干涉分裂',
    ],
    descTpl: '投射物在特定条件下触发{name}效果，产生多个子弹道',
    nodeProps: {
      splitCount: { min: 2, max: 12, step: 1 },
      splitAngle: { min: 15, max: 360, step: 15 },
      triggerDistance: { min: 100, max: 800, step: 50 },
      bTriggerOnCollision: { type: 'bool', pattern: [false, true] },
      damageInheritance: { min: 0.3, max: 1.0, step: 0.05 },
    },
  },
  {
    category: 'element', parentClass: 'MagicPassive', count: 80,
    names: [
      '烈焰附魔','冰霜附魔','雷电附魔','剧毒附魔','暗影附魔',
      '圣光附魔','狂风附魔','岩石附魔','水流附魔','虚空附魔',
      '炎爆增幅','冰封增幅','雷暴增幅','腐蚀增幅','暗蚀增幅',
      '圣辉增幅','风裂增幅','震碎增幅','潮涌增幅','湮灭增幅',
      '火焰灼烧','寒冰减速','雷电麻痹','毒素侵蚀','暗影腐化',
      '圣光净化','风刃切割','岩石穿透','水流侵蚀','虚空吞噬',
      '炎之共鸣','冰之共鸣','雷之共鸣','毒之共鸣','暗之共鸣',
      '光之共鸣','风之共鸣','岩之共鸣','水之共鸣','虚之共鸣',
      '火焰新星','冰霜新星','雷电新星','毒雾新星','暗影新星',
      '圣光新星','狂风新星','岩石新星','水流新星','虚空新星',
      '燃烧领域','冻结领域','电击领域','毒化领域','暗蚀领域',
      '圣化领域','风暴领域','地震领域','洪水领域','虚无领域',
      '火焰连锁','冰霜连锁','雷电连锁','毒素连锁','暗影连锁',
      '圣光连锁','狂风连锁','岩石连锁','水流连锁','虚空连锁',
      '炎魂觉醒','冰魂觉醒','雷魂觉醒','毒魂觉醒','暗魂觉醒',
      '光魂觉醒','风魂觉醒','岩魂觉醒','水魂觉醒','虚魂觉醒',
    ],
    descTpl: '为技能附加{name}效果，增强元素属性伤害',
    nodeProps: {
      elementType: { type: 'enum', values: ['fire','ice','thunder','poison','dark','light','wind','earth','water','void'] },
      damageBonus: { min: 5, max: 80, step: 5 },
      dotDuration: { min: 1, max: 8, step: 0.5 },
      dotTickInterval: { min: 0.2, max: 1.0, step: 0.1 },
      effectRadius: { min: 100, max: 600, step: 50 },
    },
  },
  {
    category: 'speed', parentClass: 'MagicPassive', count: 50,
    names: [
      '疾速','加速','极速冲刺','光速','超频',
      '减速陷阱','时间减缓','惯性加速','脉冲加速','渐进加速',
      '突然加速','匀速巡航','变速运动','弹射加速','弹弓效应',
      '引力加速','反引力加速','磁力加速','电磁加速','量子加速',
      '时间膨胀','时间压缩','空间折叠','维度跳跃','瞬移',
      '闪烁步','相位移动','虫洞穿越','超空间跳跃','曲速航行',
      '亚光速','超光速','动量守恒','能量转换','质量加速',
      '离心加速','向心加速','螺旋加速','涡轮增压','火箭推进',
      '喷射加速','滑翔加速','俯冲加速','弹射起步','爆发加速',
      '持续加速','阶梯加速','波动加速','共振加速','临界加速',
    ],
    descTpl: '改变投射物的速度属性，应用{name}效果',
    nodeProps: {
      speedMultiplier: { min: 0.3, max: 5.0, step: 0.1 },
      accelerationRate: { min: 0, max: 500, step: 25 },
      maxSpeed: { min: 500, max: 5000, step: 250 },
      rampUpTime: { min: 0, max: 3.0, step: 0.2 },
    },
  },
  {
    category: 'range', parentClass: 'MagicPassive', count: 50,
    names: [
      '射程延伸','范围扩大','穿透射击','远距精确','超远射程',
      '近距强化','中距优化','全距覆盖','范围收缩','精确打击',
      '广域扩散','锥形扩展','球形覆盖','线性延伸','面状扩展',
      '立体覆盖','点状集中','环形覆盖','螺旋覆盖','网状覆盖',
      '穿墙射击','无视障碍','曲线绕行','反射路径','折射路径',
      '多段打击','连锁打击','弹跳打击','贯穿打击','终末打击',
      '范围翻倍','范围减半','动态范围','自适应范围','智能范围',
      '递增范围','递减范围','脉冲范围','震荡范围','稳定范围',
      '最大射程','最小范围','可变口径','聚焦光束','扩散光束',
      '狙击模式','散弹模式','榴弹模式','导弹模式','激光模式',
    ],
    descTpl: '调整技能的作用范围，应用{name}效果',
    nodeProps: {
      rangeMultiplier: { min: 0.5, max: 3.0, step: 0.1 },
      aoeRadius: { min: 50, max: 800, step: 50 },
      pierceCount: { min: 0, max: 10, step: 1 },
      maxDistance: { min: 500, max: 5000, step: 250 },
    },
  },
  {
    category: 'duration', parentClass: 'MagicPassive', count: 40,
    names: [
      '持续延长','时间冻结','永恒之力','瞬发','急速释放',
      '延时触发','定时引爆','周期脉冲','间歇释放','连续释放',
      '渐强效果','渐弱效果','恒定效果','波动效果','共振延时',
      '时间回溯','时间加速','时间停顿','时间循环','时间裂隙',
      '持久战','闪电战','消耗战','拉锯战','决战',
      '蓄力释放','快速蓄力','满蓄强化','分段蓄力','连续蓄力',
      '余波','残留','延续','绵延','永续',
      '倒计时','正计时','随机时长','固定时长','无限时长',
    ],
    descTpl: '调整技能的持续时间，应用{name}效果',
    nodeProps: {
      lifeSpanMultiplier: { min: 0.3, max: 5.0, step: 0.2 },
      persistDuration: { min: 1, max: 30, step: 1 },
      tickInterval: { min: 0.1, max: 2.0, step: 0.1 },
      chargeTime: { min: 0, max: 5.0, step: 0.5 },
    },
  },
  {
    category: 'damage', parentClass: 'MagicPassive', count: 60,
    names: [
      '伤害增幅','暴击强化','穿甲效果','破盾效果','弱点打击',
      '致命一击','连击加成','背刺加成','空中加成','倒地追击',
      '元素克制','属性压制','类型克制','种族克制','等级压制',
      '固定伤害','百分比伤害','真实伤害','混合伤害','纯粹伤害',
      '溅射伤害','范围伤害','单体伤害','群体伤害','连锁伤害',
      '持续伤害','瞬间伤害','延迟伤害','反射伤害','吸血伤害',
      '伤害递增','伤害递减','伤害波动','伤害稳定','伤害爆发',
      '暴击概率','暴击伤害','暴击回复','暴击连锁','暴击新星',
      '穿透护甲','无视防御','削弱防御','粉碎护甲','腐蚀护甲',
      '生命偷取','法力偷取','能量偷取','灵魂偷取','本质偷取',
      '处决效果','斩杀效果','终结效果','收割效果','审判效果',
      '过量伤害','溢出伤害','连带伤害','殉爆伤害','共振伤害',
    ],
    descTpl: '强化技能的伤害属性，应用{name}效果',
    nodeProps: {
      damageMultiplier: { min: 1.05, max: 3.0, step: 0.05 },
      critChance: { min: 0, max: 50, step: 2 },
      critMultiplier: { min: 1.5, max: 4.0, step: 0.1 },
      armorPenetration: { min: 0, max: 100, step: 5 },
      lifeSteal: { min: 0, max: 30, step: 2 },
    },
  },
  {
    category: 'effect', parentClass: 'MagicPassive', count: 50,
    names: [
      '爆炸效果','内爆效果','冲击波','震荡波','能量脉冲',
      '黑洞吸引','龙卷风','漩涡','磁暴','电磁脉冲',
      '火焰尾迹','冰霜轨迹','雷电轨迹','毒雾轨迹','暗影轨迹',
      '碰撞爆发','穿透余波','弹跳火花','分裂残片','环绕护盾',
      '标记效果','印记效果','诅咒效果','祝福效果','烙印效果',
      '减速场','加速场','眩晕场','沉默场','禁锢场',
      '传送门','虫洞','空间裂隙','维度通道','时间锚点',
      '共鸣','谐振','干扰','压制','增幅',
      '连锁闪电','跳跃火花','扩散毒雾','蔓延藤蔓','侵蚀光波',
      '镜像复制','幻影替身','分身术','影分身','量子分身',
    ],
    descTpl: '为技能添加额外的{name}特效',
    nodeProps: {
      effectType: { type: 'enum', values: ['explosion','implosion','shockwave','vortex','trail','field','mark','summon','chain','clone'] },
      effectRadius: { min: 100, max: 800, step: 50 },
      effectDuration: { min: 0.5, max: 8.0, step: 0.5 },
      effectChance: { min: 10, max: 100, step: 5 },
      triggerCondition: { type: 'enum', values: ['onHit','onCrit','onKill','onBounce','onSplit','onExpire','onTick','periodic'] },
    },
  },
  {
    category: 'defense', parentClass: 'MagicPassive', count: 30,
    names: [
      '护盾生成','生命吸取','伤害减免','格挡反击','闪避增强',
      '反射屏障','吸收护盾','再生光环','治愈之触','生命之泉',
      '魔法护甲','元素抗性','物理抗性','全属性抗性','适应护盾',
      '荆棘反伤','反射伤害','以伤换伤','吸收转化','能量护盾',
      '不动如山','铜墙铁壁','金钟罩','铁布衫','刀枪不入',
      '回复加速','自动回复','战斗回复','脱战回复','临死回复',
    ],
    descTpl: '为技能附加防御效果，应用{name}',
    nodeProps: {
      shieldAmount: { min: 50, max: 500, step: 25 },
      damageReduction: { min: 5, max: 50, step: 5 },
      reflectPercent: { min: 5, max: 60, step: 5 },
      healAmount: { min: 10, max: 200, step: 10 },
      defenseDuration: { min: 1, max: 10, step: 0.5 },
    },
  },
  {
    category: 'control', parentClass: 'MagicPassive', count: 30,
    names: [
      '眩晕','冰冻','减速','沉默','缴械',
      '击退','拉拽','击飞','定身','束缚',
      '恐惧','魅惑','催眠','混乱','致盲',
      '禁锢','石化','冰封','雷锁','毒痹',
      '嘲讽','挑衅','仇恨转移','注意力分散','精神控制',
      '时间停止','空间锁定','维度禁锢','因果断裂','命运束缚',
    ],
    descTpl: '为技能附加{name}控制效果，限制目标行动',
    nodeProps: {
      controlType: { type: 'enum', values: ['stun','freeze','slow','silence','disarm','knockback','pull','airborne','root','bind','fear','charm','sleep','confuse','blind','taunt'] },
      controlDuration: { min: 0.5, max: 5.0, step: 0.25 },
      controlChance: { min: 10, max: 100, step: 5 },
      slowPercent: { min: 10, max: 80, step: 5 },
      knockbackForce: { min: 100, max: 1000, step: 50 },
    },
  },
];

// ─── 节点属性变化工具 ─────────────────────────────────────────────────────────

function resolveNodeProps(nodePropsTemplate, index) {
  if (!nodePropsTemplate) return {};
  const result = {};
  for (const [key, spec] of Object.entries(nodePropsTemplate)) {
    if (spec.type === 'enum') {
      result[key] = spec.values[index % spec.values.length];
    } else if (spec.type === 'bool') {
      result[key] = spec.pattern[index % spec.pattern.length];
    } else {
      // numeric range: min..max with step
      const steps = Math.round((spec.max - spec.min) / spec.step);
      const stepIdx = index % (steps + 1);
      let val = spec.min + stepIdx * spec.step;
      val = Math.round(val * 100) / 100; // avoid float drift
      result[key] = val;
    }
  }
  return result;
}

// ─── Lua 文件生成 ────────────────────────────────────────────────────────────

function luaVal(v) {
  if (v === null || v === undefined) return 'nil';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `"${v.replace(/"/g, '\\"')}"`;
  if (Array.isArray(v)) {
    if (v.length === 0) return '{}';
    return '{\n' + v.map(x => '        ' + luaVal(x) + ',').join('\n') + '\n    }';
  }
  return String(v);
}

function generateLuaFile(skill, isContent) {
  const requirePrefix = isContent ? 'com.ability.node.' : '';
  const classRequire = isContent ? 'require("com.ability.node.class")' : 'require("class")';

  const parentPath = skill.parentClassPath;
  const parentRequire = isContent
    ? `require("com.ability.node.${parentPath}")`
    : `require("${parentPath}")`;

  let lines = [];
  lines.push(`-- ${skill.className} (${skill.skillName})`);
  lines.push(`-- 形态: ${skill.formType || skill.category}`);
  lines.push(`-- 自动生成，请勿手动编辑`);
  lines.push('');
  lines.push(`local class = ${classRequire}`);
  lines.push(`local ${skill.parentClassName} = ${parentRequire}`);
  lines.push('');
  lines.push(`local ${skill.className} = class("${skill.className}", ${skill.parentClassName})`);
  lines.push('');

  // 属性
  for (const [key, val] of Object.entries(skill.properties)) {
    lines.push(`${skill.className}.${key} = ${luaVal(val)}`);
  }

  lines.push('');
  lines.push(`return ${skill.className}`);

  return lines.join('\n');
}

// ─── 技能数据生成 ────────────────────────────────────────────────────────────

function toClassName(name) {
  // 中文名 → PascalCase 英文类名 (使用拼音首字母或哈希)
  // 简化: 使用 "Skill_" + 数字编号
  return name;
}

function generatePrimaries() {
  const skills = [];
  let idOffset = 0;

  for (const form of PRIMARY_FORMS) {
    const elem = ELEMENTS[skills.length % ELEMENTS.length];
    for (let i = 0; i < form.count; i++) {
      const name = form.names[i];
      const elemIdx = i % ELEMENTS.length;
      const elem = ELEMENTS[elemIdx];
      const className = `Primary_${String(idOffset + 1).padStart(3, '0')}`;
      const assetId = BASE_ID + idOffset;

      const desc = form.descTpl
        .replace('{elem}', elem.desc)
        .replace('{Speed}', form.baseProps.speed || '')
        .replace('{radius}', form.baseProps.radius || '')
        .replace('{duration}', form.baseProps.duration || '')
        .replace('{tickInterval}', form.baseProps.tickInterval || '')
        .replace('{range}', form.baseProps.range || '')
        .replace('{arc}', form.baseProps.arc || '')
        .replace('{armTime}', form.baseProps.armTime || '')
        .replace('{triggerRadius}', form.baseProps.triggerRadius || '')
        .replace('{distance}', form.baseProps.distance || '');

      const props = {
        assetId: assetId,
        skillName: name,
        abilityType: 'none',
        formType: form.formType,
        releaseType: ['primary'],
        elementTypes: [elem.key],
        desc: desc,
        icon: `/Script/Engine.Texture2D'/Game/UI/SkillIcons/primary_${className}.primary_${className}'`,
        nativeClass: `/Script/AngelscriptCode.ASClass'/Script/Angelscript.${form.nativeClass}'`,
        assetPath: `/Game/DA/Primary/DA_${className}.DA_${className}`,
        callWords: `moba game icon, ${form.formType} ability, ${elem.key} element, ${name}`,
      };

      // 添加形态特定属性
      for (const [k, v] of Object.entries(form.baseProps)) {
        props[k] = v;
      }

      const parentClassName = form.formType === 'projectile' ? 'MagicBall' : 'MagicDefault';
      const parentClassPath = form.formType === 'projectile'
        ? 'MagicAsset.AsAsset.MagicAbility.MagicPrimary.MagicBall'
        : 'MagicAsset.AsAsset.MagicAbility.MagicDefault';

      skills.push({
        className,
        skillName: name,
        formType: form.formType,
        parentClassName,
        parentClassPath,
        subDir: 'MagicPrimary',
        properties: props,
      });
      idOffset++;
    }
  }
  return skills;
}

function generatePassives() {
  const skills = [];
  let idOffset = 0;

  for (const cat of PASSIVE_CATEGORIES) {
    for (let i = 0; i < cat.count; i++) {
      const name = cat.names[i];
      const className = `Passive_${String(idOffset + 1).padStart(3, '0')}`;
      const assetId = BASE_ID + 1000 + idOffset; // 被动从 +1000 开始

      const desc = cat.descTpl.replace('{name}', name);

      const props = {
        assetId: assetId,
        skillName: name,
        abilityType: 'passive',
        category: cat.category,
        releaseType: ['passive'],
        elementTypes: [],
        desc: desc,
        icon: `/Script/Engine.Texture2D'/Game/UI/SkillIcons/passive_${className}.passive_${className}'`,
        nativeClass: `/Script/AngelscriptCode.ASClass'/Script/Angelscript.MagicPassive'`,
        assetPath: `/Game/DA/Ability/DA_${className}.DA_${className}`,
        callWords: `moba game icon, passive stone, ${cat.category}, ${name}`,
      };

      // 注入分类特定的节点属性
      const nodeValues = resolveNodeProps(cat.nodeProps, i);
      for (const [k, v] of Object.entries(nodeValues)) {
        props[k] = v;
      }

      skills.push({
        className,
        skillName: name,
        category: cat.category,
        parentClassName: cat.parentClass,
        parentClassPath: 'MagicAsset.AsAsset.MagicAbility.MagicPassive.MagicPassive',
        subDir: `MagicPassive/${cat.category}`,
        properties: props,
      });
      idOffset++;
    }
  }
  return skills;
}

// ─── 写入文件 ────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeSkillFiles(skills) {
  let written = 0;
  for (const skill of skills) {
    // Content/Script 路径 (UE runtime)
    const contentDir = path.join(CONTENT_SCRIPT, skill.subDir);
    ensureDir(contentDir);
    const contentFile = path.join(contentDir, `${skill.className}.lua`);
    fs.writeFileSync(contentFile, generateLuaFile(skill, true), 'utf-8');

    // Script/ 路径 (mirror)
    const scriptDir = path.join(SCRIPT_DIR, skill.subDir);
    ensureDir(scriptDir);
    const scriptFile = path.join(scriptDir, `${skill.className}.lua`);
    fs.writeFileSync(scriptFile, generateLuaFile(skill, false), 'utf-8');

    written++;
  }
  return written;
}

function generateRegistry(primaries, passives) {
  const lines = [];
  lines.push('-- skill_registry.lua');
  lines.push('-- 技能注册表：加载所有技能类，按 assetId 索引');
  lines.push('-- 自动生成，请勿手动编辑（由 generate_skill_catalog.js 生成）');
  lines.push('');
  lines.push('local skill_registry = {}');
  lines.push('');
  lines.push('-- ── 加载所有技能实例 ──────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('local skill_modules = {');

  // 现有技能（保留原始 3 个主技能 + 14 个被动）
  lines.push('    -- ═══ 现有技能（保留） ═══');
  lines.push('    -- Primary (主技能)');
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPrimary.AbyssalFireRite'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPrimary.DeepSeaFrostSoul'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPrimary.HeavenlyThunder'),");
  lines.push('    -- Passive (被动技能)');
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.Bounce'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.SkyDrop'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.RingSplit'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.FireExplosion'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.MagicStraitBall.StraightShot'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.MagicStraitBall.CurveHoming'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.BounceBlast'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.Split'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.BounceScatter'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.SpiralTracking'),");
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.MagicPassive.Accelerate'),");
  lines.push('    -- Default (无效)');
  lines.push("    require('com.ability.node.MagicAsset.AsAsset.MagicAbility.VoidTablet'),");

  // 生成的主技能
  lines.push('');
  lines.push('    -- ═══ 生成的主技能 (100) ═══');
  for (const skill of primaries) {
    const reqPath = `com.ability.node.MagicAsset.AsAsset.MagicAbility.${skill.subDir}.${skill.className}`;
    lines.push(`    require('${reqPath}'),`);
  }

  // 生成的被动
  lines.push('');
  lines.push('    -- ═══ 生成的辅助石 (500) ═══');
  let lastCat = '';
  for (const skill of passives) {
    if (skill.category !== lastCat) {
      lines.push(`    -- ${skill.category}`);
      lastCat = skill.category;
    }
    const reqPath = `com.ability.node.MagicAsset.AsAsset.MagicAbility.${skill.subDir}.${skill.className}`;
    lines.push(`    require('${reqPath}'),`);
  }

  lines.push('}');
  lines.push('');
  lines.push('-- ── 按 assetId 构建索引 ──────────────────────────────────────────────────────');
  lines.push('');
  lines.push('local ability_map = {}');
  lines.push('local primary_ids = {}');
  lines.push('local passive_ids = {}');
  lines.push('');
  lines.push('for _, cls in ipairs(skill_modules) do');
  lines.push('    local id = cls.assetId');
  lines.push('    if id and id ~= 0 then');
  lines.push('        ability_map[id] = cls');
  lines.push('        local rt = cls.releaseType or {}');
  lines.push('        for _, t in ipairs(rt) do');
  lines.push("            if t == 'primary' then");
  lines.push('                table.insert(primary_ids, id)');
  lines.push('            end');
  lines.push("            if t == 'passive' then");
  lines.push('                table.insert(passive_ids, id)');
  lines.push('            end');
  lines.push('        end');
  lines.push('    end');
  lines.push('end');
  lines.push('');
  lines.push('-- ── 公共 API ────────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('function skill_registry.get(asset_id)');
  lines.push('    return ability_map[asset_id]');
  lines.push('end');
  lines.push('');
  lines.push('function skill_registry.get_primaries()');
  lines.push('    local result = {}');
  lines.push('    for _, id in ipairs(primary_ids) do');
  lines.push('        result[id] = ability_map[id]');
  lines.push('    end');
  lines.push('    return result');
  lines.push('end');
  lines.push('');
  lines.push('function skill_registry.get_passives()');
  lines.push('    local result = {}');
  lines.push('    for _, id in ipairs(passive_ids) do');
  lines.push('        result[id] = ability_map[id]');
  lines.push('    end');
  lines.push('    return result');
  lines.push('end');
  lines.push('');
  lines.push('function skill_registry.get_random_primary()');
  lines.push('    if #primary_ids == 0 then return 0 end');
  lines.push('    return primary_ids[math.random(1, #primary_ids)]');
  lines.push('end');
  lines.push('');
  lines.push('function skill_registry.get_all()');
  lines.push('    return ability_map');
  lines.push('end');
  lines.push('');
  lines.push('function skill_registry.has_release_type(asset_id, rtype)');
  lines.push('    local cls = ability_map[asset_id]');
  lines.push('    if not cls then return false end');
  lines.push('    for _, rt in ipairs(cls.releaseType or {}) do');
  lines.push('        if rt == rtype then return true end');
  lines.push('    end');
  lines.push('    return false');
  lines.push('end');
  lines.push('');
  lines.push('return skill_registry');

  return lines.join('\n');
}

// ─── JSON 目录导出 ────────────────────────────────────────────────────────────

function generateCatalogJSON(primaries, passives) {
  const catalog = {
    generated: new Date().toISOString(),
    primaryForms: PRIMARY_FORMS.map(f => ({
      formType: f.formType, count: f.count, nativeClass: f.nativeClass,
    })),
    passiveCategories: PASSIVE_CATEGORIES.map(c => ({
      category: c.category, count: c.count,
    })),
    elements: ELEMENTS,
    primaries: primaries.map(s => ({
      className: s.className,
      skillName: s.skillName,
      formType: s.formType,
      assetId: s.properties.assetId,
      elementTypes: s.properties.elementTypes,
      desc: s.properties.desc,
      callWords: s.properties.callWords,
      ...Object.fromEntries(
        Object.entries(s.properties).filter(([k]) =>
          !['assetId','skillName','abilityType','formType','releaseType','elementTypes',
            'desc','icon','nativeClass','assetPath','callWords'].includes(k)
        )
      ),
    })),
    passives: passives.map(s => {
      // Extract node-specific props (exclude standard metadata)
      const stdKeys = new Set(['assetId','skillName','abilityType','category','releaseType',
        'elementTypes','desc','icon','nativeClass','assetPath','callWords']);
      const nodeProps = {};
      for (const [k,v] of Object.entries(s.properties)) {
        if (!stdKeys.has(k)) nodeProps[k] = v;
      }
      return {
        className: s.className,
        skillName: s.skillName,
        category: s.category,
        assetId: s.properties.assetId,
        desc: s.properties.desc,
        callWords: s.properties.callWords,
        nodeProps,
      };
    }),
  };
  return JSON.stringify(catalog, null, 2);
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

function main() {
  console.log('=== 技能目录生成器 ===');
  console.log('');

  // 生成数据
  const primaries = generatePrimaries();
  console.log(`生成主技能: ${primaries.length} 个`);

  const passives = generatePassives();
  console.log(`生成辅助石: ${passives.length} 个`);

  // 检查 ID 碰撞
  const allIds = new Set();
  let collision = false;
  for (const s of [...primaries, ...passives]) {
    if (allIds.has(s.properties.assetId)) {
      console.error(`ID 碰撞: ${s.properties.assetId} (${s.skillName})`);
      collision = true;
    }
    allIds.add(s.properties.assetId);
  }
  if (collision) {
    console.error('存在 ID 碰撞，中止生成');
    process.exit(1);
  }
  console.log(`ID 唯一性检查通过 (${allIds.size} 个唯一 ID)`);
  console.log('');

  // 写入文件
  console.log('写入 Lua 文件...');
  const primaryCount = writeSkillFiles(primaries);
  console.log(`  主技能: ${primaryCount} 个文件`);

  const passiveCount = writeSkillFiles(passives);
  console.log(`  辅助石: ${passiveCount} 个文件`);

  // 写入注册表
  console.log('写入 skill_registry.lua...');
  const registry = generateRegistry(primaries, passives);
  fs.writeFileSync(REGISTRY_PATH, registry, 'utf-8');
  console.log('  完成');

  // 写入 JSON 目录
  console.log('写入 skill-catalog.json...');
  fs.writeFileSync(CATALOG_JSON, generateCatalogJSON(primaries, passives), 'utf-8');
  console.log('  完成');

  console.log('');
  console.log(`=== 总计: ${primaries.length + passives.length} 个技能 ===`);
  console.log(`  主技能: ${primaries.length} (${PRIMARY_FORMS.map(f => `${f.formType}:${f.count}`).join(', ')})`);
  console.log(`  辅助石: ${passives.length} (${PASSIVE_CATEGORIES.map(c => `${c.category}:${c.count}`).join(', ')})`);
}

main();
