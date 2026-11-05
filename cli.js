#!/usr/bin/env node

/**
 * SteamSort CLI Tool
 */

import { detectSteamPath, isSteamRunning, getSteamAccounts } from './server/steamDetector.js';
import { getUnifiedLibrary } from './server/libraryParser.js';
import { batchEnrichGames } from './server/metadataService.js';
import { PRESET_CATEGORIES } from './server/presets.js';
import { categorizeGames } from './server/categorizer.js';
import { writeCollectionsToSteam, listBackups, restoreBackup } from './server/steamWriter.js';

async function main() {
  console.log('\n===========================================');
  console.log('       🎮 SteamSort 命令行助手');
  console.log('===========================================\n');

  const steamPath = await detectSteamPath();
  if (!steamPath) {
    console.error('❌ 未能自动检测到 Steam 安装路径，请检查 Steam 是否安装。');
    process.exit(1);
  }
  console.log(`✅ 检测到 Steam 路径: ${steamPath}`);

  const running = await isSteamRunning();
  console.log(`🔍 Steam 运行状态: ${running ? '⚠️ 正在运行 (请在写入前退出)' : '🟢 已完全关闭'}`);

  const accounts = getSteamAccounts(steamPath);
  if (accounts.length === 0) {
    console.error('❌ 未在 Steam userdata 目录下找到用户账号！');
    process.exit(1);
  }

  const targetAccount = accounts[0];
  console.log(`👤 目标账号: ${targetAccount.personaName} (ID: ${targetAccount.accountId})`);

  console.log('\n🔄 正在读取本地库存游戏...');
  const libraryData = await getUnifiedLibrary(steamPath, targetAccount.accountId);
  console.log(`📦 共发现 ${libraryData.totalGames} 款游戏 (已安装: ${libraryData.installedCount}, 家庭共享: ${libraryData.familyCount})`);

  console.log('\n⏳ 正在获取游戏元数据并匹配分类...');
  const enrichedGames = await batchEnrichGames(libraryData.games, (progress) => {
    process.stdout.write(`\r进度: ${progress.percent}% (${progress.completed}/${progress.total}) 当前: ${progress.currentApp.slice(0, 20)}...`);
  });
  console.log('\n✅ 元数据匹配完成！');

  console.log('\n🎯 应用分类方案: 核心游戏品类 + 游玩方式...');
  const result = categorizeGames(enrichedGames, {
    enabledPresetGroups: ['genres', 'playmodes'],
    allowMultiple: true,
    minGamesPerCollection: 1,
  });

  console.log(`\n📋 生成分类 (${result.collections.length} 个):`);
  for (const col of result.collections) {
    console.log(`  - ${col.name}: ${col.gameCount} 款游戏`);
  }

  if (process.argv.includes('--apply')) {
    if (running) {
      console.error('\n❌ 写入失败: Steam 客户端正在运行！请先退出 Steam 客户端后再带 --apply 运行。');
      process.exit(1);
    }

    console.log('\n💾 正在写入 Steam 客户端配置文件...');
    const writeRes = await writeCollectionsToSteam(steamPath, targetAccount.accountId, result.collections, 'merge');
    if (writeRes.success) {
      console.log(`\n🎉 ${writeRes.message}`);
      console.log(`📦 备份文件: ${writeRes.backupFile}`);
      console.log('🚀 现在可以启动 Steam 查看分类！');
    } else {
      console.error(`\n❌ 写入失败: ${writeRes.message}`);
    }
  } else {
    console.log('\n💡 提示: 当前为预览模式，添加 --apply 参数以直接写入 Steam 客户端，或运行 "pnpm start" 启动可视化 Web 界面进行交互调整。');
  }
}

main().catch(err => {
  console.error('运行出错:', err);
  process.exit(1);
});
