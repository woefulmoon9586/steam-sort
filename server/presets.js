/**
 * Built-in Categorization Presets
 */

export const PRESET_CATEGORIES = {
  // Preset Group 1: 核心游戏品类
  genres: {
    id: 'genres',
    name: '🎮 核心游戏品类',
    description: '按主流游戏类型（RPG、动作、策略、射击、肉鸽等）进行精准分类',
    defaultEnabled: true,
    rules: [
      {
        id: 'rpg',
        name: '⚔️ 角色扮演',
        keywords: ['角色扮演', 'rpg', 'jrpg', 'crpg', 'action rpg'],
      },
      {
        id: 'action_adventure',
        name: '💥 动作冒险',
        keywords: ['动作', '冒险', 'action', 'adventure', 'hack and slash', 'fighting', 'beat \'em up'],
      },
      {
        id: 'shooter',
        name: '🔫 射击枪战',
        keywords: ['射击', 'fps', 'tps', 'shooter', 'first-person shooter', 'third-person shooter', 'tactical shooter', 'battle royale'],
      },
      {
        id: 'strategy',
        name: '🧠 策略战棋',
        keywords: ['策略', 'strategy', 'turn-based strategy', 'rts', '4x', 'grand strategy', 'tactical rpg', 'tower defense'],
      },
      {
        id: 'sim_management',
        name: '🚜 模拟经营',
        keywords: ['模拟', 'simulation', 'management', 'colony sim', 'city builder', 'farming sim', 'life sim', 'building', 'sandbox'],
      },
      {
        id: 'roguelike_card',
        name: '🎲 肉鸽卡牌',
        keywords: ['roguelike', 'roguelite', 'action roguelike', 'deckbuilder', 'card battler', 'card game', '肉鸽'],
      },
      {
        id: 'puzzle_platformer',
        name: '🧩 解谜平台',
        keywords: ['解谜', 'puzzle', 'platformer', 'metroidvania', 'precision platformer', '2d platformer', '3d platformer'],
      },
      {
        id: 'racing_sports',
        name: '🏎️ 竞速体育',
        keywords: ['竞速', '体育', 'racing', 'sports', 'driving', 'automobile sim', 'football', 'basketball'],
      },
      {
        id: 'horror_survival',
        name: '👻 恐怖生存',
        keywords: ['恐怖', 'horror', 'survival horror', 'psychological horror', 'survival', 'zombies'],
      },
      {
        id: 'visual_novel',
        name: '📖 视觉小说与叙事',
        keywords: ['视觉小说', 'visual novel', 'interactive fiction', 'story rich', 'narrative', 'choices matter', 'anime'],
      },
      {
        id: 'tools_software',
        name: '🛠️ 软件与工具',
        keywords: ['实用工具', 'utilities', 'software', 'animation & modeling', 'design & illustration', 'audio production', 'video production', 'tool'],
      },
    ],
  },

  // Preset Group 2: 游玩方式与支持
  playmodes: {
    id: 'playmodes',
    name: '👥 游玩方式与支持',
    description: '区分单人沉浸、联机合作开黑、本地双人同屏以及手柄支持',
    defaultEnabled: true,
    rules: [
      {
        id: 'singleplayer',
        name: '👤 单人沉浸',
        modeMatch: 'singleplayer',
      },
      {
        id: 'online_coop',
        name: '👥 联机开黑/合作',
        modeMatch: 'coop_multiplayer',
      },
      {
        id: 'local_coop',
        name: '🛋️ 本地同屏双人',
        modeMatch: 'local_coop',
      },
      {
        id: 'controller_full',
        name: '🎮 完美支持手柄',
        modeMatch: 'controller',
      },
      {
        id: 'family_shared',
        name: '👨‍👩‍👧‍👦 家庭共享库',
        familyMatch: true,
      },
    ],
  },

  // Preset Group 3: 热门特色题材
  themes: {
    id: 'themes',
    name: '🌟 热门特色题材',
    description: '细分开放世界、类魂受死、像素复古、赛博朋克、休闲治愈等特色风格',
    defaultEnabled: false,
    rules: [
      {
        id: 'souls_like',
        name: '💀 类魂高难受死',
        keywords: ['souls-like', 'soulslike', 'dark fantasy', 'difficult'],
      },
      {
        id: 'open_world',
        name: '🗺️ 开放世界',
        keywords: ['open world', 'open-world', 'open world survival craft'],
      },
      {
        id: 'pixel_retro',
        name: '👾 像素复古',
        keywords: ['pixel graphics', 'retro', 'pixel art'],
      },
      {
        id: 'cozy_relaxing',
        name: '☕ 休闲治愈放松',
        keywords: ['relaxing', 'cozy', 'wholesome', 'casual'],
      },
      {
        id: 'scifi_cyberpunk',
        name: '🤖 科幻赛博朋克',
        keywords: ['cyberpunk', 'sci-fi', 'scifi', 'space', 'futuristic'],
      },
    ],
  },

  // Preset Group 4: 库存消化与时长
  status: {
    id: 'status',
    name: '⏳ 库存消化与状态',
    description: '根据游玩时长自动整理待开坑、正在游玩与深度通关游戏',
    defaultEnabled: false,
    rules: [
      {
        id: 'status_mastered',
        name: '🏆 深度沉迷 (50h+)',
        statusMatch: 'mastered', // >= 50h
      },
      {
        id: 'status_playing',
        name: '⏳ 正在游玩 (10-50h)',
        statusMatch: 'playing', // 10h - 50h
      },
      {
        id: 'status_brief',
        name: '🔍 浅尝辄止 (0-10h)',
        statusMatch: 'brief', // 5分钟 - 10小时 (含 0.x 小时)
      },
      {
        id: 'status_unplayed',
        name: '📦 待开坑库存 (0h / 未玩)',
        statusMatch: 'unplayed', // <= 5分钟 (从未运行)
      },
    ],
  },

  // Preset Group 5: 好评口碑
  reviews: {
    id: 'reviews',
    name: '🔥 好评口碑',
    description: '根据玩家好评率分类（好评如潮 95%+、特别好评 80-95%）',
    defaultEnabled: false,
    rules: [
      {
        id: 'review_overwhelming',
        name: '🔥 好评如潮 (95%+)',
        reviewMatch: 'overwhelming',
      },
      {
        id: 'review_very_positive',
        name: '⭐ 特别好评 (80-94%)',
        reviewMatch: 'very_positive',
      },
    ],
  },
};
