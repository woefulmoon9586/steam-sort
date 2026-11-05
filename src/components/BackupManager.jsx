import React, { useState, useEffect } from 'react';
import { ShieldCheck, RotateCcw, AlertTriangle, FileText, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

export default function BackupManager({
  steamPath,
  selectedAccount,
  isSteamRunning,
  onCloseSteam,
  onRefreshStatus,
}) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchBackups = async () => {
    if (!steamPath || !selectedAccount?.accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/backups?steamPath=${encodeURIComponent(steamPath)}&accountId=${selectedAccount.accountId}`);
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [steamPath, selectedAccount?.accountId]);

  const handleRestore = async (fileName) => {
    if (!window.confirm(`确定要将 Steam 分类还原至备份 "${fileName}" 吗？现有分类将被此备份覆盖。`)) {
      return;
    }

    setRestoring(true);
    setMessage(null);
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamPath,
          accountId: selectedAccount.accountId,
          fileName,
        }),
      });
      const data = await res.json();
      setMessage(data);
      if (data.success) {
        fetchBackups();
      }
    } catch (e) {
      setMessage({ success: false, message: e.message });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-2xl p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-sky-400" />
              <span>分类历史备份与一键还原中心</span>
            </h3>
            <p className="text-xs text-[#8f98a0] mt-1">
              当前账号: <span className="text-white font-semibold">{selectedAccount?.personaName}</span> ({selectedAccount?.accountId})
            </p>
          </div>

          <button
            onClick={fetchBackups}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs text-sky-400 hover:text-sky-300 bg-[#101822] border border-[#2a3f5a]/40 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新备份列表</span>
          </button>
        </div>

        {/* Steam Running Alert */}
        {isSteamRunning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Steam 正在运行，还原配置前必须先退出 Steam 客户端。</span>
            </div>
            <button
              onClick={onCloseSteam}
              className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition"
            >
              退出 Steam
            </button>
          </div>
        )}

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold ${
              message.success
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/10 border-red-500/40 text-red-300'
            }`}
          >
            {message.message}
          </div>
        )}

        {/* Backups List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#8f98a0]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
              正在读取备份列表...
            </div>
          ) : backups.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[#2a3f5a]/40 rounded-xl text-xs text-[#8f98a0]">
              暂无历史备份。每次执行分类写入时，系统都会自动为您保留备份。
            </div>
          ) : (
            <div className="divide-y divide-[#2a3f5a]/30 border border-[#2a3f5a]/30 rounded-xl overflow-hidden bg-[#101822]">
              {backups.map((b, index) => {
                const dateStr = new Date(b.createdAt).toLocaleString();
                const sizeKb = Math.round(b.size / 1024);

                return (
                  <div
                    key={b.fileName}
                    className="p-4 flex items-center justify-between hover:bg-[#182433] transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-2">
                          <span>{b.fileName}</span>
                          {index === 0 && (
                            <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded">
                              最新
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8f98a0] flex items-center space-x-3 mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{dateStr}</span>
                          </span>
                          <span>大小: {sizeKb} KB</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestore(b.fileName)}
                      disabled={restoring || isSteamRunning}
                      className="flex items-center space-x-1.5 bg-[#214b6b] hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>一键还原</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
