import docOverview from '@repo/README.md?raw';
import docArchitecture from '@repo/docs/architecture.md?raw';
import docGuide from '@/assets/docs/guide.md?raw';
import docGuideZh from '@/assets/docs/guide.zh.md?raw';
import docOverviewZh from '@/assets/docs/overview.zh.md?raw';
import docArchitectureZh from '@/assets/docs/architecture.zh.md?raw';
import docWorkflow from '@/assets/docs/workflow.md?raw';
import docWorkflowZh from '@/assets/docs/workflow.zh.md?raw';
import docDataFlow from '@/assets/docs/data-flow.md?raw';
import docDataFlowZh from '@/assets/docs/data-flow.zh.md?raw';
import docDome from '@/assets/docs/dome-recovery.md?raw';
import docVerifiers from '@/assets/docs/custom-verifiers.md?raw';
import docEvm from '@/assets/docs/evm-integration.md?raw';
import docMixed from '@/assets/docs/mixed-multisig.md?raw';
import docSdk from '@/assets/docs/sdk-usage.md?raw';

export const DEFAULT_DOC_KEY = 'guide';

export const DOCS = {
  guide: {
    title: { en: 'How It Works & Usage Guide', 'zh-CN': '工作原理与使用指南' },
    content: { en: docGuide, 'zh-CN': docGuideZh },
  },
  overview: {
    title: { en: 'Overview & Verified Status', 'zh-CN': '概览与已验证状态' },
    content: { en: docOverview, 'zh-CN': docOverviewZh },
  },
  architecture: {
    title: { en: 'Core Architecture', 'zh-CN': '核心架构' },
    content: { en: docArchitecture, 'zh-CN': docArchitectureZh },
  },
  workflow: {
    title: { en: 'Workflow Lifecycle', 'zh-CN': '工作流生命周期' },
    content: { en: docWorkflow, 'zh-CN': docWorkflowZh },
  },
  dataFlow: {
    title: { en: 'Data Flow & Storage', 'zh-CN': '数据流与存储' },
    content: { en: docDataFlow, 'zh-CN': docDataFlowZh },
  },
  dome: {
    title: { en: 'Dome Recovery', 'zh-CN': 'Dome 恢复' },
    content: { en: docDome },
  },
  verifiers: {
    title: { en: 'Custom Verifiers', 'zh-CN': '自定义验证器' },
    content: { en: docVerifiers },
  },
  evm: {
    title: { en: 'Ethereum / EVM Integration', 'zh-CN': '以太坊 / EVM 集成' },
    content: { en: docEvm },
  },
  mixed: {
    title: { en: 'Mixed Multi-Sig (N3 + EVM)', 'zh-CN': '混合多签（N3 + EVM）' },
    content: { en: docMixed },
  },
  sdk: {
    title: { en: 'SDK Integration', 'zh-CN': 'SDK 集成' },
    content: { en: docSdk },
  },
};

export function getDocsForLocale(locale = 'en') {
  return Object.fromEntries(
    Object.entries(DOCS).map(([key, value]) => [key, {
      title: value.title?.[locale] || value.title?.en || key,
      content: value.content?.[locale] || value.content?.en || '# Missing documentation',
    }]),
  );
}
