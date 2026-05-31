<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    fill="none"
    role="img"
    :aria-label="label"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{{ label }}</title>
    <defs>
      <linearGradient :id="ids.tile" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
        <stop :stop-color="theme.from" />
        <stop offset="1" :stop-color="theme.to" />
      </linearGradient>
      <radialGradient :id="ids.sheen" cx="0.3" cy="0.22" r="0.7">
        <stop stop-color="#FFFFFF" stop-opacity="0.45" />
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect x="4" y="4" width="40" height="40" rx="13" :fill="`url(#${ids.tile})`" />
    <rect x="4" y="4" width="40" height="40" rx="13" :fill="`url(#${ids.sheen})`" />
    <rect x="4.75" y="4.75" width="38.5" height="38.5" rx="12.25" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5" />

    <!-- finance: growth chart + coin -->
    <g v-if="name === 'finance'">
      <path d="M16 32l6-7 5 4 7-9" :stroke="theme.accent" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <path d="M30 18h6v6" :stroke="theme.accent" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="22" cy="34" r="3.4" :fill="theme.soft" />
    </g>
    <!-- game: controller -->
    <g v-else-if="name === 'game'">
      <rect x="13" y="20" width="22" height="14" rx="7" :fill="theme.soft" />
      <line x1="20" y1="27" x2="24" y2="27" :stroke="theme.accent" stroke-width="2.6" stroke-linecap="round" />
      <line x1="22" y1="25" x2="22" y2="29" :stroke="theme.accent" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="31" cy="25.5" r="1.9" :fill="theme.accent" />
      <circle cx="33.5" cy="29" r="1.9" :fill="theme.accent" />
    </g>
    <!-- governance: building / pillars -->
    <g v-else-if="name === 'governance'">
      <path d="M24 14l11 6H13l11-6Z" :fill="theme.soft" />
      <rect x="16" y="22" width="3" height="9" rx="1.5" :fill="theme.accent" />
      <rect x="22.5" y="22" width="3" height="9" rx="1.5" :fill="theme.accent" />
      <rect x="29" y="22" width="3" height="9" rx="1.5" :fill="theme.accent" />
      <rect x="13" y="32" width="22" height="3" rx="1.5" :fill="theme.accent" />
    </g>
    <!-- identity: ID badge -->
    <g v-else-if="name === 'identity'">
      <rect x="14" y="15" width="20" height="18" rx="5" :fill="theme.soft" />
      <circle cx="24" cy="22" r="3.4" :fill="theme.accent" />
      <path d="M18.5 30c1.2-3 9.8-3 11 0" :stroke="theme.accent" stroke-width="2.6" stroke-linecap="round" fill="none" />
    </g>
    <!-- oracle: eye -->
    <g v-else-if="name === 'oracle'">
      <path d="M12 24c4-6 20-6 24 0-4 6-20 6-24 0Z" :fill="theme.soft" />
      <circle cx="24" cy="24" r="4.6" :fill="theme.accent" />
      <circle cx="24" cy="24" r="2" fill="#1E1E2E" fill-opacity="0.55" />
    </g>
    <!-- social: chat bubbles -->
    <g v-else-if="name === 'social'">
      <path d="M14 17h13a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7l-4 3v-3a3 3 0 0 1-2-2.8V20a3 3 0 0 1 3-3Z" :fill="theme.soft" />
      <circle cx="19" cy="23" r="1.6" :fill="theme.accent" />
      <circle cx="24" cy="23" r="1.6" :fill="theme.accent" />
      <path d="M30 21h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2l-3-2" :fill="theme.accent" fill-opacity="0.85" />
    </g>
    <!-- tool: wrench -->
    <g v-else-if="name === 'tool'">
      <path
        d="M30.5 16a5.5 5.5 0 0 0-6.8 7l-8.4 8.4a2.4 2.4 0 0 0 3.4 3.4l8.4-8.4a5.5 5.5 0 0 0 7-6.8l-3.3 3.3-3-0.8-0.8-3 3.5-3.1Z"
        :fill="theme.soft"
      />
      <circle cx="17.5" cy="32.5" r="1.6" :fill="theme.accent" />
    </g>
    <!-- nft: framed image -->
    <g v-else-if="name === 'nft'">
      <rect x="14" y="15" width="20" height="18" rx="4" :fill="theme.soft" />
      <circle cx="20" cy="21" r="2.4" :fill="theme.accent" />
      <path d="M16 31l5-6 4 4 3-3 4 5H16Z" :fill="theme.accent" />
    </g>
    <!-- security: shield + check -->
    <g v-else-if="name === 'security'">
      <path d="M24 14l9 4v6c0 6-4 9.5-9 11-5-1.5-9-5-9-11v-6l9-4Z" :fill="theme.soft" />
      <path d="M20 24l3 3 6-6" :stroke="theme.accent" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
    <!-- wallet: card pocket -->
    <g v-else>
      <rect x="13" y="17" width="22" height="15" rx="4.5" :fill="theme.soft" />
      <path d="M13 22h22" :stroke="theme.accent" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="30" cy="27" r="2" :fill="theme.accent" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from "vue";
import { nextUid } from "./uid.js";

const props = defineProps({
  name: { type: String, default: "wallet" },
  size: { type: [Number, String], default: 48 },
  title: { type: String, default: "" },
});

const THEME = {
  finance: { from: "#4BE2A6", to: "#16C784", accent: "#FFFFFF", soft: "#BFF6E1" },
  game: { from: "#A795FF", to: "#7B61FF", accent: "#FFFFFF", soft: "#E0E2FF" },
  governance: { from: "#7FB2FF", to: "#4F86F7", accent: "#FFFFFF", soft: "#DFF0FF" },
  identity: { from: "#FFC9B6", to: "#FF8E6E", accent: "#FFFFFF", soft: "#FFEBE4" },
  oracle: { from: "#9B8CFF", to: "#6A4FE6", accent: "#FFFFFF", soft: "#E0E2FF" },
  social: { from: "#5BD0C0", to: "#16C7A8", accent: "#FFFFFF", soft: "#D5EEC9" },
  tool: { from: "#FFD58A", to: "#FFB23E", accent: "#FFFFFF", soft: "#FFE4C3" },
  nft: { from: "#F58BD0", to: "#D957A8", accent: "#FFFFFF", soft: "#FFE4F4" },
  security: { from: "#4BE2A6", to: "#16C784", accent: "#FFFFFF", soft: "#D5EEC9" },
  wallet: { from: "#A795FF", to: "#7B61FF", accent: "#FFFFFF", soft: "#E0E2FF" },
};

const LABELS = {
  finance: "Finance", game: "Game", governance: "Governance", identity: "Identity",
  oracle: "Oracle", social: "Social", tool: "Tool", nft: "NFT",
  security: "Security", wallet: "Wallet",
};

const theme = computed(() => THEME[props.name] || THEME.wallet);
const label = computed(() => props.title || LABELS[props.name] || props.name);

const uid = nextUid("ci");
const ids = {
  tile: `${uid}-tile`,
  sheen: `${uid}-sheen`,
};
</script>
