<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 128 128"
    fill="none"
    role="img"
    :aria-label="title"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{{ title }}</title>
    <defs>
      <linearGradient :id="ids.badge" x1="36" y1="34" x2="92" y2="98" gradientUnits="userSpaceOnUse">
        <stop :stop-color="theme.badgeTop" />
        <stop offset="1" :stop-color="theme.badgeBottom" />
      </linearGradient>
      <linearGradient :id="ids.body" x1="44" y1="40" x2="84" y2="92" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFFFFF" />
        <stop offset="1" :stop-color="theme.faceBottom" />
      </linearGradient>
      <radialGradient :id="ids.sheen" cx="0.35" cy="0.3" r="0.55">
        <stop stop-color="#FFFFFF" stop-opacity="0.85" />
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>
      <radialGradient :id="ids.shadow" cx="0.5" cy="0.5" r="0.5">
        <stop stop-color="#1E1E2E" stop-opacity="0.18" />
        <stop offset="1" stop-color="#1E1E2E" stop-opacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="64" cy="116" rx="38" ry="8" :fill="`url(#${ids.shadow})`" />

    <!-- success confetti / error sweat dots -->
    <template v-if="isSuccess">
      <rect x="22" y="30" width="7" height="7" rx="2" fill="#7B61FF" transform="rotate(20 22 30)" />
      <rect x="98" y="26" width="7" height="7" rx="2" fill="#FFC773" transform="rotate(-15 98 26)" />
      <circle cx="104" cy="64" r="3.5" fill="#16C784" />
      <circle cx="20" cy="62" r="3.5" fill="#FF8E6E" />
      <path d="M30 92l4 4M96 96l4-4" stroke="#7B61FF" stroke-width="3" stroke-linecap="round" />
    </template>
    <template v-else>
      <circle cx="100" cy="44" r="3.2" fill="#FFC773" />
      <circle cx="26" cy="50" r="3" fill="#7B61FF" fill-opacity="0.5" />
    </template>

    <path
      d="M64 28c20 0 34 14 34 34S84 98 64 98 30 84 30 62s14-34 34-34Z"
      :fill="`url(#${ids.badge})`"
      :stroke="theme.badgeEdge"
      stroke-width="2"
    />
    <circle cx="64" cy="63" r="25" :fill="`url(#${ids.body})`" />
    <ellipse cx="56" cy="52" rx="9" ry="5" :fill="`url(#${ids.sheen})`" />

    <template v-if="isSuccess">
      <path d="M53 60c1.6-2 4.4-2 6 0" stroke="#16C784" stroke-width="3" stroke-linecap="round" />
      <path d="M69 60c1.6-2 4.4-2 6 0" stroke="#16C784" stroke-width="3" stroke-linecap="round" />
      <path d="M55 70c3 4 15 4 18 0" stroke="#16C784" stroke-width="3" stroke-linecap="round" />
      <circle cx="92" cy="92" r="14" fill="#16C784" stroke="#FFFFFF" stroke-width="3" />
      <path d="M86 92l4 4 8-9" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else>
      <circle cx="56" cy="60" r="3.4" fill="#F0744F" />
      <circle cx="55" cy="59" r="1" fill="#FFFFFF" />
      <circle cx="72" cy="60" r="3.4" fill="#F0744F" />
      <circle cx="71" cy="59" r="1" fill="#FFFFFF" />
      <path d="M57 73c3-3.5 11-3.5 14 0" stroke="#F0744F" stroke-width="3" stroke-linecap="round" />
      <circle cx="92" cy="92" r="14" fill="#F0744F" stroke="#FFFFFF" stroke-width="3" />
      <line x1="92" y1="86" x2="92" y2="93" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" />
      <circle cx="92" cy="98" r="1.9" fill="#FFFFFF" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from "vue";
import { nextUid } from "./uid.js";

const props = defineProps({
  tone: { type: String, default: "success" }, // success | error
  size: { type: [Number, String], default: 128 },
  title: { type: String, default: "" },
});

const isSuccess = computed(() => props.tone !== "error");

const THEME = {
  success: {
    badgeTop: "#4BE2A6", badgeBottom: "#16C784", badgeEdge: "#0FB174", faceBottom: "#E9F8F0",
  },
  error: {
    badgeTop: "#FFC9B6", badgeBottom: "#FF8E6E", badgeEdge: "#F0744F", faceBottom: "#FFF0EA",
  },
};

const theme = computed(() => (isSuccess.value ? THEME.success : THEME.error));

const uid = nextUid("sta");
const ids = {
  badge: `${uid}-badge`,
  body: `${uid}-body`,
  sheen: `${uid}-sheen`,
  shadow: `${uid}-shadow`,
};
</script>
