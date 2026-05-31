<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 160 160"
    fill="none"
    role="img"
    :aria-label="title"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{{ title }}</title>
    <defs>
      <linearGradient :id="ids.body" x1="40" y1="28" x2="120" y2="140" gradientUnits="userSpaceOnUse">
        <stop :stop-color="palette.bodyTop" />
        <stop offset="1" :stop-color="palette.bodyBottom" />
      </linearGradient>
      <linearGradient :id="ids.panel" x1="52" y1="58" x2="108" y2="112" gradientUnits="userSpaceOnUse">
        <stop :stop-color="palette.panelTop" />
        <stop offset="1" :stop-color="palette.panelBottom" />
      </linearGradient>
      <radialGradient :id="ids.cheek" cx="0.5" cy="0.5" r="0.5">
        <stop stop-color="#FFB59E" stop-opacity="0.85" />
        <stop offset="1" stop-color="#FFB59E" stop-opacity="0" />
      </radialGradient>
      <radialGradient :id="ids.eye" cx="0.5" cy="0.5" r="0.5">
        <stop :stop-color="palette.glow" />
        <stop offset="1" :stop-color="palette.glow" stop-opacity="0.15" />
      </radialGradient>
      <radialGradient :id="ids.shadow" cx="0.5" cy="0.5" r="0.5">
        <stop stop-color="#1E1E2E" stop-opacity="0.18" />
        <stop offset="1" stop-color="#1E1E2E" stop-opacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="80" cy="142" rx="44" ry="9" :fill="`url(#${ids.shadow})`" />

    <line x1="80" y1="30" x2="80" y2="16" :stroke="palette.bodyEdge" stroke-width="4" stroke-linecap="round" />
    <circle cx="80" cy="13" r="6" :fill="palette.antenna" />
    <circle cx="78" cy="11" r="2" fill="#FFFFFF" fill-opacity="0.7" />

    <path
      d="M80 28c30 0 50 21 50 50 0 28-20 46-50 46s-50-18-50-46c0-29 20-50 50-50Z"
      :fill="`url(#${ids.body})`"
      :stroke="palette.bodyEdge"
      stroke-width="2"
    />
    <path
      d="M52 46c8-9 18-13 28-13s20 4 28 13c-7-2-17-4-28-4s-21 2-28 4Z"
      fill="#FFFFFF"
      fill-opacity="0.45"
    />

    <rect x="48" y="58" width="64" height="50" rx="22" :fill="`url(#${ids.panel})`" />
    <rect x="48" y="58" width="64" height="50" rx="22" stroke="#000000" stroke-opacity="0.15" stroke-width="1.5" />

    <circle cx="68" cy="82" r="9" :fill="`url(#${ids.eye})`" />
    <circle cx="68" cy="82" r="5" :fill="palette.glow" />
    <circle cx="66.4" cy="80.2" r="1.7" fill="#FFFFFF" />
    <circle cx="92" cy="82" r="9" :fill="`url(#${ids.eye})`" />
    <circle cx="92" cy="82" r="5" :fill="palette.glow" />
    <circle cx="90.4" cy="80.2" r="1.7" fill="#FFFFFF" />

    <path d="M72 95c4 4 12 4 16 0" :stroke="palette.glow" stroke-width="3" stroke-linecap="round" />

    <ellipse cx="56" cy="93" rx="6" ry="4" :fill="`url(#${ids.cheek})`" />
    <ellipse cx="104" cy="93" rx="6" ry="4" :fill="`url(#${ids.cheek})`" />

    <rect x="24" y="74" width="10" height="22" rx="5" :fill="palette.bodyBottom" :stroke="palette.bodyEdge" stroke-width="1.5" />
    <rect x="126" y="74" width="10" height="22" rx="5" :fill="palette.bodyBottom" :stroke="palette.bodyEdge" stroke-width="1.5" />
  </svg>
</template>

<script setup>
import { computed } from "vue";
import { nextUid } from "./uid.js";

const props = defineProps({
  variant: { type: String, default: "default" }, // default | brand | violet
  size: { type: [Number, String], default: 160 },
  title: { type: String, default: "Neo mascot" },
});

const PALETTES = {
  default: {
    bodyTop: "#FFFFFF", bodyBottom: "#E9ECF6", bodyEdge: "#D3D8EB",
    panelTop: "#2A2A3E", panelBottom: "#1E1E2E", glow: "#16C784", antenna: "#16C784",
  },
  brand: {
    bodyTop: "#4BE2A6", bodyBottom: "#16C784", bodyEdge: "#0FB174",
    panelTop: "#15243A", panelBottom: "#0E1A2C", glow: "#BFF6E1", antenna: "#FFFFFF",
  },
  violet: {
    bodyTop: "#A795FF", bodyBottom: "#7B61FF", bodyEdge: "#5E45E0",
    panelTop: "#231C45", panelBottom: "#171234", glow: "#E0E2FF", antenna: "#FFFFFF",
  },
};

const palette = computed(() => PALETTES[props.variant] || PALETTES.default);

const uid = nextUid("nm");
const ids = {
  body: `${uid}-body`,
  panel: `${uid}-panel`,
  cheek: `${uid}-cheek`,
  eye: `${uid}-eye`,
  shadow: `${uid}-shadow`,
};
</script>
