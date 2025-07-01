<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps<{
  isGyroscopeSupported: boolean;
  gyroscopeEnabled: boolean;
  gyroscopePermissionGranted: boolean;
}>();

const emit = defineEmits<{
  start: [];
  toggleMode: [];
  enableGyroscope: [];
}>();

const enableAutoMode = () => {
  if (!props.gyroscopeEnabled || !props.gyroscopePermissionGranted) {
    emit("toggleMode");
  }
};

const enableManualMode = () => {
  if (props.gyroscopeEnabled && props.gyroscopePermissionGranted) {
    emit("toggleMode");
  }
};
</script>

<template>
  <div class="h-dvh flex flex-col overflow-y-auto">
    <!-- Header with px-8 -->
    <header class="relative z-10 px-8 py-8 flex-shrink-0">
      <div class="max-w-2xl mx-auto text-center">
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          {{ t("app.title") }}
        </h1>
        <p class="text-slate-300 text-lg md:text-xl mb-8">
          {{ t("app.subtitle") }}
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 pb-8 m-auto items-center justify-center min-h-0">
      <div
        class="w-full md:max-w-md md:min-w-md min-w-[90dvw] max-w-[90dvw] text-center space-y-6"
      >
        <!-- Start Button -->
        <div>
          <button
            @click="$emit('start')"
            class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
          >
            <div class="flex items-center justify-center space-x-3">
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span class="text-lg">{{ t("buttons.startCreating") }}</span>
            </div>
          </button>

          <p class="text-slate-400 text-sm mt-4">
            {{ t("upload.selectImage") }} 2-5
            {{ t("preview.images").toLowerCase() }}
          </p>
        </div>

        <!-- Mode Selection -->
        <div v-if="isGyroscopeSupported">
          <div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 class="text-white text-lg font-semibold mb-4">
              {{ t("modes.controlMode") }}
            </h3>
            <div class="space-y-3">
              <!-- Auto Mode Button -->
              <button
                @click="enableAutoMode"
                class="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300"
                :class="
                  gyroscopeEnabled && gyroscopePermissionGranted
                    ? 'bg-blue-600 text-white shadow-lg cursor-pointer'
                    : 'bg-white/20 text-slate-300 hover:bg-white/30 hover:text-white cursor-pointer'
                "
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  ></path>
                </svg>
                <span>{{ t("modes.auto") }}</span>
                <div
                  v-if="gyroscopeEnabled && gyroscopePermissionGranted"
                  class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                ></div>
              </button>

              <!-- Manual Mode Button -->
              <button
                @click="enableManualMode"
                class="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300"
                :class="
                  !gyroscopeEnabled || !gyroscopePermissionGranted
                    ? 'bg-blue-600 text-white shadow-lg cursor-pointer'
                    : 'bg-white/20 text-slate-300 hover:bg-white/30 hover:text-white cursor-pointer'
                "
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  ></path>
                </svg>
                <span>{{ t("modes.manual") }}</span>
                <div
                  v-if="!gyroscopeEnabled || !gyroscopePermissionGranted"
                  class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                ></div>
              </button>
            </div>

            <!-- Status Description -->
            <div class="mt-4 p-3 bg-black/20 rounded-lg">
              <p class="text-slate-300 text-sm">
                <span class="font-medium text-white">
                  {{
                    gyroscopeEnabled && gyroscopePermissionGranted
                      ? t("modes.autoModeActive")
                      : t("modes.manualModeActive")
                  }}
                </span>
                <br />
                {{
                  gyroscopeEnabled && gyroscopePermissionGranted
                    ? t("modes.autoModeDescription")
                    : t("modes.manualModeDescription")
                }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
