import React, { useState } from 'react';
import { Folder, User, HardDrive, Sparkles, Key, ChevronDown, ChevronUp, Search, Check, RefreshCw } from 'lucide-react';

export default function EnvironmentPanel({
  steamPath,
  setSteamPath,
  accounts,
  selectedAccount,
  onSelectAccount,
  games,
  totalGames,
  installedCount,
  familyCount,
  existingCollections,
  loadingLibrary,
  onRefreshLibrary,
  onFetchWebApi,
  onNextStep,
}) {
  const [showWebApiKeyInput, setShowWebApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingWeb, setFetchingWeb] = useState(false);
  const [webFetchMsg, setWebFetchMsg] = useState(null);

  const filteredGames = (games || []).filter((g) =>
    (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(g.appid).includes(searchQuery)
  );

  const handleWebFetch = async () => {
    if (!apiKey.trim() || !selectedAccount?.steamId64) return;
    setFetchingWeb(true);
    setWebFetchMsg(null);
    try {
      const res = await onFetchWebApi(apiKey.trim(), selectedAccount.steamId64);
      setWebFetchMsg(`成功导入 ${res.count} 款账号拥有的全部游戏！`);
    } catch (e) {
      setWebFetchMsg(`获取失败: ${e.message}`);
    } finally {
      setFetchingWeb(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration & Detection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Steam Path Card */}
        <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-sky-400 mb-2">
              <Folder className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Steam 安装路径</span>
            </div>
            <p className="text-xs text-[#c6d4df] font-mono break-all bg-[#0e141b] p-2 rounded-lg border border-[#2a3f5a]/30">
              {steamPath || '未检测到 Steam 路径'}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-[#8f98a0]">
            已自动从 Windows 注册表和磁盘探测
          </div>
        </div>

        {/* Selected Account Card */}
        <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <User className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">当前 Steam 账号</span>
            </div>
            <div className="bg-[#0e141b] p-2 rounded-lg border border-[#2a3f5a]/30 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white truncate">
                  {selectedAccount?.personaName || '未知用户'}
                </div>
                <div className="text-[11px] text-[#8f98a0] font-mono">
                  SteamID3: {selectedAccount?.accountId}
                </div>
              </div>
              {selectedAccount?.hasCloudStorage && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                  现代云配置
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-[#8f98a0]">
            分类将直接写入该账号的云存储配置
          </div>
        </div>

        {/* Library Stats Card */}
        <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 mb-2">
              <HardDrive className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">本地库存统计</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center bg-[#0e141b] p-2 rounded-lg border border-[#2a3f5a]/30">
              <div>
                <div className="text-base font-black text-white">{totalGames || 0}</div>
                <div className="text-[10px] text-[#8f98a0]">库存总数</div>
              </div>
              <div>
                <div className="text-base font-black text-emerald-400">{installedCount || 0}</div>
                <div className="text-[10px] text-[#8f98a0]">已安装</div>
              </div>
              <div>
                <div className="text-base font-black text-purple-400">{familyCount || 0}</div>
                <div className="text-[10px] text-[#8f98a0]">家庭共享</div>
              </div>
              <div>
                <div className="text-base font-black text-sky-400">
                  {existingCollections?.length || 0}
                </div>
                <div className="text-[10px] text-[#8f98a0]">现有分类</div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={onRefreshLibrary}
              disabled={loadingLibrary}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLibrary ? 'animate-spin' : ''}`} />
              <span>重新扫描</span>
            </button>
            <span className="text-[11px] text-[#8f98a0]">从 manifests 与云缓存读取</span>
          </div>
        </div>
      </div>

      {/* Advanced Web API Importer (Collapsible) */}
      <div className="bg-[#131c26]/70 border border-[#2a3f5a]/40 rounded-xl p-4">
        <button
          onClick={() => setShowWebApiKeyInput(!showWebApiKeyInput)}
          className="w-full flex items-center justify-between text-left text-sm text-[#8f98a0] hover:text-white"
        >
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-sky-400" />
            <span className="font-medium text-white">想导入全部未安装/未运行过的库存游戏？（可选）</span>
            <span className="text-xs text-[#8f98a0]">点击展开 Steam API 导入</span>
          </div>
          {showWebApiKeyInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showWebApiKeyInput && (
          <div className="mt-4 pt-4 border-t border-[#2a3f5a]/40 space-y-3">
            <p className="text-xs text-[#8f98a0]">
              默认情况下，Steam 本地仅缓存已安装或在本地运行过的游戏。如果您在 Steam 上拥有数百款从未安装过的游戏，
              可以输入您的 <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer" className="text-sky-400 underline">Steam Web API Key</a> 一键拉取全部游戏。
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="输入 32 位 Steam Web API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-[#0e141b] border border-[#2a3f5a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                onClick={handleWebFetch}
                disabled={fetchingWeb || !apiKey.trim()}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0"
              >
                {fetchingWeb ? '拉取中...' : '拉取全部游戏'}
              </button>
            </div>
            {webFetchMsg && (
              <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                {webFetchMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Discovered Games Library List */}
      <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>识别到的库存游戏</span>
              <span className="text-xs font-semibold bg-[#214b6b] text-sky-200 px-2 py-0.5 rounded-full">
                {filteredGames.length} 款
              </span>
            </h3>
            <p className="text-xs text-[#8f98a0] mt-0.5">
              这些游戏将参与智能标签匹配与分类
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#8f98a0] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜索游戏名称或 AppID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0e141b] border border-[#2a3f5a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#627180] focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Game cards grid */}
        {loadingLibrary ? (
          <div className="py-16 text-center text-[#8f98a0]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-400 mb-3" />
            <p className="text-sm">正在扫描本地 Steam 库与 manifests...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="py-12 text-center text-[#8f98a0] border border-dashed border-[#2a3f5a]/50 rounded-xl">
            未找到匹配的游戏
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredGames.map((game) => (
              <div
                key={game.appid}
                className="bg-[#101822] border border-[#2a3f5a]/40 rounded-lg overflow-hidden group hover:border-sky-500/60 transition shadow-sm"
              >
                <div className="aspect-[16/9] w-full bg-[#1b2838] relative overflow-hidden">
                  <img
                    src={game.header_image}
                    alt={game.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'https://store.cloudflare.steamstatic.com/public/shared/images/header/globalheader_logo.png';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {game.installed ? (
                    <span className="absolute top-1.5 right-1.5 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      已安装
                    </span>
                  ) : game.isFamily ? (
                    <span className="absolute top-1.5 right-1.5 bg-purple-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      家庭共享
                    </span>
                  ) : null}
                  {game.playtimeHours > 0 && (
                    <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-sky-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {game.playtimeHours}h
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-xs font-semibold text-white truncate" title={game.name}>
                    {game.name}
                  </div>
                  <div className="text-[10px] text-[#627180] font-mono mt-0.5">
                    AppID: {game.appid}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer with Next Step button */}
        <div className="pt-4 border-t border-[#2a3f5a]/40 flex justify-end">
          <button
            onClick={onNextStep}
            disabled={totalGames === 0 || loadingLibrary}
            className="flex items-center space-x-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
          >
            <span>下一步：选择分类方案</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
