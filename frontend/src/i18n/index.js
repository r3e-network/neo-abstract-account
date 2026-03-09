import { ref } from 'vue';

export const DEFAULT_LOCALE = 'en';
export const I18N_STORAGE_KEY = 'aa_locale';
export const SUPPORTED_LOCALES = Object.freeze([
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '中文' },
]);

const MESSAGES = {
  en: {
    nav: {
      home: 'Home',
      docs: 'Docs',
      connect: 'Connect Wallet',
      disconnect: 'Disconnect',
      language: 'Language',
    },
    brand: {
      name: 'Abstract Account',
    },
    footer: {
      builtWith: 'Neo Abstract Account Workspace. Built with passion for Web3.',
    },
    docs: {
      heading: 'Documentation',
    },
    home: {
      powered: 'Neo N3 Powered',
      title: 'Abstract Account Workspace',
      subtitle: 'Load an Abstract Account, compose wrapped operations, collect mixed Neo + EVM approvals, persist anonymous drafts, and choose the final client-side or relay submission path from one app-first home screen.',
      architectureTitle: 'How Abstract Accounts Work on Neo N3',
      architectureSubtitle: 'The home workspace stages hardened AA wrapper calls like executeByAddress and relay-ready executeMetaTxByAddress flows, while governance, policy checks, and deterministic verification stay enforced by the master contract pipeline.',
    },
    studio: {
      powered: 'Neo N3 Powered',
      title: 'Abstract Account Workspace',
      subtitle: 'Construct transactions, execute operations, and manage deterministic smart-contract accounts with ease.',
      tabs: {
        operations: 'Operations Workspace',
        create: 'Create Account',
        manage: 'Manage Governance',
        permissions: 'Permissions & Limits',
        source: 'View Source',
      },
    },
    operations: {
      workspaceTitle: 'Abstract Account Workspace',
      workspaceHero: 'Load, compose, sign, share, and broadcast',
      workspaceSubtitle: 'App-first operations for Neo Abstract Accounts with anonymous Supabase drafts, mixed Neo + EVM signature collection, and both client-side and relay broadcast paths.',
      connectNeoWallet: 'Connect Neo Wallet',
      connectEvmWallet: 'Connect EVM Wallet',
      copyShareLink: 'Copy Share Link',
      copyCollaboratorLink: 'Copy Collaborator Link',
      copyOperatorLink: 'Copy Operator Link',
      rotateCollaboratorLink: 'Rotate Collaborator Link',
      rotateOperatorLink: 'Rotate Operator Link',
      exportDraftJson: 'Export Draft JSON',
      collaborationLabel: 'Collaboration:',
      collaborationReady: 'Supabase ready',
      collaborationLocalOnly: 'Local-only fallback',
      neoWalletLabel: 'Neo wallet:',
      evmWalletLabel: 'EVM wallet:',
      signatureProgressLabel: 'Signature progress:',
      loadAccountTitle: 'Load Abstract Account',
      loadAccountSubtitle: 'Load a bound AA and derive both lookup and signer forms.',
      loadAction: 'Load',
      accountIdHexLabel: 'Account ID (hex)',
      boundAddressHashLabel: 'Bound Address Hash',
      composeTitle: 'Compose Operation',
      composeSubtitle: 'Build common AA wrapper payloads with presets, then stage an immutable draft.',
      stageAction: 'Stage',
      tokenScriptHashLabel: 'Token Script Hash',
      recipientLabel: 'Recipient Address / Hash',
      amountLabel: 'Amount',
      dataLabel: 'Data JSON / Text',
      draftTitleLabel: 'Draft Title',
      draftDescriptionLabel: 'Draft Description',
      targetContractLabel: 'Target Contract',
      methodLabel: 'Method',
      argsJsonLabel: 'Args JSON',
      presetSummaryLabel: 'Preset Summary:',
      signatureWorkflowTitle: 'Signature Workflow',
      signatureWorkflowSubtitle: 'Collect Neo and EVM approvals against one immutable shared draft.',
      appendManualSignature: 'Append Manual Signature',
      signerIdLabel: 'Signer ID',
      signerKindLabel: 'Signer Kind',
      signatureHexLabel: 'Signature Hex',
      requiredSignersLabel: 'Required Signers:',
      collectedSignaturesLabel: 'Collected Signatures:',
      broadcastOptionsTitle: 'Broadcast Options',
      broadcastOptionsSubtitle: 'Choose local wallet broadcast or relay submission.',
      createShareDraft: 'Create Share Draft',
      relayPayloadLabel: 'Relay Payload',
      relayEndpointLabel: 'Relay endpoint:',
      bestAvailable: 'Best Available',
      signedRawTx: 'Signed Raw Tx',
      metaInvocation: 'Meta Invocation',
      clientMode: 'client',
      relayMode: 'relay',
      notConfigured: 'not configured',
      relayPreflightTitle: 'Relay Preflight',
      relayPreflightSubtitle: 'Inspect the latest relay simulation result before broadcasting.',
      copyPayload: 'Copy Payload',
      copyStack: 'Copy Stack',
      exportJson: 'Export JSON',
      copied: 'Copied!',
      activitySidebarTitle: 'Draft Activity',
      recentActivityTitle: 'Recent Activity',
    },
    sharedDraft: {
      title: 'Shared Transaction Draft',
      subtitle: 'Load an immutable transaction draft, review collected approvals, append a new signature, and choose the final client-side or relay broadcast path.',
      sharedDraftOverview: 'Shared Draft Overview',
      collaboratorLinkLabel: 'Collaborator Link',
      operatorLinkLabel: 'Operator Link',
      readOnlyNotice: 'This shared draft is read-only. Open the Collaborator Link to sign, or the Operator Link to manage relay and broadcast actions.',
      signatureOnlyNotice: 'This is a signature-only link. Relay checks, broadcasts, and link rotation require the Operator Link.',
      recentActivityTitle: 'Recent Activity',
      collectedSignaturesTitle: 'Collected Signatures',
      noSignaturesYet: 'No signatures have been attached yet.',
      returnHome: 'Return Home',
      openInExplorer: 'Open in Explorer',
      viewFullSignature: 'View Full Signature',
      broadcastWithNeoWallet: 'Broadcast with Neo Wallet',
      checkRelay: 'Check Relay',
      submitViaRelay: 'Submit via Relay',
      broadcasting: 'Broadcasting…',
      checkingRelay: 'Checking Relay…',
      submitting: 'Submitting…',
    },
    studioPanels: {
      createTitle: 'Create Abstract Account',
      createSubtitle: 'Configure identity and signer roles, then register with a single transaction.',
      manageTitle: 'Manage Governance',
      permissionsTitle: 'Permissions & Limits',
      sourceTitle: 'Contract Source',
      sidebarChecklist: 'Pre-flight Checklist',
      walletConnected: 'Wallet Connected',
      connectToContinue: 'Connect to continue',
      accountId: 'Account ID',
      provideIdentifier: 'Provide an identifier',
      validAdmin: 'Valid Admin',
      addAtLeastOne: 'Add at least one',
      recentActivity: 'Recent Activity',
      noTransactionsYet: 'No transactions yet',
      view: 'View',
    },
  },
  'zh-CN': {
    nav: {
      home: '首页',
      docs: '文档',
      connect: '连接钱包',
      disconnect: '断开连接',
      language: '语言',
    },
    brand: {
      name: '抽象账户',
    },
    footer: {
      builtWith: 'Neo 抽象账户工作台。为 Web3 精心打造。',
    },
    docs: {
      heading: '文档中心',
    },
    home: {
      powered: '由 Neo N3 驱动',
      title: '抽象账户工作台',
      subtitle: '在一个以应用为中心的首页中加载抽象账户、组合封装操作、收集 Neo + EVM 混合签名、持久化匿名草稿，并选择最终的客户端或中继提交流程。',
      architectureTitle: 'Neo N3 抽象账户如何工作',
      architectureSubtitle: '首页工作台会预构建 executeByAddress 与 executeMetaTxByAddress 这类加固后的 AA 包装调用，而治理、策略检查与确定性验证仍由主合约流水线统一执行。',
    },
    studio: {
      powered: '由 Neo N3 驱动',
      title: '抽象账户工作台',
      subtitle: '轻松构造交易、执行操作，并管理确定性智能合约账户。',
      tabs: {
        operations: '操作工作台',
        create: '创建账户',
        manage: '治理管理',
        permissions: '权限与限额',
        source: '查看源码',
      },
    },
    operations: {
      workspaceTitle: '抽象账户工作台',
      workspaceHero: '加载、组合、签名、分享与广播',
      workspaceSubtitle: '面向应用的 Neo 抽象账户操作工作台，支持匿名 Supabase 草稿、Neo + EVM 混合签名收集，以及客户端与中继双广播路径。',
      connectNeoWallet: '连接 Neo 钱包',
      connectEvmWallet: '连接 EVM 钱包',
      copyShareLink: '复制分享链接',
      copyCollaboratorLink: '复制协作者链接',
      copyOperatorLink: '复制操作员链接',
      rotateCollaboratorLink: '轮换协作者链接',
      rotateOperatorLink: '轮换操作员链接',
      exportDraftJson: '导出草稿 JSON',
      collaborationLabel: '协作：',
      collaborationReady: 'Supabase 已就绪',
      collaborationLocalOnly: '仅本地回退',
      neoWalletLabel: 'Neo 钱包：',
      evmWalletLabel: 'EVM 钱包：',
      signatureProgressLabel: '签名进度：',
      loadAccountTitle: '加载抽象账户',
      loadAccountSubtitle: '加载已绑定的抽象账户，并同时推导查询与签名形式。',
      loadAction: '加载',
      accountIdHexLabel: '账户 ID（十六进制）',
      boundAddressHashLabel: '绑定地址哈希',
      composeTitle: '组合操作',
      composeSubtitle: '通过预设快速构建常见 AA 包装载荷，然后冻结为不可变草稿。',
      stageAction: '暂存',
      tokenScriptHashLabel: '代币脚本哈希',
      recipientLabel: '接收地址 / 哈希',
      amountLabel: '数量',
      dataLabel: '数据 JSON / 文本',
      draftTitleLabel: '草稿标题',
      draftDescriptionLabel: '草稿描述',
      targetContractLabel: '目标合约',
      methodLabel: '方法',
      argsJsonLabel: '参数 JSON',
      presetSummaryLabel: '预设摘要：',
      signatureWorkflowTitle: '签名流程',
      signatureWorkflowSubtitle: '围绕同一份不可变共享草稿收集 Neo 与 EVM 授权。',
      appendManualSignature: '追加手动签名',
      signerIdLabel: '签名者 ID',
      signerKindLabel: '签名类型',
      signatureHexLabel: '签名十六进制',
      requiredSignersLabel: '需要的签名者：',
      collectedSignaturesLabel: '已收集签名：',
      broadcastOptionsTitle: '广播选项',
      broadcastOptionsSubtitle: '选择本地钱包广播或中继提交。',
      createShareDraft: '创建共享草稿',
      relayPayloadLabel: '中继载荷',
      relayEndpointLabel: '中继端点：',
      bestAvailable: '最佳可用',
      signedRawTx: '已签名原始交易',
      metaInvocation: '元调用',
      clientMode: '客户端',
      relayMode: '中继',
      notConfigured: '未配置',
      relayPreflightTitle: '中继预检',
      relayPreflightSubtitle: '在广播之前检查最近一次中继模拟结果。',
      copyPayload: '复制载荷',
      copyStack: '复制栈',
      exportJson: '导出 JSON',
      copied: '已复制！',
      activitySidebarTitle: '草稿活动',
      recentActivityTitle: '最近活动',
    },
    sharedDraft: {
      title: '共享交易草稿',
      subtitle: '加载不可变交易草稿，查看已收集的授权，追加新签名，并选择最终的客户端或中继广播路径。',
      sharedDraftOverview: '共享草稿总览',
      collaboratorLinkLabel: '协作者链接',
      operatorLinkLabel: '操作员链接',
      readOnlyNotice: '当前共享草稿为只读。请打开协作者链接以签名，或打开操作员链接以执行中继与广播操作。',
      signatureOnlyNotice: '这是一个仅签名链接。中继检查、广播与链接轮换需要操作员链接。',
      recentActivityTitle: '最近活动',
      collectedSignaturesTitle: '已收集签名',
      noSignaturesYet: '尚未附加任何签名。',
      returnHome: '返回首页',
      openInExplorer: '在浏览器中打开',
      viewFullSignature: '查看完整签名',
      broadcastWithNeoWallet: '使用 Neo 钱包广播',
      checkRelay: '检查中继',
      submitViaRelay: '通过中继提交',
      broadcasting: '广播中…',
      checkingRelay: '检查中…',
      submitting: '提交中…',
    },
    studioPanels: {
      createTitle: '创建抽象账户',
      createSubtitle: '配置身份与签名角色，然后通过一笔交易完成注册。',
      manageTitle: '治理管理',
      permissionsTitle: '权限与限额',
      sourceTitle: '合约源码',
      sidebarChecklist: '预检清单',
      walletConnected: '钱包已连接',
      connectToContinue: '请先连接钱包',
      accountId: '账户 ID',
      provideIdentifier: '请提供标识符',
      validAdmin: '有效管理员',
      addAtLeastOne: '至少添加一个',
      recentActivity: '最近活动',
      noTransactionsYet: '暂无交易',
      view: '查看',
    },
  },
};

