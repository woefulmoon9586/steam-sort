import { PRESET_CATEGORIES } from './presets.js';

/**
 * Check if a game matches a keyword-based rule
 */
function matchKeywords(game, keywords) {
  if (!keywords || keywords.length === 0) return 0;

  const gameGenres = (game.genres || []).map(g => g.toLowerCase().trim());
  const gameCategories = (game.categories || []).map(c => c.toLowerCase().trim());
  const gameTags = (game.tags || []).map(t => t.toLowerCase().trim());
  const gameName = (game.name || '').toLowerCase();

  let score = 0;

  for (const kw of keywords) {
    const lkw = kw.toLowerCase().trim();

    // 1. Genre match (e.g. game has genre "角色扮演" or "RPG")
    // Match if genre equals keyword, or genre contains keyword (e.g. genre "Action RPG" contains "rpg")
    if (gameGenres.some(g => g === lkw || g.includes(lkw))) {
      score += 6;
    }

    // 2. User tag match (e.g. Steam tag is "Roguelike", "Souls-like", "FPS")
    if (gameTags.some(t => t === lkw || t.includes(lkw))) {
      score += 5;
    }

    // 3. Category match
    if (gameCategories.some(c => c === lkw || c.includes(lkw))) {
      score += 3;
    }

    // 4. Name match (only if keyword is at least 3 characters)
    if (lkw.length >= 3 && gameName.includes(lkw)) {
      score += 2;
    }
  }

  return score;
}

/**
 * Check if a game matches a playmode rule
 */
function matchPlaymode(game, modeMatch) {
  const categories = (game.categories || []).map(c => c.toLowerCase());
  const tags = (game.tags || []).map(t => t.toLowerCase());

  switch (modeMatch) {
    case 'singleplayer':
      if (categories.some(c => c.includes('单人') || c.includes('single-player'))) {
        return 10;
      }
      return 0;

    case 'coop_multiplayer':
      if (
        categories.some(c => c.includes('多人') || c.includes('合作') || c.includes('联机') || c.includes('multi-player') || c.includes('co-op')) ||
        tags.some(t => t.includes('multiplayer') || t.includes('co-op') || t.includes('online co-op'))
      ) {
        return 10;
      }
      return 0;

    case 'local_coop':
      if (
        categories.some(c => c.includes('同屏') || c.includes('分屏') || c.includes('shared/split screen') || c.includes('local co-op')) ||
        tags.some(t => t.includes('local multiplayer') || t.includes('local co-op') || t.includes('split screen'))
      ) {
        return 10;
      }
      return 0;

    case 'controller':
      if (categories.some(c => c.includes('完全支持控制器') || c.includes('full controller support'))) {
        return 10;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * Check if a game matches status (playtime)
 */
function matchStatus(game, statusMatch) {
  const minutes = typeof game.playtimeMinutes === 'number'
    ? game.playtimeMinutes
    : (game.playtimeHours ? game.playtimeHours * 60 : 0);
  const hours = typeof game.playtimeHours === 'number' && game.playtimeHours > 0
    ? game.playtimeHours
    : (minutes / 60);

  switch (statusMatch) {
    case 'mastered':
      return hours >= 50 ? 10 : 0;
    case 'playing':
      return hours >= 10 && hours < 50 ? 10 : 0;
    case 'brief':
      // 游玩超过5分钟，但少于10小时（完整覆盖 0.1h ~ 9.9h，包括零点几小时的游戏）
      return minutes > 5 && hours < 10 ? 10 : 0;
    case 'unplayed':
      // 0分钟或少于5分钟（未真正游玩/未运行的待开坑游戏）
      return minutes <= 5 ? 10 : 0;
    default:
      return 0;
  }
}

/**
 * Check if a game matches review ratings
 */
function matchReview(game, reviewMatch) {
  const pos = game.positive || 0;
  const neg = game.negative || 0;
  const total = pos + neg;
  if (total < 50) return 0; // Need minimum reviews

  const ratio = (pos / total) * 100;
  switch (reviewMatch) {
    case 'overwhelming':
      return ratio >= 95 ? 10 : 0;
    case 'very_positive':
      return ratio >= 80 && ratio < 95 ? 10 : 0;
    default:
      return 0;
  }
}

/**
 * Generate collections from games based on options
 */
export function categorizeGames(games, options = {}) {
  const {
    enabledPresetGroups = ['genres', 'playmodes'],
    allowMultiple = true,
    minGamesPerCollection = 1,
    customRules = [],
  } = options;

  // Gather active rules
  const activeRules = [];

  for (const groupId of enabledPresetGroups) {
    const group = PRESET_CATEGORIES[groupId];
    if (group && group.rules) {
      for (const rule of group.rules) {
        activeRules.push({
          ...rule,
          groupId,
          collectionId: `uc-sort-${rule.id}`,
        });
      }
    }
  }

  // Add custom rules
  for (const cr of customRules) {
    activeRules.push({
      ...cr,
      groupId: 'custom',
      collectionId: cr.id ? `uc-sort-${cr.id}` : `uc-sort-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    });
  }

  // Map collectionId -> Set of appids
  const collectionAppMap = new Map();
  for (const rule of activeRules) {
    collectionAppMap.set(rule.collectionId, new Set());
  }

  const assignedGames = new Set();

  // Evaluate each game
  for (const game of games) {
    const matchedRules = [];

    for (const rule of activeRules) {
      let score = 0;
      if (rule.keywords) {
        score += matchKeywords(game, rule.keywords);
      }
      if (rule.modeMatch) {
        score += matchPlaymode(game, rule.modeMatch);
      }
      if (rule.statusMatch) {
        score += matchStatus(game, rule.statusMatch);
      }
      if (rule.reviewMatch) {
        score += matchReview(game, rule.reviewMatch);
      }
      if (rule.familyMatch && game.isFamily) {
        score += 10;
      }

      if (score > 0) {
        matchedRules.push({ rule, score });
      }
    }

    if (matchedRules.length > 0) {
      assignedGames.add(game.appid);

      if (allowMultiple) {
        for (const m of matchedRules) {
          collectionAppMap.get(m.rule.collectionId).add(game.appid);
        }
      } else {
        // Sort by score descending and take highest
        matchedRules.sort((a, b) => b.score - a.score);
        collectionAppMap.get(matchedRules[0].rule.collectionId).add(game.appid);
      }
    }
  }

  // Build final collection objects
  const gameMap = new Map(games.map(g => [g.appid, g]));
  const collections = [];

  for (const rule of activeRules) {
    const appSet = collectionAppMap.get(rule.collectionId) || new Set();
    const appIds = Array.from(appSet);

    if (appIds.length >= minGamesPerCollection) {
      collections.push({
        id: rule.collectionId,
        name: rule.name,
        groupId: rule.groupId,
        added: appIds,
        removed: [],
        games: appIds.map(id => gameMap.get(id)).filter(Boolean),
        gameCount: appIds.length,
      });
    }
  }

  // Uncategorized games
  const uncategorized = games.filter(g => !assignedGames.has(g.appid));

  return {
    collections,
    uncategorized,
    totalGames: games.length,
    categorizedCount: assignedGames.size,
    uncategorizedCount: uncategorized.length,
  };
}
