import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { parseVDF } from './vdfParser.js';

const execAsync = promisify(exec);

/**
 * Common Steam installation directories
 */
const COMMON_PATHS = [
  'C:\\Program Files (x86)\\Steam',
  'C:\\Program Files\\Steam',
  'D:\\Steam',
  'D:\\Softwares\\Steam',
  'D:\\Games\\Steam',
  'E:\\Steam',
  'E:\\Softwares\\Tools_Heavy\\Steam',
  'E:\\Games\\Steam',
  'F:\\Steam',
  process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Steam') : null,
  process.env['PROGRAMFILES(X86)'] ? path.join(process.env['PROGRAMFILES(X86)'], 'Steam') : null,
].filter(Boolean);

/**
 * Detect Steam installation directory
 */
export async function detectSteamPath(customPath = null) {
  if (customPath && fs.existsSync(customPath)) {
    const verified = verifySteamDir(customPath);
    if (verified) return verified;
  }

  // 1. Try Windows Registry query via PowerShell
  if (process.platform === 'win32') {
    try {
      const psCmd = `powershell -NoProfile -Command "(Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam' -ErrorAction SilentlyContinue).SteamPath"`;
      const { stdout } = await execAsync(psCmd);
      const regPath = stdout.trim();
      if (regPath && fs.existsSync(regPath)) {
        const verified = verifySteamDir(regPath);
        if (verified) return verified;
      }
    } catch {
      // ignore
    }

    try {
      const psCmd2 = `powershell -NoProfile -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\WOW6432Node\\Valve\\Steam' -ErrorAction SilentlyContinue).InstallPath"`;
      const { stdout } = await execAsync(psCmd2);
      const regPath = stdout.trim();
      if (regPath && fs.existsSync(regPath)) {
        const verified = verifySteamDir(regPath);
        if (verified) return verified;
      }
    } catch {
      // ignore
    }
  }

  // 2. Check common known paths
  for (const candidate of COMMON_PATHS) {
    if (fs.existsSync(candidate)) {
      const verified = verifySteamDir(candidate);
      if (verified) return verified;
    }
  }

  // 3. Linux / Steam Deck paths
  if (process.platform === 'linux') {
    const home = process.env.HOME || '';
    const linuxPaths = [
      path.join(home, '.local/share/Steam'),
      path.join(home, '.steam/steam'),
      path.join(home, '.var/app/com.valvesoftware.Steam/data/Steam'),
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}

function verifySteamDir(dirPath) {
  const normalized = path.normalize(dirPath);
  const userdata = path.join(normalized, 'userdata');
  const steamapps = path.join(normalized, 'steamapps');
  if (fs.existsSync(userdata) || fs.existsSync(steamapps)) {
    return normalized;
  }
  return null;
}

/**
 * Check if Steam process is currently running
 */
export async function isSteamRunning() {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq steam.exe" /FO CSV /NH', { timeout: 3000 });
      return stdout.toLowerCase().includes('steam.exe');
    } catch {
      return false;
    }
  } else {
    try {
      const { stdout } = await execAsync('pgrep -x steam', { timeout: 3000 });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Gracefully close Steam or kill if requested
 */
export async function closeSteam(force = false) {
  if (process.platform === 'win32') {
    try {
      const flag = force ? '/F' : '';
      await execAsync(`taskkill ${flag} /IM steam.exe`);
      return { success: true, message: '已发送退出 Steam 指令' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  } else {
    try {
      const sig = force ? '-9' : '-15';
      await execAsync(`killall ${sig} steam`);
      return { success: true, message: '已发送退出 Steam 指令' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

/**
 * Get all Steam accounts found in userdata directory
 */
export function getSteamAccounts(steamPath) {
  const userdataDir = path.join(steamPath, 'userdata');
  if (!fs.existsSync(userdataDir)) {
    return [];
  }

  const entries = fs.readdirSync(userdataDir, { withFileTypes: true });
  const accounts = [];

  // Read loginusers.vdf if available to get display names
  let personaMap = {};
  const loginUsersFile = path.join(steamPath, 'config', 'loginusers.vdf');
  if (fs.existsSync(loginUsersFile)) {
    try {
      const vdfContent = fs.readFileSync(loginUsersFile, 'utf8');
      const parsed = parseVDF(vdfContent);
      const users = parsed.users || {};
      for (const [steamId64, info] of Object.entries(users)) {
        // Calculate SteamID3 from SteamID64: SteamID3 = BigInt(steamId64) - 76561197960265728n
        try {
          const id3 = (BigInt(steamId64) - 76561197960265728n).toString();
          personaMap[id3] = {
            personaName: info.PersonaName || info.personaname || '',
            accountName: info.AccountName || info.accountname || '',
            mostRecent: info.mostrecent === '1' || info.MostRecent === '1',
            steamId64,
          };
        } catch {}
      }
    } catch {}
  }

  for (const entry of entries) {
    if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
      const accountId = entry.name;
      const accountDir = path.join(userdataDir, accountId);
      const cloudStorageFile = path.join(accountDir, 'config', 'cloudstorage', 'cloud-storage-namespace-1.json');
      const localConfigFile = path.join(accountDir, 'config', 'localconfig.vdf');
      
      const hasCloudStorage = fs.existsSync(cloudStorageFile);
      const hasLocalConfig = fs.existsSync(localConfigFile);

      let lastModified = 0;
      if (hasCloudStorage) {
        lastModified = fs.statSync(cloudStorageFile).mtimeMs;
      } else if (hasLocalConfig) {
        lastModified = fs.statSync(localConfigFile).mtimeMs;
      }

      const info = personaMap[accountId] || {};

      accounts.push({
        accountId,
        steamId64: info.steamId64 || (BigInt(accountId) + 76561197960265728n).toString(),
        personaName: info.personaName || `Steam 用户 (${accountId})`,
        accountName: info.accountName || '',
        mostRecent: Boolean(info.mostRecent),
        hasCloudStorage,
        hasLocalConfig,
        lastModified,
      });
    }
  }

  // Sort: most recent or latest modified first
  accounts.sort((a, b) => {
    if (a.mostRecent && !b.mostRecent) return -1;
    if (!a.mostRecent && b.mostRecent) return 1;
    return b.lastModified - a.lastModified;
  });

  return accounts;
}

/**
 * Get all library folders from libraryfolders.vdf
 */
export function getLibraryFolders(steamPath) {
  const folders = [steamPath];
  const libraryVdf = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');

  if (fs.existsSync(libraryVdf)) {
    try {
      const content = fs.readFileSync(libraryVdf, 'utf8');
      const parsed = parseVDF(content);
      const root = parsed.libraryfolders || parsed.LibraryFolders || {};
      for (const [key, val] of Object.entries(root)) {
        if (typeof val === 'object' && val !== null && val.path) {
          const p = path.normalize(val.path);
          if (fs.existsSync(p) && !folders.includes(p)) {
            folders.push(p);
          }
        }
      }
    } catch {}
  }

  return folders;
}
