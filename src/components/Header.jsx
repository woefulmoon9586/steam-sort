import React from 'react';
import { Power, RotateCcw, ShieldCheck, Gamepad2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Header({
  steamPath,
  accounts,
  selectedAccount,
  onSelectAccount,
  isSteamRunning,
  onCloseSteam,
  activeTab,
  setActiveTab,
  onRefreshStatus,
  refreshing,
}) {
  return (
    <header className="bg-[#171d25] border-b border-[#2a3f5a]/50 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-tight text-white">SteamSort</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                v1.0
              </span>
            </div>
            <p className="text-xs text-[#8f98a0]">Steam 库智能分类管理助手</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="hidden md:flex items-center bg-[#101822] p-1 rounded-xl border border-[#2a3f5a]/40">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'wizard'
                ? 'bg-[#214b6b] text-white shadow-sm'
                : 'text-[#8f98a0] hover:text-white'
            }`}
          >
            智能分类向导
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'backups'
                ? 'bg-[#214b6b] text-white shadow-sm'
                : 'text-[#8f98a0] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>备份与还原</span>
          </button>
        </div>

        {/* Right Status & Controls */}
        <div className="flex items-center space-x-3">
          {/* Steam Process Status */}
          <div className="flex items-center space-x-2">
            {isSteamRunning ? (
              <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-xs text-amber-300 font-medium">Steam 正在运行</span>
                <button
                  onClick={onCloseSteam}
                  title="关闭 Steam 以便写入分类"
                  className="ml-1 text-xs bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 px-2 py-0.5 rounded transition"
                >
                  退出 Steam
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-emerald-300 font-medium">Steam 已关闭 (可安全写入)</span>
              </div>
            )}

            <button
              onClick={onRefreshStatus}
              title="刷新环境与状态"
              className="p-1.5 text-[#8f98a0] hover:text-white hover:bg-[#214b6b]/40 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>

          {/* Account Selector */}
          {accounts && accounts.length > 0 && (
            <div className="relative">
              <select
                value={selectedAccount?.accountId || ''}
                onChange={(e) => {
                  const acc = accounts.find((a) => a.accountId === e.target.value);
                  if (acc) onSelectAccount(acc);
                }}
                className="bg-[#101822] text-xs text-white border border-[#2a3f5a] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.accountId} value={acc.accountId}>
                    {acc.personaName} ({acc.accountId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
