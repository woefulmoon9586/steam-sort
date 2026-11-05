import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');
const POPULAR_GAMES_FILE = path.join(CACHE_DIR, 'popular_games.json');
const DYNAMIC_CACHE_FILE = path.join(CACHE_DIR, 'metadata_cache.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// In-memory cache
let metadataCache = {};

// Load popular games
if (fs.existsSync(POPULAR_GAMES_FILE)) {
  try {
    const raw = fs.readFileSync(POPULAR_GAMES_FILE, 'utf8');
    metadataCache = { ...metadataCache, ...JSON.parse(raw) };
  } catch {}
}

// Load dynamic cache
if (fs.existsSync(DYNAMIC_CACHE_FILE)) {
  try {
    const raw = fs.readFileSync(DYNAMIC_CACHE_FILE, 'utf8');
    metadataCache = { ...metadataCache, ...JSON.parse(raw) };
  } catch {}
}

function saveDynamicCache() {
  try {
    fs.writeFileSync(DYNAMIC_CACHE_FILE, JSON.stringify(metadataCache, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save dynamic metadata cache:', e.message);
  }
}

/**
 * Fetch raw appdetails from Steam Store API
 */
function fetchSteamStoreDetails(appid) {
  return new Promise((resolve) => {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=schinese&cc=cn`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 6000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed[appid] && parsed[appid].success) {
            resolve(parsed[appid].data);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Fetch top tags from SteamSpy API
 */
function fetchSteamSpyTags(appid) {
  return new Promise((resolve) => {
    const url = `https://steamspy.com/api.php?request=appdetails&appid=${appid}`;
    const req = https.get(url, {
      headers: { 'User-Agent': 'SteamSort/1.0' },
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.tags) {
            resolve({
              tags: Object.keys(parsed.tags),
              positive: parsed.positive || 0,
              negative: parsed.negative || 0,
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Get or fetch metadata for a single game
 */
export async function getGameMetadata(appid, fallbackName = '') {
  const strId = String(appid);
  if (metadataCache[strId]) {
    return {
      appid: parseInt(appid, 10),
      ...metadataCache[strId],
    };
  }

  // Fetch from Steam Store
  const storeData = await fetchSteamStoreDetails(appid);
  let spyData = null;
  if (!storeData) {
    spyData = await fetchSteamSpyTags(appid);
  }

  const genres = storeData?.genres?.map(g => g.description) || [];
  const categories = storeData?.categories?.map(c => c.description) || [];
  const tags = spyData?.tags || [];

  const metadata = {
    name: storeData?.name || fallbackName || `App ${appid}`,
    type: storeData?.type || 'game',
    genres,
    categories,
    tags,
    header_image: storeData?.header_image || `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
    short_description: storeData?.short_description || '',
    release_date: storeData?.release_date?.date || '',
    is_free: storeData?.is_free || false,
    positive: spyData?.positive || 0,
    negative: spyData?.negative || 0,
  };

  metadataCache[strId] = metadata;
  return {
    appid: parseInt(appid, 10),
    ...metadata,
  };
}

/**
 * Batch enrich a list of games with metadata
 */
export async function batchEnrichGames(games, onProgress = null) {
  const concurrency = 4;
  let completed = 0;
  const total = games.length;
  let dirty = false;

  const results = [];

  for (let i = 0; i < games.length; i += concurrency) {
    const chunk = games.slice(i, i + concurrency);
    const promises = chunk.map(async (g) => {
      const strId = String(g.appid);
      const isCached = Boolean(metadataCache[strId]);
      const meta = await getGameMetadata(g.appid, g.name);
      if (!isCached) dirty = true;
      completed++;
      if (onProgress) {
        onProgress({
          completed,
          total,
          percent: Math.round((completed / total) * 100),
          currentApp: meta.name || g.name,
        });
      }
      return {
        ...g,
        name: (meta.name && !meta.name.startsWith('App ')) ? meta.name : g.name,
        genres: meta.genres || [],
        categories: meta.categories || [],
        tags: meta.tags || [],
        header_image: meta.header_image || g.header_image,
        type: meta.type || 'game',
        is_free: meta.is_free,
        positive: meta.positive,
        negative: meta.negative,
      };
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);

    // Save cache periodically
    if (dirty && i % 20 === 0) {
      saveDynamicCache();
      dirty = false;
    }

    // Small delay between network batches to be polite to Steam servers
    if (chunk.some(g => !metadataCache[String(g.appid)])) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (dirty) {
    saveDynamicCache();
  }

  return results;
}
