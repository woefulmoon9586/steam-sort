import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, AlertTriangle, ArrowLeft, RefreshCw, Power, Check } from 'lucide-react';

export default function WritePanel({
  steamPath,
  selectedAccount,
  collections,
  isSteamRunning,
  onCloseSteam,
  onRefreshStatus,
  onWriteCollections,
  onPrevStep,
}) {
  const [writeMode, setWriteMode] = useState('merge');
  const [writing, setWriting] = useState(false);
  const [result, setResult] = useState(null);

  const totalAssignedGames = collections.reduce((acc, c) => acc + c.added.length, 0);

  const handleApply = async () => {
    setWriting(true);
    setResult(null);
    try {
      const res = await onWriteCollections(collections, writeMode);
      setResult(res);
    } catch (e) {
      setResult({ success: false, message: e.message });
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview Card */}
      <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-2xl p-6 shadow-md space-y-6">
        <div>
          <h3 className="text-lg font-black text-white flex items-center space-x-2">
            <CheckCircle2 className="w-6 h-6 text-sky-400" />
            <span>准备写入 Steam 客户端</span>
          </h3>
          <p className="text-xs text-[#8f98a0] mt-1">
            系统将直接把分类结构写入 Steam 本地云存储配置文件，完全同步官方分类标准。
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#101822] p-4 rounded-xl border border-[#2a3f5a]/30">
            <div className="text-xs text-[#8f98a0]">目标 Steam 账号</div>
            <div className="text-sm font-bold text-white truncate mt-1">
              {selectedAccount?.personaName || selectedAccount?.accountId}
            </div>
            <div className="text-[10px] text-[#627180] font-mono mt-0.5">
              ID: {selectedAccount?.accountId}
            </div>
          </div>

          <div className="bg-[#101822] p-4 rounded-xl border border-[#2a3f5a]/30">
            <div className="text-xs text-[#8f98a0]">准备写入分类数</div>
            <div className="text-xl font-black text-sky-400 mt-1">
              {collections.length} <span className="text-xs font-normal text-[#8f98a0]">个分类</span>
            </div>
          </div>

          <div className="bg-[#101822] p-4 rounded-xl border border-[#2a3f5a]/30">
            <div className="text-xs text-[#8f98a0]">游戏归类引用总计</div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {totalAssignedGames} <span className="text-xs font-normal text-[#8f98a0]">次</span>
            </div>
          </div>
        </div>

        {/* Write Mode Selection */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-white uppercase tracking-wider">
            选择合并写入模式
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Merge */}
            <div
              onClick={() => setWriteMode('merge')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                writeMode === 'merge'
                  ? 'bg-sky-950/20 border-sky-500 ring-1 ring-sky-500/40 text-white'
                  : 'bg-[#101822] border-[#2a3f5a]/30 text-[#8f98a0] hover:border-[#2a3f5a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">🔗 追加合并（推荐）</span>
                {writeMode === 'merge' && <Check className="w-4 h-4 text-sky-400" />}
              </div>
              <p className="text-[11px] text-[#8f98a0]">
                完整保留您此前自己创建的所有自定义分类，仅添加或更新本次分类。
              </p>
            </div>

            {/* Replace Generated */}
            <div
              onClick={() => setWriteMode('replace_generated')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                writeMode === 'replace_generated'
                  ? 'bg-sky-950/20 border-sky-500 ring-1 ring-sky-500/40 text-white'
                  : 'bg-[#101822] border-[#2a3f5a]/30 text-[#8f98a0] hover:border-[#2a3f5a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">🔄 重新生成分类</span>
                {writeMode === 'replace_generated' && <Check className="w-4 h-4 text-sky-400" />}
              </div>
              <p className="text-[11px] text-[#8f98a0]">
                仅替换此前由本工具自动生成的分类，保留用户自己的其他独立分类。
              </p>
            </div>

            {/* Replace All */}
            <div
              onClick={() => setWriteMode('replace_all')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                writeMode === 'replace_all'
                  ? 'bg-sky-950/20 border-sky-500 ring-1 ring-sky-500/40 text-white'
                  : 'bg-[#101822] border-[#2a3f5a]/30 text-[#8f98a0] hover:border-[#2a3f5a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">🧹 完全全新整理</span>
                {writeMode === 'replace_all' && <Check className="w-4 h-4 text-sky-400" />}
              </div>
              <p className="text-[11px] text-[#8f98a0]">
                仅保留 Steam 系统收藏夹与隐藏，其余全部替换为全新分类体系。
              </p>
            </div>
          </div>
        </div>

        {/* Safety & Steam Running Check Banner */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-semibold">写入前将自动为您的旧分类生成带时间戳的安全备份文件</span>
          </div>

          {isSteamRunning ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-amber-300">
                    检测到 Steam 客户端正在运行！
                  </div>
                  <div className="text-xs text-amber-200/80 mt-0.5">
                    Steam 运行时会持有内存缓存并在退出时覆盖本地文件。请先退出 Steam 客户端后再写入。
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={onCloseSteam}
                  className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-2 rounded-lg transition flex items-center space-x-1"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>退出 Steam</span>
                </button>
                <button
                  onClick={onRefreshStatus}
                  className="p-2 text-amber-300 hover:text-white transition"
                  title="检查运行状态"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center space-x-2 text-xs text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Steam 客户端已完全退出，环境处于可安全写入状态！</span>
            </div>
          )}
        </div>

        {/* Execution Results Display */}
        {result && (
          <div
            className={`p-4 rounded-xl border ${
              result.success
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                : 'bg-red-500/10 border-red-500/40 text-red-200'
            }`}
          >
            <div className="font-bold text-sm">{result.message}</div>
            {result.success && (
              <div className="mt-2 text-xs space-y-1 text-emerald-300/90">
                <div>📁 备份路径: <span className="font-mono text-white/80">{result.backupFile}</span></div>
                <div className="font-semibold text-sky-300 pt-1">
                  🚀 现在您可以启动 Steam 客户端，分类已经全部呈现在您的库列表中！
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="pt-4 border-t border-[#2a3f5a]/40 flex items-center justify-between">
          <button
            onClick={onPrevStep}
            className="flex items-center space-x-1.5 text-xs font-semibold text-[#8f98a0] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回微调</span>
          </button>

          <button
            onClick={handleApply}
            disabled={writing || isSteamRunning}
            className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-xl shadow-sky-500/30 transition-all cursor-pointer text-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{writing ? '正在写入 Steam 库...' : '立即写入并分类 Steam 库'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
