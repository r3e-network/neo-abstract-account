<template>
  <div
    v-if="hasDraft && accessScope === 'read'"
    class="mb-6 rounded-lg border border-aa-warning/30 bg-aa-warning/10 px-4 py-3 text-sm text-aa-warning font-medium"
  >
    {{
      t(
        "sharedDraft.readOnlyNotice",
        "This shared draft is read-only. Open the Collaborator Link to sign, or the Operator Link to manage relay and broadcast actions.",
      )
    }}
  </div>
  <div
    v-else-if="hasDraft && accessScope === 'sign'"
    class="mb-6 rounded-lg border border-aa-info/30 bg-aa-info/10 px-4 py-3 text-sm text-aa-info font-medium"
  >
    {{
      t(
        "sharedDraft.signatureOnlyNotice",
        "This is a signature-only link. Relay checks, broadcasts, and link rotation require the Operator Link.",
      )
    }}
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();

defineProps({
  accessScope: { type: String, default: "read" },
  hasDraft: { type: Boolean, default: false },
});
</script>
