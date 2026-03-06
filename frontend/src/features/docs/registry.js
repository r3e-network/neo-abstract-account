import docOverview from '@repo/README.md?raw';
import docArchitecture from '@repo/docs/architecture.md?raw';
import docWorkflow from '@/assets/docs/workflow.md?raw';
import docDataFlow from '@/assets/docs/data-flow.md?raw';
import docDome from '@/assets/docs/dome-recovery.md?raw';
import docVerifiers from '@/assets/docs/custom-verifiers.md?raw';
import docEvm from '@/assets/docs/evm-integration.md?raw';
import docMixed from '@/assets/docs/mixed-multisig.md?raw';
import docSdk from '@/assets/docs/sdk-usage.md?raw';

export const DEFAULT_DOC_KEY = 'overview';

export const DOCS = {
  overview: { title: 'Overview & Verified Status', content: docOverview },
  architecture: { title: 'Core Architecture', content: docArchitecture },
  workflow: { title: 'Workflow Lifecycle', content: docWorkflow },
  dataFlow: { title: 'Data Flow & Storage', content: docDataFlow },
  dome: { title: 'Dome Recovery', content: docDome },
  verifiers: { title: 'Custom Verifiers', content: docVerifiers },
  evm: { title: 'Ethereum / EVM Integration', content: docEvm },
  mixed: { title: 'Mixed Multi-Sig (N3 + EVM)', content: docMixed },
  sdk: { title: 'SDK Integration', content: docSdk }
};
