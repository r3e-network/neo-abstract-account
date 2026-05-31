<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 96 96"
    fill="none"
    role="img"
    :aria-label="label"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{{ label }}</title>
    <defs>
      <linearGradient :id="ids.green" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#4BE2A6" />
        <stop offset="1" stop-color="#16C784" />
      </linearGradient>
      <linearGradient :id="ids.violet" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#A795FF" />
        <stop offset="1" stop-color="#7B61FF" />
      </linearGradient>
      <linearGradient :id="ids.gold" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#FFE9C4" />
        <stop offset="1" stop-color="#FFC773" />
      </linearGradient>
      <linearGradient :id="ids.rim" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#FFFFFF" stop-opacity="0.6" />
        <stop offset="1" stop-color="#1E1E2E" stop-opacity="0.18" />
      </linearGradient>
      <radialGradient :id="ids.sheen" cx="0.35" cy="0.3" r="0.5">
        <stop stop-color="#FFFFFF" stop-opacity="0.75" />
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>
      <radialGradient :id="ids.shadow" cx="0.5" cy="0.5" r="0.5">
        <stop stop-color="#1E1E2E" stop-opacity="0.18" />
        <stop offset="1" stop-color="#1E1E2E" stop-opacity="0" />
      </radialGradient>
    </defs>

    <template v-if="kind === 'stack'">
      <ellipse cx="48" cy="84" rx="32" ry="7" :fill="`url(#${ids.shadow})`" />
      <ellipse cx="48" cy="64" rx="28" ry="11" fill="#E0A94E" />
      <ellipse cx="48" cy="60" rx="28" ry="11" :fill="`url(#${ids.gold})`" stroke="#E0A94E" stroke-width="1.5" />
      <ellipse cx="48" cy="50" rx="26" ry="10" fill="#5E45E0" />
      <ellipse cx="48" cy="46" rx="26" ry="10" :fill="`url(#${ids.violet})`" stroke="#5E45E0" stroke-width="1.5" />
      <ellipse cx="48" cy="36" rx="24" ry="9.5" fill="#0FB174" />
      <ellipse cx="48" cy="32" rx="24" ry="9.5" :fill="`url(#${ids.green})`" stroke="#0FB174" stroke-width="1.5" />
      <ellipse cx="40" cy="29" rx="9" ry="3.5" :fill="`url(#${ids.sheen})`" />
      <path d="M40 28v8M40 28l8 8M48 28v8" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill-opacity="0" />
    </template>

    <template v-else>
      <ellipse cx="48" cy="82" rx="30" ry="7" :fill="`url(#${ids.shadow})`" />
      <ellipse cx="48" cy="52" rx="34" ry="33" :fill="edge" />
      <circle cx="48" cy="46" r="34" :fill="`url(#${faceId})`" />
      <circle cx="48" cy="46" r="34" :stroke="`url(#${ids.rim})`" stroke-width="2.5" />
      <circle cx="48" cy="46" r="26" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2" />
      <ellipse cx="36" cy="32" rx="13" ry="8" :fill="`url(#${ids.sheen})`" transform="rotate(-24 36 32)" />
      <path
        v-if="kind === 'neo'"
        d="M37 34v24M37 34l22 24M59 34v24"
        stroke="#FFFFFF"
        stroke-width="4.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill-opacity="0"
      />
      <circle v-else cx="48" cy="46" r="9" stroke="#FFFFFF" stroke-width="4" fill-opacity="0" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from "vue";
import { nextUid } from "./uid.js";

const props = defineProps({
  kind: { type: String, default: "neo" }, // neo | generic | violet | stack
  size: { type: [Number, String], default: 96 },
  title: { type: String, default: "" },
});

const KIND_LABEL = {
  neo: "Neo coin",
  generic: "Token coin",
  violet: "Token coin",
  stack: "Stack of coins",
};

const label = computed(() => props.title || KIND_LABEL[props.kind] || KIND_LABEL.neo);

const uid = nextUid("ca");
const ids = {
  green: `${uid}-green`,
  violet: `${uid}-violet`,
  gold: `${uid}-gold`,
  rim: `${uid}-rim`,
  sheen: `${uid}-sheen`,
  shadow: `${uid}-shadow`,
};

const faceId = computed(() => {
  if (props.kind === "violet") return ids.violet;
  if (props.kind === "generic") return ids.gold;
  return ids.green;
});

const edge = computed(() => {
  if (props.kind === "violet") return "#5E45E0";
  if (props.kind === "generic") return "#E0A94E";
  return "#0FB174";
});
</script>
