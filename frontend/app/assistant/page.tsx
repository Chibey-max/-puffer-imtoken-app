'use client';

import AssistantPanel from '@/components/AssistantPanel';
import AwardEvidencePanel from '@/components/AwardEvidencePanel';
import { useLocale } from '@/lib/locale';

export default function AssistantPage() {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="dex-card rounded-xl p-4 card-animate">
        <h1 className="text-xl font-black text-white">{t('AI Assistant Workspace', 'AI 助手工作台')}</h1>
        <p className="text-sm text-[#8ea0bc] mt-1">
          {t('Plan intent-driven staking actions with explicit security boundaries.', '在明确安全边界下进行意图驱动的质押规划。')}
        </p>
      </div>
      <AssistantPanel />
      <AwardEvidencePanel />
    </div>
  );
}
