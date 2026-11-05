import React from 'react';
import { Sliders, Sparkles, CheckSquare, Square, Layers, ShieldAlert, Info } from 'lucide-react';

export default function PresetSelector({
  presets,
  selectedPresetGroups,
  setSelectedPresetGroups,
  allowMultiple,
  setAllowMultiple,
  minGames,
  setMinGames,
  onStartCategorize,
  categorizing,
  progress,
}) {
  const toggleGroup = (groupId) => {
    if (selectedPresetGroups.includes(groupId)) {
      setSelectedPresetGroups(selectedPresetGroups.filter((g) => g !== groupId));
    } else {
      setSelectedPresetGroups([...selectedPresetGroups, groupId]);
    }
  };

  const groupKeys = Object.keys(presets || {});

  return (
    <div className="space-y-6">
      <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 mb-1">
          <Sliders className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-bold text-white">选择分类预设与规则</h3>
        </div>
        <p className="text-xs text-[#8f98a0]">
          勾选您希望在 Steam 客户端侧边栏展示的分类体系，系统将自动分析游戏题材、标签、游玩模式与时长进行精确归类。
        </p>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {groupKeys.map((groupId) => {
            const group = presets[groupId];
            const isSelected = selectedPresetGroups.includes(groupId);

            return (
              <div
                key={groupId}
                onClick={() => toggleGroup(groupId)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/20 border-sky-500/80 shadow-sm ring-1 ring-sky-500/30'
                    : 'bg-[#101822] border-[#2a3f5a]/40 hover:border-[#2a3f5a]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{group.name}</span>
                    <button className="text-sky-400">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-sky-400" />
                      ) : (
                        <Square className="w-5 h-5 text-[#627180]" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[#8f98a0] mb-3">{group.description}</p>
                </div>

                {/* Tags preview inside this group */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#2a3f5a]/30">
                  {group.rules.map((rule) => (
                    <span
                      key={rule.id}
                      className="text-[11px] bg-[#182433] text-[#c6d4df] px-2 py-0.5 rounded border border-[#2a3f5a]/40"
                    >
                      {rule.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Rules & Options */}
      <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-5 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>分类匹配选项</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Allow multiple collections */}
          <div
            onClick={() => setAllowMultiple(!allowMultiple)}
            className="flex items-start space-x-3 p-3 bg-[#101822] border border-[#2a3f5a]/40 rounded-xl cursor-pointer hover:border-sky-500/40 transition"
          >
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={() => {}}
              className="mt-1 accent-sky-500 cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-white">允许跨分类归类（推荐）</div>
              <div className="text-[11px] text-[#8f98a0] mt-0.5">
                一款游戏如果同时是“角色扮演”又是“联机合作”，将同时出现在两个分类中（与 Steam 原生收藏夹逻辑完全一致）。
              </div>
            </div>
          </div>

          {/* Min games threshold */}
          <div className="p-3 bg-[#101822] border border-[#2a3f5a]/40 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">分类最小游戏数过滤</div>
              <div className="text-[11px] text-[#8f98a0] mt-0.5">
                游戏数量少于此数值的分类将不自动创建，保持库列表精简。
              </div>
            </div>
            <select
              value={minGames}
              onChange={(e) => setMinGames(parseInt(e.target.value, 10))}
              className="bg-[#0e141b] text-xs text-white border border-[#2a3f5a] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value={1}>至少 1 款</option>
              <option value={2}>至少 2 款</option>
              <option value={3}>至少 3 款</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categorize Progress & CTA */}
      <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          {categorizing ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                  <span>正在获取元数据并智能匹配...</span>
                </span>
                <span className="font-mono text-sky-400 font-bold">{progress?.percent || 0}%</span>
              </div>
              <div className="w-full bg-[#0e141b] h-2.5 rounded-full overflow-hidden border border-[#2a3f5a]/30">
                <div
                  className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress?.percent || 0}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-[#8f98a0] truncate">
                正在处理: {progress?.currentApp || '准备中...'}
              </p>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-[#8f98a0]">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>点击下方按钮即可运行智能匹配，并在下一步中可视化预览所有生成的分类与游戏。</span>
            </div>
          )}
        </div>

        <button
          onClick={onStartCategorize}
          disabled={categorizing || selectedPresetGroups.length === 0}
          className="w-full md:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-5 h-5" />
          <span>{categorizing ? '智能归类计算中...' : '开始智能分类'}</span>
        </button>
      </div>
    </div>
  );
}
