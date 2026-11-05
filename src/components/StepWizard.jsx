import React from 'react';
import { Database, Sliders, Eye, CheckCircle2 } from 'lucide-react';

export default function StepWizard({ currentStep, onStepClick, stepsStatus }) {
  const steps = [
    { id: 1, title: '1. 扫描库存', desc: '检测路径与游戏', icon: Database },
    { id: 2, title: '2. 选择方案', desc: '设定分类规则', icon: Sliders },
    { id: 3, title: '3. 预览微调', desc: '查看与自定义', icon: Eye },
    { id: 4, title: '4. 写入客户端', desc: '备份并直接分类', icon: CheckCircle2 },
  ];

  return (
    <div className="w-full bg-[#131c26] border border-[#2a3f5a]/40 rounded-2xl p-4 mb-6 shadow-md">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.id;
          const isDone = currentStep > s.id;
          const canClick = stepsStatus?.[s.id] || isDone || isActive;

          return (
            <button
              key={s.id}
              disabled={!canClick}
              onClick={() => onStepClick(s.id)}
              className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/40'
                  : isDone
                  ? 'bg-[#182433] border-emerald-500/30 text-[#c6d4df] hover:border-emerald-500/60'
                  : 'bg-[#101822]/60 border-[#2a3f5a]/30 text-[#627180] opacity-60 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-sky-500 text-white'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#1b2838] text-[#627180]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-semibold truncate ${isActive ? 'text-sky-300' : ''}`}>
                  {s.title}
                </div>
                <div className="text-xs text-[#8f98a0] truncate">{s.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
