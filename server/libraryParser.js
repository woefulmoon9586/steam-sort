import fs from 'fs';
import path from 'path';
import https from 'https';
import { parseVDF } from './vdfParser.js';
import { getLibraryFolders } from './steamDetector.js';

/**
 * Scan all installed games from appmanifest_*.acf
 */
export function getInstalledGames(steamPath) {
  const libraryFolders = getLibraryFolders(steamPath);
  const gamesMap = new Map();

  for (const libPath of libraryFolders) {
    const steamappsDir = path.join(libPath, 'steamapps');
    if (!fs.existsSync(steamappsDir)) continue;

    try {
      const files = fs.readdirSync(steamappsDir);
      for (const file of files) {
        if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
          const filePath = path.join(steamappsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = parseVDF(content);
            const state = parsed.AppState || parsed.appstate || {};
            const appid = parseInt(state.appid || state.AppId, 10);
            if (!appid || isNaN(appid)) continue;

            const name = state.name || `App ${appid}`;
            const installdir = state.installdir || '';
            const sizeOnDisk = parseInt(state.SizeOnDisk || '0', 10);

            gamesMap.set(appid, {
              appid,
              name,
              installed: true,
              installdir,
              sizeOnDisk,
              libraryPath: libPath,
            });
          } catch {}
        }
      }
    } catch {}
  }

  return Array.from(gamesMap.values());
}

/**
 * Read games and playtime from localconfig.vdf
 */
export function getLocalConfigGames(steamPath, accountId) {
  const localConfigFile = path.join(steamPath, 'userdata', accountId, 'config', 'localconfig.vdf');
  if (!fs.existsSync(localConfigFile)) {
    return [];
  }

  const results = [];
  try {
    const content = fs.readFileSync(localConfigFile, 'utf8');
    const appsIdx = content.indexOf('"apps"');
    if (appsIdx !== -1) {
      let depth = 0;
      let startIdx = content.indexOf('{', appsIdx);
      let endIdx = -1;
      for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }

      if (endIdx !== -1) {
        const appsBlock = content.slice(startIdx, endIdx);
        const appMatches = [...appsBlock.matchAll(/"(\d+)"\s*\{([^}]*)\}/g)];
        for (const m of appMatches) {
          const appid = parseInt(m[1], 10);
          if (!appid || isNaN(appid)) continue;

          // Parse Playtime and LastPlayed
          const inner = m[2];
          const playtimeMatch = inner.match(/"Playtime"\s*"(\d+)"/i);
          const lastPlayedMatch = inner.match(/"LastPlayed"\s*"(\d+)"/i);

          const playtimeMinutes = playtimeMatch ? parseInt(playtimeMatch[1], 10) : 0;
          const lastPlayed = lastPlayedMatch ? parseInt(lastPlayedMatch[1], 10) : 0;

          results.push({
            appid,
            playtimeMinutes,
            playtimeHours: Math.round((playtimeMinutes / 60) * 10) / 10,
            lastPlayed,
          });
        }
      }
    }
  } catch {}

  return results;
}

/**
 * Read existing collections from cloud-storage-namespace-1.json
 */
