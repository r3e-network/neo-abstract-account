# Frontend Production Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the frontend from monolithic view logic into production-grade modular architecture with clear separation of concerns, maintainable state/action boundaries, and reusable wallet/session abstractions.

**Architecture:** Keep current UX intact while extracting business logic from UI components. The Studio becomes a thin presentation component powered by a dedicated controller composable and focused utility modules. Wallet connection responsibilities are centralized in a reusable composable backed by `walletService`.

**Tech Stack:** Vue 3 (`script setup`), Vue Router, Vite, Neon JS, Tailwind CSS.

### Task 1: Extract Studio constants and source-file catalog
**Files:**
- Create: `frontend/src/features/studio/constants.js`
- Create: `frontend/src/features/studio/contractSources.js`
- Modify: `frontend/src/components/AbstractAccountTool.vue`

### Task 2: Extract Studio data/parsing/address helpers
**Files:**
- Create: `frontend/src/features/studio/helpers.js`
- Modify: `frontend/src/components/AbstractAccountTool.vue`

### Task 3: Build Studio controller composable
**Files:**
- Create: `frontend/src/features/studio/useStudioController.js`
- Modify: `frontend/src/components/AbstractAccountTool.vue`

### Task 4: Centralize wallet connect/disconnect flow
**Files:**
- Create: `frontend/src/composables/useWalletConnection.js`
- Modify: `frontend/src/services/walletService.js`
- Modify: `frontend/src/components/layout/MainLayout.vue`

### Task 5: Verification and hardening pass
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd frontend && npm run build`
- `git diff --check`
