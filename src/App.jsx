import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StepWizard from './components/StepWizard';
import EnvironmentPanel from './components/EnvironmentPanel';
import PresetSelector from './components/PresetSelector';
import PreviewPanel from './components/PreviewPanel';
import WritePanel from './components/WritePanel';
import BackupManager from './components/BackupManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('wizard'); // 'wizard' | 'backups'
  const [currentStep, setCurrentStep] = useState(1);
  const [stepsStatus, setStepsStatus] = useState({ 1: true, 2: false, 3: false, 4: false });

  // Steam Status & Env
  const [steamPath, setSteamPath] = useState('');
  const [isSteamRunning, setIsSteamRunning] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Library & Games
  const [games, setGames] = useState([]);
  const [totalGames, setTotalGames] = useState(0);
  const [installedCount, setInstalledCount] = useState(0);
  const [familyCount, setFamilyCount] = useState(0);
  const [existingCollections, setExistingCollections] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Presets & Categorization
  const [presets, setPresets] = useState({});
  const [selectedPresetGroups, setSelectedPresetGroups] = useState(['genres', 'playmodes']);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [minGames, setMinGames] = useState(1);
  const [categorizing, setCategorizing] = useState(false);
  const [progress, setProgress] = useState(null);

  // Generated Collections & Preview
  const [collections, setCollections] = useState([]);
  const [uncategorized, setUncategorized] = useState([]);

  // Fetch initial status and presets
  const fetchStatus = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        setSteamPath(data.steamPath || '');
        setIsSteamRunning(Boolean(data.isSteamRunning));
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0 && !selectedAccount) {
          setSelectedAccount(data.accounts[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch status:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets || {});
      }
    } catch (e) {
      console.error('Failed to fetch presets:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPresets();
  }, []);

  // Poll steam running status every 4 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.success) {
          setIsSteamRunning(Boolean(data.isSteamRunning));
        }
      } catch {}
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Load library when account changes
  const loadLibrary = async (targetAccount = selectedAccount, customGames = null) => {
    if (!steamPath || !targetAccount?.accountId) return;
    setLoadingLibrary(true);
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamPath,
          accountId: targetAccount.accountId,
          customGames,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGames(data.games || []);
        setTotalGames(data.totalGames || 0);
        setInstalledCount(data.installedCount || 0);
        setFamilyCount(data.familyCount || 0);
        setExistingCollections(data.existingCollections || []);
        setStepsStatus((prev) => ({ ...prev, 2: true }));
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (selectedAccount && steamPath) {
      loadLibrary(selectedAccount);
    }
  }, [selectedAccount?.accountId, steamPath]);

  // Close steam handler
  const handleCloseSteam = async () => {
    try {
      const res = await fetch('/api/steam/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      fetchStatus();
    } catch (e) {
      console.error('Failed to close Steam:', e);
    }
  };

  // Web API importer
  const handleFetchWebApi = async (apiKey, steamId64) => {
    const res = await fetch('/api/steam/fetch-web-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, steamId64 }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    // Reload library merging these games
    await loadLibrary(selectedAccount, data.games);
    return data;
  };

  // Run categorization
  const handleStartCategorize = async () => {
    if (games.length === 0) return;
    setCategorizing(true);
    setProgress({ completed: 0, total: games.length, percent: 10, currentApp: '准备游戏元数据...' });

    try {
      // 1. Enrich games
      setProgress({ completed: 0, total: games.length, percent: 30, currentApp: '正在匹配游戏标签与品类...' });
      const enrichRes = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games }),
      });
      const enrichData = await enrichRes.json();
      const enrichedGames = enrichData.games || games;

      // 2. Categorize
      setProgress({ completed: games.length, total: games.length, percent: 80, currentApp: '正在生成分类集合...' });
      const catRes = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          games: enrichedGames,
          options: {
            enabledPresetGroups: selectedPresetGroups,
            allowMultiple,
            minGamesPerCollection: minGames,
          },
        }),
      });
      const catData = await catRes.json();

      if (catData.success) {
        setCollections(catData.collections || []);
        setUncategorized(catData.uncategorized || []);
        setStepsStatus((prev) => ({ ...prev, 3: true, 4: true }));
        setProgress({ completed: games.length, total: games.length, percent: 100, currentApp: '完成！' });
        setTimeout(() => {
          setCurrentStep(3);
        }, 300);
      }
    } catch (e) {
      console.error('Categorization error:', e);
    } finally {
      setCategorizing(false);
    }
  };

  // Write to Steam
  const handleWriteCollections = async (collectionsToWrite, mode) => {
    const res = await fetch('/api/steam/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steamPath,
        accountId: selectedAccount.accountId,
        collections: collectionsToWrite,
        mode,
      }),
    });
    return await res.json();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0e141b] text-[#c6d4df]">
      {/* Top Header */}
      <Header
        steamPath={steamPath}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        isSteamRunning={isSteamRunning}
        onCloseSteam={handleCloseSteam}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshStatus={fetchStatus}
        refreshing={refreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'backups' ? (
          <BackupManager
            steamPath={steamPath}
            selectedAccount={selectedAccount}
            isSteamRunning={isSteamRunning}
            onCloseSteam={handleCloseSteam}
            onRefreshStatus={fetchStatus}
          />
        ) : (
          <div>
            {/* Step Wizard Progress */}
            <StepWizard
              currentStep={currentStep}
              onStepClick={setCurrentStep}
              stepsStatus={stepsStatus}
            />

            {/* Step 1: Environment & Library Discovery */}
            {currentStep === 1 && (
              <EnvironmentPanel
                steamPath={steamPath}
                setSteamPath={setSteamPath}
                accounts={accounts}
                selectedAccount={selectedAccount}
                onSelectAccount={setSelectedAccount}
                games={games}
                totalGames={totalGames}
                installedCount={installedCount}
                familyCount={familyCount}
                existingCollections={existingCollections}
                loadingLibrary={loadingLibrary}
                onRefreshLibrary={() => loadLibrary()}
                onFetchWebApi={handleFetchWebApi}
                onNextStep={() => setCurrentStep(2)}
              />
            )}

            {/* Step 2: Presets & Categorization Settings */}
            {currentStep === 2 && (
              <PresetSelector
                presets={presets}
                selectedPresetGroups={selectedPresetGroups}
                setSelectedPresetGroups={setSelectedPresetGroups}
                allowMultiple={allowMultiple}
                setAllowMultiple={setAllowMultiple}
                minGames={minGames}
                setMinGames={setMinGames}
                onStartCategorize={handleStartCategorize}
                categorizing={categorizing}
                progress={progress}
              />
            )}

            {/* Step 3: Interactive Preview & Adjustments */}
            {currentStep === 3 && (
              <PreviewPanel
                collections={collections}
                setCollections={setCollections}
                uncategorized={uncategorized}
                allGames={games}
                onNextStep={() => setCurrentStep(4)}
              />
            )}

            {/* Step 4: Write & Apply to Steam Client */}
            {currentStep === 4 && (
              <WritePanel
                steamPath={steamPath}
                selectedAccount={selectedAccount}
                collections={collections}
                isSteamRunning={isSteamRunning}
                onCloseSteam={handleCloseSteam}
                onRefreshStatus={fetchStatus}
                onWriteCollections={handleWriteCollections}
                onPrevStep={() => setCurrentStep(3)}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a3f5a]/30 py-4 text-center text-xs text-[#627180]">
        SteamSort &copy; 2026 &bull; 本地安全执行，不泄露任何隐私数据 &bull; 专为现代 Steam 库设计
      </footer>
    </div>
  );
}