export function getExistingCollections(steamPath, accountId) {
  const cloudStorageFile = path.join(
    steamPath,
    'userdata',
    accountId,
    'config',
    'cloudstorage',
    'cloud-storage-namespace-1.json'
  );

  if (!fs.existsSync(cloudStorageFile)) {
    return { collections: [], referencedAppIds: [] };
  }

  const collections = [];
  const referencedAppIds = new Set();

  try {
    const raw = fs.readFileSync(cloudStorageFile, 'utf8');
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      for (const item of data) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const key = item[0];
        const valObj = item[1];

        // Track apps from NewContentRollup_*
        if (key.startsWith('NewContentRollup_')) {
          const appid = parseInt(key.replace('NewContentRollup_', ''), 10);
          if (appid) referencedAppIds.add(appid);
        }

        // Track collections
        if (key.startsWith('user-collections.')) {
          try {
            const parsedVal = JSON.parse(valObj.value);
            const added = Array.isArray(parsedVal.added) ? parsedVal.added : [];
            const removed = Array.isArray(parsedVal.removed) ? parsedVal.removed : [];

            for (const id of added) {
              const numId = parseInt(id, 10);
              if (numId) referencedAppIds.add(numId);
            }

            collections.push({
              key,
              id: parsedVal.id || key.replace('user-collections.', ''),
              name: parsedVal.name || '未命名分类',
              added,
              removed,
              isSystem: parsedVal.id === 'favorite' || parsedVal.id === 'hidden',
              isGenerated: (parsedVal.id || '').startsWith('uc-sort-') || (parsedVal.id || '').startsWith('steamsort-'),
            });
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse cloud-storage-namespace-1.json:', err.message);
  }

  return {
    collections,
    referencedAppIds: Array.from(referencedAppIds),
  };
}

/**
 * Fetch all owned games via Steam Web API
 */
export function fetchOwnedGamesFromSteamAPI(apiKey, steamId64) {
  return new Promise((resolve, reject) => {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId64}&include_appinfo=1&include_played_free_games=1&format=json`;
    https.get(url, { headers: { 'User-Agent': 'SteamSort/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const games = parsed.response?.games || [];
          resolve(games.map(g => ({
            appid: g.appid,
            name: g.name,
            playtimeMinutes: g.playtime_forever || 0,
            playtimeHours: Math.round(((g.playtime_forever || 0) / 60) * 10) / 10,
            header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
          })));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Scan all unique AppIDs from librarycache files (Steam Families / Family Sharing cache)
 */
export function getLibraryCacheGames(steamPath, accountId, includeOtherAccounts = true) {
  const gamesMap = new Map();

  // 1. Scan target account's librarycache directory
  const targetCacheDir = path.join(steamPath, 'userdata', accountId, 'config', 'librarycache');
  if (fs.existsSync(targetCacheDir)) {
    try {
      const files = fs.readdirSync(targetCacheDir);
      for (const f of files) {
        const m = f.match(/^(\d+)\.json$/);
        if (m) {
          const appid = parseInt(m[1], 10);
          if (appid) {
            gamesMap.set(appid, {
              appid,
              isFamily: true,
            });
          }
        }
      }
    } catch {}
  }

  // 2. Scan other accounts in userdata for shared family games on the same PC
  if (includeOtherAccounts) {
    const userdataDir = path.join(steamPath, 'userdata');
    if (fs.existsSync(userdataDir)) {
      try {
        const accounts = fs.readdirSync(userdataDir);
        for (const acc of accounts) {
          if (acc !== accountId && /^\d+$/.test(acc)) {
            const accCacheDir = path.join(userdataDir, acc, 'config', 'librarycache');
            if (fs.existsSync(accCacheDir)) {
              try {
                const files = fs.readdirSync(accCacheDir);
                for (const f of files) {
                  const m = f.match(/^(\d+)\.json$/);
                  if (m) {
                    const appid = parseInt(m[1], 10);
                    if (appid && !gamesMap.has(appid)) {
                      gamesMap.set(appid, {
                        appid,
                        isFamily: true,
                      });
                    }
                  }
                }
              } catch {}
            }
          }
        }
      } catch {}
    }
  }

  return Array.from(gamesMap.values());
}

/**
 * Scan all AppIDs from localconfig.vdf (including controller configs, cloud sync, etc.)
 */
export function getAllLocalConfigAppIds(steamPath, accountId) {
  const localConfigFile = path.join(steamPath, 'userdata', accountId, 'config', 'localconfig.vdf');
  if (!fs.existsSync(localConfigFile)) return [];
  const appids = new Set();
  try {
    const content = fs.readFileSync(localConfigFile, 'utf8');
    for (const m of content.matchAll(/"(\d{3,9})"\s*\{/g)) {
      appids.add(parseInt(m[1], 10));
    }
  } catch {}
  return Array.from(appids);
}

/**
 * Parse modern Steam appinfo.vdf (v28 / v29) to extract all cached applications and metadata
 */
export function parseAppInfo(steamPath) {
  const appInfoPath = path.join(steamPath, 'appcache', 'appinfo.vdf');
  if (!fs.existsSync(appInfoPath)) return new Map();

  try {
    const buf = fs.readFileSync(appInfoPath);
    if (buf.length < 16) return new Map();

    const stringTableOffset = Number(buf.readBigUInt64LE(8));
    if (stringTableOffset >= buf.length) return new Map();

    const stBuf = buf.slice(stringTableOffset);
    const numStrings = stBuf.readUInt32LE(0);
    const stringTable = [];
    let stPos = 4;
    for (let i = 0; i < numStrings; i++) {
      const end = stBuf.indexOf(0, stPos);
      if (end === -1) break;
      stringTable.push(stBuf.slice(stPos, end).toString('utf8'));
      stPos = end + 1;
    }

    let offset = 16;
    const appMap = new Map();

    while (offset < stringTableOffset) {
      if (offset + 68 > stringTableOffset) break;
      const appid = buf.readUInt32LE(offset);
      if (appid === 0) break;
      const size = buf.readUInt32LE(offset + 4);
      const dataEnd = offset + size + 8;

      let name = '';
      let type = '';

      let pos = offset + 68;
      while (pos < dataEnd) {
        const typeByte = buf[pos];
        if (typeByte === 0x08) {
          pos += 1;
          continue;
        }
        if (typeByte === undefined || pos + 5 > dataEnd) break;

        pos += 1;
        const keyIdx = buf.readUInt32LE(pos);
        pos += 4;
        const key = stringTable[keyIdx] || '';

        if (typeByte === 0x00) {
          continue;
        } else if (typeByte === 0x01) {
          const strEnd = buf.indexOf(0, pos);
          if (strEnd === -1 || strEnd > dataEnd) break;
          const val = buf.slice(pos, strEnd).toString('utf8');
          pos = strEnd + 1;
          if (key === 'name' && !name) name = val;
          if (key === 'type' && !type) type = val;
        } else if (typeByte === 0x02) {
          pos += 4;
        } else if (typeByte === 0x07) {
          pos += 8;
        } else {
          break;
        }
      }

      appMap.set(appid, { appid, name, type });
      offset = dataEnd;
    }

    return appMap;
  } catch (err) {
    console.error('Failed to parse appinfo.vdf:', err.message);
    return new Map();
  }
}

/**
 * Parse modern Steam packageinfo.vdf to extract all package-licensed AppIDs (including Steam Families licenses)
 */
export function parsePackageInfo(steamPath) {
  const pkgInfoPath = path.join(steamPath, 'appcache', 'packageinfo.vdf');
  if (!fs.existsSync(pkgInfoPath)) return new Set();

  try {
    const buf = fs.readFileSync(pkgInfoPath);
    if (buf.length < 36) return new Set();

    let offset = 8;
    const pkgAppIds = new Set();

    function readBinaryVDF(buffer, start) {
      let pos = start;
      function parseObject() {
        const obj = {};
        while (pos < buffer.length) {
          const type = buffer[pos++];
          if (type === 0x08) break;
          const keyStart = pos;
          while (pos < buffer.length && buffer[pos] !== 0) pos++;
          const key = buffer.slice(keyStart, pos++).toString('utf8');
          if (type === 0x00) {
            obj[key] = parseObject();
          } else if (type === 0x01) {
            const valStart = pos;
            while (pos < buffer.length && buffer[pos] !== 0) pos++;
            obj[key] = buffer.slice(valStart, pos++).toString('utf8');
          } else if (type === 0x02) {
            obj[key] = buffer.readInt32LE(pos);
            pos += 4;
          } else if (type === 0x07) {
            obj[key] = buffer.readBigUInt64LE(pos);
            pos += 8;
          } else {
            break;
          }
        }
        return obj;
      }
      const root = parseObject();
      return { root, end: pos };
    }

    while (offset < buf.length - 36) {
      const subid = buf.readUInt32LE(offset);
      if (subid === 0xffffffff) break;
      offset += 36;
      const { root, end } = readBinaryVDF(buf, offset);
      offset = end;
      for (const k of Object.keys(root)) {
        const pkg = root[k];
        if (pkg && pkg.appids) {
          for (const ak of Object.keys(pkg.appids)) {
            const aid = pkg.appids[ak];
            if (typeof aid === 'number' && aid > 0) {
              pkgAppIds.add(aid);
            }
          }
        }
      }
    }

    return pkgAppIds;
  } catch (err) {
    console.error('Failed to parse packageinfo.vdf:', err.message);
    return new Set();
  }
}

/**
 * Combine all sources to produce unified game library list for the selected account
 */
export async function getUnifiedLibrary(steamPath, accountId, customGames = null, options = {}) {
  const { includeFamily = true } = options;
  const installedGames = getInstalledGames(steamPath);
  const localConfigGames = getLocalConfigGames(steamPath, accountId);
  const allLocalAppIds = getAllLocalConfigAppIds(steamPath, accountId);
  const { collections, referencedAppIds } = getExistingCollections(steamPath, accountId);
  const familyCacheGames = includeFamily ? getLibraryCacheGames(steamPath, accountId, true) : [];
  const appInfoMap = parseAppInfo(steamPath);
  const pkgAppIds = includeFamily ? parsePackageInfo(steamPath) : new Set();

  const libraryMap = new Map();

  // 1. Add all installed games
  for (const g of installedGames) {
    libraryMap.set(g.appid, {
      appid: g.appid,
      name: g.name,
      installed: true,
      isFamily: false,
      playtimeMinutes: 0,
      playtimeHours: 0,
      lastPlayed: 0,
      header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
    });
  }

  // 2. Add / enrich with localconfig games
  for (const g of localConfigGames) {
    if (libraryMap.has(g.appid)) {
      const existing = libraryMap.get(g.appid);
      existing.playtimeMinutes = g.playtimeMinutes;
      existing.playtimeHours = g.playtimeHours;
      existing.lastPlayed = g.lastPlayed;
    } else {
      libraryMap.set(g.appid, {
        appid: g.appid,
        name: `App ${g.appid}`,
        installed: false,
        isFamily: false,
        playtimeMinutes: g.playtimeMinutes,
        playtimeHours: g.playtimeHours,
        lastPlayed: g.lastPlayed,
        header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
      });
    }
  }

  // 3. Add other apps tracked in localconfig.vdf
  for (const appid of allLocalAppIds) {
    if (!libraryMap.has(appid)) {
      libraryMap.set(appid, {
        appid,
        name: `App ${appid}`,
        installed: false,
        isFamily: false,
        playtimeMinutes: 0,
        playtimeHours: 0,
        lastPlayed: 0,
        header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
      });
    }
  }

  // 4. Add apps found in cloud-storage (NewContentRollup or existing collections)
  for (const appid of referencedAppIds) {
    if (!libraryMap.has(appid)) {
      libraryMap.set(appid, {
        appid,
        name: `App ${appid}`,
        installed: false,
        isFamily: false,
        playtimeMinutes: 0,
        playtimeHours: 0,
        lastPlayed: 0,
        header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
      });
    }
  }

  // 5. Add Family Sharing / Steam Families games from librarycache
  for (const g of familyCacheGames) {
    if (libraryMap.has(g.appid)) {
      const existing = libraryMap.get(g.appid);
      if (!existing.installed && existing.playtimeHours === 0) {
        existing.isFamily = true;
      }
    } else {
      libraryMap.set(g.appid, {
        appid: g.appid,
        name: `App ${g.appid}`,
        installed: false,
        isFamily: true,
        playtimeMinutes: 0,
        playtimeHours: 0,
        lastPlayed: 0,
        header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
      });
    }
  }

  // 6. Add games from packageinfo.vdf (Steam Families and owned licenses)
  if (includeFamily) {
    for (const appid of pkgAppIds) {
      if (!libraryMap.has(appid)) {
        libraryMap.set(appid, {
          appid,
          name: `App ${appid}`,
          installed: false,
          isFamily: true,
          playtimeMinutes: 0,
          playtimeHours: 0,
          lastPlayed: 0,
          header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
        });
      }
    }

    // 7. Add all games/applications from appinfo.vdf
    for (const [appid, info] of appInfoMap.entries()) {
      const t = (info.type || '').toLowerCase();
      if (t === 'game' || t === 'application') {
        if (!libraryMap.has(appid)) {
          libraryMap.set(appid, {
            appid,
            name: info.name || `App ${appid}`,
            installed: false,
            isFamily: true,
            playtimeMinutes: 0,
            playtimeHours: 0,
            lastPlayed: 0,
            header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
          });
        }
      }
    }
  }

  // 8. Merge custom games if fetched from Steam Web API
  if (Array.isArray(customGames)) {
    for (const g of customGames) {
      if (libraryMap.has(g.appid)) {
        const existing = libraryMap.get(g.appid);
        if (g.name && !g.name.startsWith('App ')) existing.name = g.name;
        if (g.playtimeMinutes) {
          existing.playtimeMinutes = g.playtimeMinutes;
          existing.playtimeHours = g.playtimeHours;
        }
      } else {
        libraryMap.set(g.appid, {
          appid: g.appid,
          name: g.name || `App ${g.appid}`,
          installed: false,
          isFamily: false,
          playtimeMinutes: g.playtimeMinutes || 0,
          playtimeHours: g.playtimeHours || 0,
          lastPlayed: 0,
          header_image: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
        });
      }
    }
  }

  // 9. Filter out DLCs, tools, configs, and lingering invalid depot IDs
  const ignoredAppIds = new Set([228980, 7, 760, 1007]);
  const games = [];

  for (const [appid, game] of libraryMap.entries()) {
    if (ignoredAppIds.has(appid)) continue;

    const info = appInfoMap.get(appid);
    if (info) {
      const t = (info.type || '').toLowerCase();
      // Exclude non-game types (DLCs, Tools, Config, Beta) unless installed or with playtime
      if (t === 'dlc' || t === 'tool' || t === 'config' || t === 'beta') {
        if (!game.installed && game.playtimeMinutes === 0) {
          continue;
        }
      }
      if (info.name && (game.name.startsWith('App ') || !game.name)) {
        game.name = info.name;
      }
    }

    // Filter out depot IDs (items not in appInfoMap with placeholder name 'App ...', not installed, 0 playtime)
    if (!info && game.name.startsWith('App ') && !game.installed && game.playtimeMinutes === 0) {
      continue;
    }

    games.push(game);
  }

  // Sort: Installed first, then by playtime, then family games, then name
  games.sort((a, b) => {
    if (a.installed && !b.installed) return -1;
    if (!a.installed && b.installed) return 1;
    if (b.playtimeMinutes !== a.playtimeMinutes) return b.playtimeMinutes - a.playtimeMinutes;
    if (a.isFamily && !b.isFamily) return 1;
    if (!a.isFamily && b.isFamily) return -1;
    return a.name.localeCompare(b.name);
  });

  return {
    games,
    totalGames: games.length,
    installedCount: games.filter(g => g.installed).length,
    familyCount: games.filter(g => g.isFamily).length,
    existingCollections: collections,
  };
}