let singleton = null;

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.some((item) => item.code === locale) ? locale : DEFAULT_LOCALE;
}

function readStoredLocale(storage) {
  const backend = getStorage(storage);
  const stored = backend?.getItem(I18N_STORAGE_KEY) || DEFAULT_LOCALE;
  return normalizeLocale(stored);
}

function lookupMessage(locale, key) {
  return String(key || '')
    .split('.')
    .reduce((current, segment) => (current && typeof current === 'object' ? current[segment] : undefined), MESSAGES[locale]);
}

function syncDocumentLocale(locale) {
  try {
    if (globalThis.document?.documentElement) {
      globalThis.document.documentElement.lang = locale;
    }
  } catch {}
}

export function createI18nController({ storage = null, forceNew = false } = {}) {
  if (singleton && !forceNew) {
    return singleton;
  }

  const backend = getStorage(storage);
  const locale = ref(readStoredLocale(backend));
  syncDocumentLocale(locale.value);

  const controller = {
    locale,
    locales: SUPPORTED_LOCALES,
    setLocale(nextLocale) {
      const normalized = normalizeLocale(nextLocale);
      locale.value = normalized;
      backend?.setItem(I18N_STORAGE_KEY, normalized);
      syncDocumentLocale(normalized);
    },
    t(key, fallback = '') {
      return lookupMessage(locale.value, key) ?? fallback ?? key;
    },
  };

  singleton = controller;
  return controller;
}

export function useI18n() {
  return createI18nController();
}
