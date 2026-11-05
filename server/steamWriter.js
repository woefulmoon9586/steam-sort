import fs from 'fs';
import path from 'path';
import { isSteamRunning, closeSteam } from './steamDetector.js';

/**
 * Get the path to cloud-storage-namespace-1.json and backup dir
 */
function getStoragePaths(steamPath, accountId) {
  const cloudDir = path.join(steamPath, 'userdata', accountId, 'config', 'cloudstorage');
  const storageFile = path.join(cloudDir, 'cloud-storage-namespace-1.json');
  const backupDir = path.join(cloudDir, 'steam_sort_backups');
  return { cloudDir, storageFile, backupDir };
}

/**
 * Create a timestamped backup of the current cloud-storage-namespace-1.json
 */
export function createBackup(steamPath, accountId) {
  const { storageFile, backupDir } = getStoragePaths(steamPath, accountId);

  if (!fs.existsSync(storageFile)) {
    return { success: false, message: '源配置文件不存在，无需备份' };
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

  try {
    fs.copyFileSync(storageFile, backupFile);

    // Save manifest entry
    const manifestFile = path.join(backupDir, 'backups.json');
    let manifests = [];
    if (fs.existsSync(manifestFile)) {
      try {
        manifests = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      } catch {}
    }

    const stat = fs.statSync(backupFile);
    manifests.unshift({
      fileName: `backup_${timestamp}.json`,
      filePath: backupFile,
      createdAt: now.toISOString(),
      size: stat.size,
    });

    fs.writeFileSync(manifestFile, JSON.stringify(manifests, null, 2), 'utf8');

    return {
      success: true,
      backupFile,
      fileName: `backup_${timestamp}.json`,
      createdAt: now.toISOString(),
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * List all available backups
 */
export function listBackups(steamPath, accountId) {
  const { backupDir } = getStoragePaths(steamPath, accountId);
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const manifestFile = path.join(backupDir, 'backups.json');
  if (fs.existsSync(manifestFile)) {
    try {
      const manifests = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      // Verify files still exist
      return manifests.filter(m => fs.existsSync(m.filePath));
    } catch {}
  }

  // Fallback: list files in directory
  try {
    const files = fs.readdirSync(backupDir);
    return files
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => {
        const full = path.join(backupDir, f);
        const stat = fs.statSync(full);
        return {
          fileName: f,
          filePath: full,
          createdAt: stat.mtime.toISOString(),
          size: stat.size,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * Restore a specific backup file
 */
export async function restoreBackup(steamPath, accountId, fileName) {
  const running = await isSteamRunning();
  if (running) {
    return {
      success: false,
      isSteamRunning: true,
      message: 'Steam 客户端正在运行！请先退出 Steam 客户端后再进行还原。',
    };
  }

  const { storageFile, backupDir } = getStoragePaths(steamPath, accountId);
  const backupFile = path.join(backupDir, fileName);

  if (!fs.existsSync(backupFile)) {
    return { success: false, message: `备份文件不存在: ${fileName}` };
  }

  try {
    // Also create a pre-restore backup just in case
    createBackup(steamPath, accountId);

    // Atomic overwrite
    const tmpFile = storageFile + '.tmp';
    fs.copyFileSync(backupFile, tmpFile);
    if (fs.existsSync(storageFile)) {
      fs.unlinkSync(storageFile);
    }
    fs.renameSync(tmpFile, storageFile);

    return { success: true, message: '已成功从备份还原 Steam 分类配置！重新启动 Steam 即可生效。' };
  } catch (err) {
    return { success: false, message: `还原失败: ${err.message}` };
  }
}

/**
 * Apply collections to Steam cloud-storage-namespace-1.json
 *
 * Mode options:
 * - 'merge': Keep existing user custom collections, only add or update generated ones
 * - 'replace_generated': Remove previously generated 'uc-sort-*' collections, add new ones
 * - 'replace_all': Remove all collections except 'favorite' and 'hidden'
 */
export async function writeCollectionsToSteam(steamPath, accountId, newCollections, mode = 'merge') {
  // 1. Process Check
  const running = await isSteamRunning();
  if (running) {
    return {
      success: false,
      isSteamRunning: true,
      message: '检测到 Steam 客户端正在运行！请先完全退出 Steam（右键系统托盘 Steam 图标 -> 退出），否则 Steam 会在关闭时覆盖修改。',
    };
  }

  const { cloudDir, storageFile } = getStoragePaths(steamPath, accountId);
  if (!fs.existsSync(cloudDir)) {
    fs.mkdirSync(cloudDir, { recursive: true });
  }

  // 2. Backup existing file
  const backupResult = createBackup(steamPath, accountId);

  // 3. Read existing data
  let existingData = [];
  if (fs.existsSync(storageFile)) {
    try {
      const raw = fs.readFileSync(storageFile, 'utf8');
      existingData = JSON.parse(raw);
      if (!Array.isArray(existingData)) {
        existingData = [];
      }
    } catch {
      existingData = [];
    }
  }

  // 4. Filter existing entries based on mode
  const keptEntries = [];
  const existingCollectionMap = new Map();

  for (const item of existingData) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const key = item[0];
    const valObj = item[1];

    if (!key.startsWith('user-collections.')) {
      // Keep all non-collection items (showcases, rollups, game releases, etc.)
      keptEntries.push(item);
    } else {
      // It's a collection
      const collectionId = key.replace('user-collections.', '');
      const isSystem = collectionId === 'favorite' || collectionId === 'hidden';

      if (isSystem) {
        keptEntries.push(item);
      } else if (mode === 'replace_all') {
        // Drop all custom collections
      } else if (mode === 'replace_generated') {
        // Drop only our generated ones (prefixed with uc-sort- or steamsort-)
        if (!collectionId.startsWith('uc-sort-') && !collectionId.startsWith('steamsort-')) {
          keptEntries.push(item);
          existingCollectionMap.set(key, valObj);
        }
      } else {
        // mode === 'merge': keep unless being updated by newCollections
        existingCollectionMap.set(key, valObj);
      }
    }
  }

  // 5. Construct new collection entries
  const nowUnix = Math.floor(Date.now() / 1000);
  const newEntriesMap = new Map();

  for (const col of newCollections) {
    const colId = col.id.startsWith('uc-sort-') ? col.id : `uc-sort-${col.id}`;
    const fullKey = `user-collections.${colId}`;

    const valuePayload = {
      id: colId,
      name: col.name,
      added: (col.added || []).map(id => parseInt(id, 10)).filter(id => !isNaN(id)),
      removed: col.removed || [],
    };

    const entryObj = {
      key: fullKey,
      timestamp: nowUnix,
      value: JSON.stringify(valuePayload),
      version: '1',
    };

    newEntriesMap.set(fullKey, [fullKey, entryObj]);
  }

  // If mode is 'merge', retain any existing user collection not overwritten
  if (mode === 'merge') {
    for (const [key, valObj] of existingCollectionMap.entries()) {
      if (!newEntriesMap.has(key)) {
        keptEntries.push([key, valObj]);
      }
    }
  }

  // Combine kept + new entries
  const finalData = [...keptEntries, ...Array.from(newEntriesMap.values())];

  // 6. Atomic write
  try {
    const tmpFile = storageFile + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(finalData), 'utf8');

    if (fs.existsSync(storageFile)) {
      fs.unlinkSync(storageFile);
    }
    fs.renameSync(tmpFile, storageFile);

    return {
      success: true,
      backupFile: backupResult.backupFile,
      appliedCollectionsCount: newCollections.length,
      totalEntries: finalData.length,
      message: `🎉 成功将 ${newCollections.length} 个分类写入 Steam 库！`,
    };
  } catch (err) {
    return {
      success: false,
      message: `写入 Steam 配置文件失败: ${err.message}`,
    };
  }
}
