import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { detectSteamPath, isSteamRunning, closeSteam, getSteamAccounts, getLibraryFolders } from './steamDetector.js';
import { getUnifiedLibrary, fetchOwnedGamesFromSteamAPI } from './libraryParser.js';
import { batchEnrichGames, getGameMetadata } from './metadataService.js';
import { PRESET_CATEGORIES } from './presets.js';
import { categorizeGames } from './categorizer.js';
import { writeCollectionsToSteam, listBackups, restoreBackup, createBackup } from './steamWriter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. Steam Environment & Status
app.get('/api/status', async (req, res) => {
  try {
    const customPath = req.query.customPath || null;
    const steamPath = await detectSteamPath(customPath);
    const steamRunning = await isSteamRunning();

    let accounts = [];
    let libraryFolders = [];
    if (steamPath) {
      accounts = getSteamAccounts(steamPath);
      libraryFolders = getLibraryFolders(steamPath);
    }

    res.json({
      success: true,
      steamPath,
      isSteamRunning: steamRunning,
      accounts,
      libraryFolders,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Close Steam Process
app.post('/api/steam/close', async (req, res) => {
  try {
    const force = Boolean(req.body.force);
    const result = await closeSteam(force);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Built-in Preset Templates
app.get('/api/presets', (req, res) => {
  res.json({
    success: true,
    presets: PRESET_CATEGORIES,
  });
});

// 4. Scan Account Library Games
app.post('/api/library', async (req, res) => {
  try {
    const { steamPath, accountId, customGames } = req.body;
    if (!steamPath || !accountId) {
      return res.status(400).json({ success: false, error: '缺少 steamPath 或 accountId 参数' });
    }

    const libraryData = await getUnifiedLibrary(steamPath, accountId, customGames);
    res.json({
      success: true,
      ...libraryData,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Enrich Game Metadata
app.post('/api/enrich', async (req, res) => {
  try {
    const { games } = req.body;
    if (!Array.isArray(games)) {
      return res.status(400).json({ success: false, error: 'games 必须为数组' });
    }

    const enriched = await batchEnrichGames(games);
    res.json({
      success: true,
      games: enriched,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Categorize Games
app.post('/api/categorize', (req, res) => {
  try {
    const { games, options } = req.body;
    if (!Array.isArray(games)) {
      return res.status(400).json({ success: false, error: 'games 必须为数组' });
    }

    const result = categorizeGames(games, options || {});
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Write to Steam
app.post('/api/steam/write', async (req, res) => {
  try {
    const { steamPath, accountId, collections, mode } = req.body;
    if (!steamPath || !accountId || !Array.isArray(collections)) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    const result = await writeCollectionsToSteam(steamPath, accountId, collections, mode || 'merge');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Backup Management
app.get('/api/backups', (req, res) => {
  try {
    const { steamPath, accountId } = req.query;
    if (!steamPath || !accountId) {
      return res.status(400).json({ success: false, error: '缺少 steamPath 或 accountId' });
    }

    const backups = listBackups(steamPath, accountId);
    res.json({
      success: true,
      backups,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backups/restore', async (req, res) => {
  try {
    const { steamPath, accountId, fileName } = req.body;
    if (!steamPath || !accountId || !fileName) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    const result = await restoreBackup(steamPath, accountId, fileName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Fetch Full Library via Steam Web API
app.post('/api/steam/fetch-web-api', async (req, res) => {
  try {
    const { apiKey, steamId64 } = req.body;
    if (!apiKey || !steamId64) {
      return res.status(400).json({ success: false, error: '需提供 apiKey 和 steamId64' });
    }

    const games = await fetchOwnedGamesFromSteamAPI(apiKey, steamId64);
    res.json({
      success: true,
      games,
      count: games.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend build if available
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SteamSort backend listening on http://localhost:${PORT}`);
});
