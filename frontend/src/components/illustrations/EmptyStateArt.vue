<template>
  <svg
    :width="size"
    :height="height"
    viewBox="0 0 200 160"
    fill="none"
    role="img"
    :aria-label="title"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{{ title }}</title>
    <defs>
      <linearGradient :id="ids.card" x1="40" y1="70" x2="160" y2="150" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFFFFF" />
        <stop offset="1" stop-color="#EEF0F8" />
      </linearGradient>
      <linearGradient :id="ids.body" x1="74" y1="22" x2="126" y2="92" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFFFFF" />
        <stop offset="1" stop-color="#E9ECF6" />
      </linearGradient>
      <linearGradient :id="ids.panel" x1="80" y1="42" x2="120" y2="78" gradientUnits="userSpaceOnUse">
        <stop stop-color="#2A2A3E" />
        <stop offset="1" stop-color="#1E1E2E" />
      </linearGradient>
      <linearGradient :id="ids.coin" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#4BE2A6" />
        <stop offset="1" stop-color="#16C784" />
      </linearGradient>
      <linearGradient :id="ids.coin2" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#A795FF" />
        <stop offset="1" stop-color="#7B61FF" />
      </linearGradient>
      <radialGradient :id="ids.sheen" cx="0.35" cy="0.3" r="0.55">
        <stop stop-color="#FFFFFF" stop-opacity="0.8" />
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>
      <radialGradient :id="ids.shadow" cx="0.5" cy="0.5" r="0.5">
        <stop stop-color="#1E1E2E" stop-opacity="0.16" />
        <stop offset="1" stop-color="#1E1E2E" stop-opacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="100" cy="146" rx="68" ry="10" :fill="`url(#${ids.shadow})`" />

    <g>
      <ellipse cx="44" cy="60" rx="16" ry="15.5" fill="#0FB174" />
      <circle cx="44" cy="56" r="16" :fill="`url(#${ids.coin})`" stroke="#0FB174" stroke-width="1.5" />
      <path d="M38 49v14M38 49l12 14M50 49v14" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <g>
      <ellipse cx="160" cy="46" rx="12" ry="11.5" fill="#5E45E0" />
      <circle cx="160" cy="42" r="12" :fill="`url(#${ids.coin2})`" stroke="#5E45E0" stroke-width="1.5" />
      <circle cx="160" cy="42" r="4.5" stroke="#FFFFFF" stroke-width="2.4" fill-opacity="0" />
    </g>

    <rect x="40" y="78" width="120" height="64" rx="18" :fill="`url(#${ids.card})`" stroke="#E2E5F1" stroke-width="2" />
    <line x1="64" y1="116" x2="136" y2="116" stroke="#D7DBEA" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 12" />
    <line x1="76" y1="128" x2="124" y2="128" stroke="#E3E6F1" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 12" />

    <g>
      <line x1="100" y1="26" x2="100" y2="16" stroke="#D3D8EB" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="100" cy="13" r="5" fill="#16C784" />
      <path
        d="M100 24c20 0 33 14 33 33v8H67v-8c0-19 13-33 33-33Z"
        :fill="`url(#${ids.body})`"
        stroke="#D3D8EB"
        stroke-width="2"
      />
      <rect x="78" y="44" width="44" height="34" rx="15" :fill="`url(#${ids.panel})`" />
      <circle cx="91" cy="60" r="3.6" fill="#16C784" />
      <circle cx="89.8" cy="58.8" r="1.1" fill="#FFFFFF" />
      <circle cx="109" cy="60" r="3.6" fill="#16C784" />
      <circle cx="107.8" cy="58.8" r="1.1" fill="#FFFFFF" />
      <path d="M93 69c2.5 2.4 8.5 2.4 11 0" stroke="#16C784" stroke-width="2.2" stroke-linecap="round" />
      <ellipse cx="92" cy="36" rx="9" ry="5" :fill="`url(#${ids.sheen})`" />
      <circle cx="70" cy="80" r="6" fill="#E9ECF6" stroke="#D3D8EB" stroke-width="1.5" />
      <circle cx="130" cy="80" r="6" fill="#E9ECF6" stroke="#D3D8EB" stroke-width="1.5" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from "vue";
import { nextUid } from "./uid.js";

const props = defineProps({
  size: { type: [Number, String], default: 220 },
  title: { type: String, default: "Nothing here yet" },
});

const height = computed(() => {
  const n = Number(props.size) || 220;
  return Math.round((n * 160) / 200);
});

const uid = nextUid("esa");
const ids = {
  card: `${uid}-card`,
  body: `${uid}-body`,
  panel: `${uid}-panel`,
  coin: `${uid}-coin`,
  coin2: `${uid}-coin2`,
  sheen: `${uid}-sheen`,
  shadow: `${uid}-shadow`,
};
</script>
