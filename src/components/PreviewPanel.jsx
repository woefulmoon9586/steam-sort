import React, { useState } from 'react';
import { Eye, Search, Trash2, Edit2, Plus, X, FolderCheck, AlertCircle, ArrowRight } from 'lucide-react';

export default function PreviewPanel({
  collections,
  setCollections,
  uncategorized,
  allGames,
  onNextStep,
}) {
  const [selectedColId, setSelectedColId] = useState(collections[0]?.id || 'uncategorized');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingColId, setEditingColId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newColName, setNewColName] = useState('');

  const currentCollection = collections.find((c) => c.id === selectedColId);
  const isViewingUncategorized = selectedColId === 'uncategorized';

  // Games in currently selected view
  const currentGames = isViewingUncategorized
    ? uncategorized || []
    : currentCollection?.games || [];

  const filteredGames = currentGames.filter((g) =>
    (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(g.appid).includes(searchQuery)
  );

  // Remove a game from collection
  const handleRemoveGame = (colId, appid) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id === colId) {
          const newAdded = c.added.filter((id) => id !== appid);
          const newGames = c.games.filter((g) => g.appid !== appid);
          return {
            ...c,
            added: newAdded,
            games: newGames,
            gameCount: newAdded.length,
          };
        }
        return c;
      })
    );
  };

  // Delete an entire collection
  const handleDeleteCollection = (colId) => {
    const updated = collections.filter((c) => c.id !== colId);
    setCollections(updated);
    if (selectedColId === colId) {
      setSelectedColId(updated[0]?.id || 'uncategorized');
    }
  };

  // Rename a collection
  const handleSaveRename = (colId) => {
    if (!editingName.trim()) return;
    setCollections((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, name: editingName.trim() } : c))
    );
    setEditingColId(null);
  };

  // Add custom collection
  const handleAddCollection = () => {
    if (!newColName.trim()) return;
    const newId = `uc-sort-custom-${Date.now()}`;
    const newCol = {
      id: newId,
      name: newColName.trim(),
      groupId: 'custom',
      added: [],
      removed: [],
      games: [],
      gameCount: 0,
    };
    setCollections([...collections, newCol]);
    setSelectedColId(newId);
    setNewColName('');
    setShowAddModal(false);
  };

  // Add game from uncategorized into a collection
  const handleAssignGame = (targetColId, game) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id === targetColId) {
          if (!c.added.includes(game.appid)) {
            const newAdded = [...c.added, game.appid];
            const newGames = [...c.games, game];
            return {
              ...c,
              added: newAdded,
              games: newGames,
              gameCount: newAdded.length,
            };
          }
        }
        return c;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Eye className="w-5 h-5 text-sky-400" />
            <span>分类预览与自定义微调</span>
          </h3>
          <p className="text-xs text-[#8f98a0] mt-0.5">
            共生成 {collections.length} 个分类，您可以自由重命名、移除游戏或创建自己的专属标签
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-[#214b6b] hover:bg-sky-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>新建分类</span>
          </button>
          <button
            onClick={onNextStep}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md transition"
          >
            <span>下一步：确认写入</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dual-pane Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Categories Sidebar */}
        <div className="md:col-span-4 bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-3 shadow-sm flex flex-col h-[580px]">
          <div className="text-xs font-bold text-[#8f98a0] uppercase tracking-wider px-2 py-1 mb-2 flex justify-between items-center">
            <span>Steam 库侧边栏分类 ({collections.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {collections.map((col) => {
              const isSelected = selectedColId === col.id;
              const isEditing = editingColId === col.id;

              return (
                <div
                  key={col.id}
                  onClick={() => !isEditing && setSelectedColId(col.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-950/30 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/30'
                      : 'bg-[#101822]/60 border-transparent hover:border-[#2a3f5a] text-[#c6d4df] hover:bg-[#182433]'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(col.id)}
                        onBlur={() => handleSaveRename(col.id)}
                        autoFocus
                        className="bg-[#0e141b] border border-sky-500 text-white text-xs px-2 py-1 rounded w-full focus:outline-none"
                      />
                    ) : (
                      <span className="truncate font-semibold">{col.name}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-sky-500 text-white' : 'bg-[#1b2838] text-[#8f98a0]'
                      }`}
                    >
                      {col.gameCount}
                    </span>

                    {/* Actions on hover or active */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingColId(col.id);
                        setEditingName(col.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#8f98a0] hover:text-white transition"
                      title="重命名"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(col.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition"
                      title="删除此分类"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Uncategorized Games Bucket */}
            {uncategorized && uncategorized.length > 0 && (
              <div
                onClick={() => setSelectedColId('uncategorized')}
                className={`mt-3 flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  selectedColId === 'uncategorized'
                    ? 'bg-amber-950/30 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/30'
                    : 'bg-[#18201a]/40 border-amber-500/30 text-amber-300 hover:bg-amber-950/20'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">未匹配/未分类游戏</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                  {uncategorized.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Games Preview Pane */}
        <div className="md:col-span-8 bg-[#131c26] border border-[#2a3f5a]/40 rounded-xl p-5 shadow-sm flex flex-col h-[580px]">
          {/* Header of selected collection */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#2a3f5a]/40">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white">
                  {isViewingUncategorized ? '未匹配游戏列表' : currentCollection?.name}
                </span>
                <span className="text-xs bg-[#214b6b] text-sky-200 px-2 py-0.5 rounded-full">
                  {currentGames.length} 款
                </span>
              </div>
              <p className="text-xs text-[#8f98a0] mt-0.5">
                {isViewingUncategorized
                  ? '这些游戏未命中当前勾选的规则，您可以手动将它们分配到上方任意分类。'
                  : '以下游戏将在 Steam 启动后出现在此分类下。'}
              </p>
            </div>

            {/* Local search within category */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-[#8f98a0] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="在分类中搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0e141b] border border-[#2a3f5a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#627180] focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Games Grid in selected collection */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {filteredGames.length === 0 ? (
              <div className="py-20 text-center text-[#8f98a0]">
                未找到匹配的游戏
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredGames.map((game) => (
                  <div
                    key={game.appid}
                    className="bg-[#101822] border border-[#2a3f5a]/40 rounded-lg overflow-hidden group hover:border-sky-500/60 transition shadow-sm relative flex flex-col justify-between"
                  >
                    <div>
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
                        {/* Installed or Family badge */}
                        {game.installed ? (
                          <span className="absolute top-1.5 left-1.5 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            已安装
                          </span>
                        ) : game.isFamily ? (
                          <span className="absolute top-1.5 left-1.5 bg-purple-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            家庭共享
                          </span>
                        ) : null}

                        {/* Remove button */}
                        {!isViewingUncategorized && (
                          <button
                            onClick={() => handleRemoveGame(selectedColId, game.appid)}
                            className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow"
                            title="从此分类移除"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {game.playtimeHours > 0 && (
                          <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-sky-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                            {game.playtimeHours}h
                          </span>
                        )}
                      </div>

                      <div className="p-2.5">
                        <div className="text-xs font-semibold text-white truncate" title={game.name}>
                          {game.name}
                        </div>
                        {game.genres && game.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {game.genres.slice(0, 2).map((g, i) => (
                              <span
                                key={i}
                                className="text-[9px] bg-[#1b2838] text-[#8f98a0] px-1.5 py-0.5 rounded"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick assign button if in uncategorized view */}
                    {isViewingUncategorized && (
                      <div className="p-2 pt-0 border-t border-[#2a3f5a]/20 mt-1">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignGame(e.target.value, game);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          className="w-full bg-[#0e141b] text-[10px] text-sky-400 border border-[#2a3f5a] rounded px-1.5 py-1 focus:outline-none"
                        >
                          <option value="" disabled>
                            ➕ 加入分类...
                          </option>
                          {collections.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Collection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171d25] border border-[#2a3f5a] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h4 className="text-base font-bold text-white mb-2">新建自定义分类</h4>
            <p className="text-xs text-[#8f98a0] mb-4">
              创建一个新的分类栏目，可以在名称前加上 Emoji（例如：🎮 我的神作）
            </p>
            <input
              type="text"
              placeholder="例如：⭐ 必玩大作、🔥 联机车队..."
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()}
              autoFocus
              className="w-full bg-[#0e141b] border border-[#2a3f5a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8f98a0] hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleAddCollection}
                disabled={!newColName.trim()}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition"
              >
                创建分类
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
