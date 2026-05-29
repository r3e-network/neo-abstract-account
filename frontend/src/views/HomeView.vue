<template>
  <div class="min-h-screen bg-aa-dark text-slate-950">
    <section class="border-b border-slate-200 bg-white">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-14">
        <div class="flex min-w-0 flex-col justify-center">
          <img
            src="/brand/neo-mascot.svg"
            alt=""
            aria-hidden="true"
            width="112"
            height="112"
            class="mb-5 h-24 w-24 animate-float md:h-28 md:w-28"
          />
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {{ t("home.powered", "Neo N3 Powered") }}
          </p>
          <h1 class="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
            {{ t("home.title", "Smart Wallets That Never Lock You Out") }}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            {{
              t(
                "home.subtitle",
                "Create programmable Neo N3 accounts with deterministic addresses, plugin permissions, paymaster relay, DID recovery, and address-market transfer built into one operating console.",
              )
            }}
          </p>

          <div class="mt-7 flex flex-wrap gap-3">
            <router-link to="/console" class="btn-primary">
              {{ t("home.heroPrimaryAction", "Open Console") }}
            </router-link>
            <router-link to="/app" class="btn-secondary">
              {{ t("home.openAppWorkspace", "Open App Workspace") }}
            </router-link>
            <router-link to="/market" class="btn-ghost">
              {{ t("home.heroSecondaryAction", "Browse Address Market") }}
            </router-link>
          </div>

          <dl class="mt-8 grid gap-3 sm:grid-cols-3">
            <div
              v-for="item in statusCards"
              :key="item.label"
              class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <dt class="text-xs font-medium text-slate-500">{{ item.label }}</dt>
              <dd class="mt-1 truncate text-sm font-semibold text-slate-950" :title="item.title">
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </div>

        <aside class="rounded-[20px] border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p class="text-xs font-medium text-slate-500">AA Operations</p>
              <p class="text-sm font-semibold text-slate-950">Main workflow</p>
            </div>
            <span
              class="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
              :class="networkOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="networkOnline ? 'bg-emerald-600' : 'bg-amber-600'"></span>
              {{ networkOnline ? t("home.networkOnline", "Online") : loadingStatus || t("home.networkOffline", "Offline") }}
            </span>
          </div>

          <div class="mt-4 space-y-3">
            <router-link
              v-for="step in primarySteps"
              :key="step.title"
              :to="step.to"
              class="group flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-semibold text-white">
                {{ step.index }}
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-slate-950">{{ step.title }}</span>
                <span class="mt-0.5 block text-xs leading-5 text-slate-600">{{ step.body }}</span>
              </span>
              <span class="ml-auto text-slate-500 transition group-hover:text-emerald-700">→</span>
            </router-link>
          </div>
        </aside>
      </div>
    </section>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section class="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div class="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {{ t("home.capPlugin", "Verification System") }}
              </p>
              <h2 class="mt-2 text-2xl font-semibold text-slate-950">
                {{ t("home.entryAppTitle", "Create and operate AA accounts") }}
              </h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {{
                  t(
                    "home.entryAppBody",
                    "Load an account, compose a transaction, collect signatures, run relay preflight, and broadcast with clear status at every step.",
                  )
                }}
              </p>
            </div>
            <router-link to="/app" class="btn-primary shrink-0">
              {{ t("home.entryAppAction", "Open App Workspace") }}
            </router-link>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-3">
            <div
              v-for="capability in capabilities"
              :key="capability.title"
              class="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p class="text-sm font-semibold text-slate-950">{{ capability.title }}</p>
              <p class="mt-2 text-xs leading-5 text-slate-600">{{ capability.body }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {{ t("home.feature3Title", "Transferable AA addresses") }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-slate-950">
            {{ t("home.entryMarketTitle", "List and acquire AA addresses") }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{
              t(
                "home.entryMarketBody",
                "List AA addresses in trustless on-chain escrow, freeze control during sale, and transfer only the AA shell plus backup-owner governance when the buyer settles.",
              )
            }}
          </p>
          <router-link to="/market" class="btn-secondary mt-5 w-full">
            {{ t("home.entryMarketAction", "Browse Address Market") }}
          </router-link>
        </div>
      </section>

      <!-- paymasterValidation buildTransactionExplorerUrl -->
      <PaymasterValidationBanner
        class="mt-6"
        :explorer-base-url="RUNTIME_CONFIG.explorerBaseUrl"
        i18n-key-prefix="home"
      />

      <section class="mt-6 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div class="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {{ t("home.entryDocsLabel", "Docs") }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-slate-950">
            {{ t("home.entryDocsTitle", "Ship with the right plugin model") }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{
              t(
                "home.entryDocsBody",
                "Use the new hook and plugin guide to choose the right verifier, policy hook, and recovery setup before you deploy or buy an AA address.",
              )
            }}
          </p>
          <div class="mt-5 flex flex-wrap gap-2">
            <router-link :to="{ path: '/docs', query: { doc: 'pluginGuide' } }" class="btn-secondary">
              pluginGuide
            </router-link>
            <router-link to="/docs" class="btn-ghost">
              {{ t("home.devDocsCta", "Developers: Read the Docs") }}
            </router-link>
          </div>
        </div>

        <div class="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {{ t("home.architectureTitle", "Architecture") }}
              </p>
              <h2 class="mt-2 text-xl font-semibold text-slate-950">
                {{ t("home.architectureSubtitle", "Composable account pipeline") }}
              </h2>
            </div>
            <router-link to="/docs" class="text-sm font-semibold text-slate-500 hover:text-slate-950">
              {{ t("home.devDocsCta", "Developers: Read the Docs") }} →
            </router-link>
          </div>
          <ArchitectureDiagram />
        </div>
      </section>

      <section class="sr-only">
        Programmable Accounts for Neo N3. Open App Workspace. Browse Address Market.
        Live-Validated Paymaster Path. Open Validation Ledger. Open Explorer Tx.
        Address Market. ArchitectureDiagram. buildTransactionExplorerUrl.
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { useI18n } from "@/i18n";
import { formatHash as formatHashUtil } from "@/utils/hex.js";
import PaymasterValidationBanner from "@/components/common/PaymasterValidationBanner.vue";
import {
  fetchNetworkStatus,
  fetchNetworkSummary,
} from "@/services/n3indexService.js";
import {
  resolveRuntimeNetwork,
  RUNTIME_CONFIG,
} from "@/config/runtimeConfig.js";

const ArchitectureDiagram = defineAsyncComponent(
  () => import("@/components/ArchitectureDiagram.vue"),
);

const { t } = useI18n();
const runtimeNetwork = resolveRuntimeNetwork();
const networkSummary = ref(null);
const networkStatus = ref(null);
const loadingStatus = ref(t("home.loadingNetworkStatus", "Loading network status..."));

const networkOnline = computed(
  () => !!(networkSummary.value || networkStatus.value),
);

const networkName = computed(() =>
  runtimeNetwork === "mainnet"
    ? t("nav.networkMainnet", "Neo N3 Mainnet")
    : t("nav.networkTestnet", "Neo N3 Testnet"),
);

const accountHash = computed(() => formatHash(RUNTIME_CONFIG.abstractAccountHash));
const marketHash = computed(() => formatHash(RUNTIME_CONFIG.addressMarketHash));

const statusCards = computed(() => [
  {
    label: t("console.statNetwork", "Network"),
    value: networkName.value,
    title: networkName.value,
  },
  {
    label: t("console.statContract", "Contract"),
    value: accountHash.value,
    title: RUNTIME_CONFIG.abstractAccountHash || "",
  },
  {
    label: t("console.serviceMarketTitle", "Address Market"),
    value: marketHash.value,
    title: RUNTIME_CONFIG.addressMarketHash || "",
  },
]);

const primarySteps = computed(() => [
  {
    index: "01",
    title: t("console.serviceWorkspaceTitle", "Account Workspace"),
    body: t(
      "console.serviceWorkspaceBody",
      "Create accounts, build transactions, collect signatures, and broadcast operations",
    ),
    to: "/app",
  },
  {
    index: "02",
    title: t("console.serviceIdentityTitle", "Identity & DID"),
    body: t(
      "console.serviceIdentityBody",
      "Manage Web3Auth, NeoDID, and social recovery for your accounts",
    ),
    to: "/identity",
  },
  {
    index: "03",
    title: t("console.serviceMarketTitle", "Address Market"),
    body: t(
      "console.serviceMarketBody",
      "Browse, buy, and sell vanity AA addresses with on-chain escrow",
    ),
    to: "/market",
  },
]);

const capabilities = computed(() => [
  {
    title: t("home.feature1Title", "Plugin-based Verification"),
    body: t(
      "home.feature1Body",
      "Choose verifier plugins for your account, from public-key checks to complex policy gates.",
    ),
  },
  {
    title: t("home.feature2Title", "Deterministic Addresses"),
    body: t(
      "home.feature2Body",
      "Derive AA addresses from a seed before deploying, so you always know where your account lives.",
    ),
  },
  {
    title: t("home.feature4Title", "Relay & Paymaster"),
    body: t(
      "home.feature4Body",
      "Submit transactions through a relay with paymaster sponsorship and explicit preflight status.",
    ),
  },
]);

onMounted(() => {
  loadNetworkStatus();
});

async function loadNetworkStatus() {
  loadingStatus.value = t(
    "home.connectingToN3Index",
    "Connecting to N3Index...",
  );
  try {
    const [summary, status] = await Promise.all([
      fetchNetworkSummary({ network: runtimeNetwork }),
      fetchNetworkStatus({ network: runtimeNetwork }),
    ]);
    networkSummary.value = summary?.data || null;
    networkStatus.value = status?.data || null;
    loadingStatus.value = null;
  } catch (_error) {
    if (import.meta.env.DEV)
      console.error("Home: N3Index status fetch failed:", _error?.message);
    networkSummary.value = null;
    networkStatus.value = null;
    loadingStatus.value = t("home.networkOffline", "Offline");
  }
}

function formatHash(value = "") {
  return formatHashUtil(value, {
    notSetLabel: "--",
    separator: "...",
    shortCircuitLength: null,
  });
}
</script>
