<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

export type LenticularDirection = "vertical" | "horizontal";

const emit = defineEmits<{
  directionSelected: [direction: LenticularDirection];
  back: [];
}>();

const selectedDirection = ref<LenticularDirection | null>(null);

const selectDirection = (direction: LenticularDirection) => {
  selectedDirection.value = direction;
};

const confirmSelection = () => {
  if (selectedDirection.value) {
    emit("directionSelected", selectedDirection.value);
  }
};

const goBack = () => {
  emit("back");
};
</script>

<template>
  <div class="h-dvh flex flex-col overflow-y-auto">
    <!-- Header -->
    <header class="relative z-10 px-8 py-8 flex-shrink-0">
      <div class="max-w-2xl mx-auto text-center">
        <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
          {{ t("direction.chooseEffect") }}
        </h1>
        <p class="text-slate-300 text-lg md:text-xl mb-8">
          {{ t("direction.subtitle") }}
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 pb-8 m-auto items-center justify-center min-h-0">
      <div class="w-full sm:max-w-lg sm:min-w-lg min-w-[90dvw] max-w-[90dvw] text-center space-y-6">
        
        <!-- Direction Options -->
        <div class="space-y-4">
          <!-- Vertical Option -->
          <div
            @click="selectDirection('vertical')"
            class="relative bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-300 cursor-pointer hover:bg-white/20 border-2"
            :class="selectedDirection === 'vertical' ? 'border-blue-500 bg-blue-500/20' : 'border-transparent'"
          >
            <div class="flex items-center space-x-4">
              <!-- Visual Icon -->
              <div class="flex-shrink-0">
                <div class="w-12 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg relative overflow-hidden">
                  <!-- Vertical strips simulation -->
                  <div class="absolute inset-0 flex">
                    <div class="flex-1 bg-blue-300 opacity-80"></div>
                    <div class="flex-1 bg-purple-300 opacity-60"></div>
                    <div class="flex-1 bg-blue-400 opacity-90"></div>
                    <div class="flex-1 bg-purple-400 opacity-70"></div>
                  </div>
                  <!-- Tilt indicator -->
                  <div class="absolute top-1 right-1">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              <!-- Content -->
              <div class="flex-1 text-left">
                <h3 class="text-white text-lg font-semibold mb-2">
                  {{ t("direction.vertical") }}
                </h3>
                <p class="text-slate-300 text-sm mb-2">
                  {{ t("direction.verticalDescription") }}
                </p>
                <div class="flex items-center space-x-2 text-xs text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  <span>{{ t("direction.tiltLeftRight") }}</span>
                </div>
              </div>
              
              <!-- Selection indicator -->
              <div class="flex-shrink-0">
                <div 
                  class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                  :class="selectedDirection === 'vertical' ? 'border-blue-500 bg-blue-500' : 'border-slate-400'"
                >
                  <svg 
                    v-if="selectedDirection === 'vertical'"
                    class="w-4 h-4 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Horizontal Option -->
          <div
            @click="selectDirection('horizontal')"
            class="relative bg-white/10 backdrop-blur-sm rounded-xl p-6 transition-all duration-300 cursor-pointer hover:bg-white/20 border-2"
            :class="selectedDirection === 'horizontal' ? 'border-blue-500 bg-blue-500/20' : 'border-transparent'"
          >
            <div class="flex items-center space-x-4">
              <!-- Visual Icon -->
              <div class="flex-shrink-0">
                <div class="w-12 h-16 bg-gradient-to-b from-green-400 to-teal-400 rounded-lg relative overflow-hidden">
                  <!-- Horizontal strips simulation -->
                  <div class="absolute inset-0 flex flex-col">
                    <div class="flex-1 bg-green-300 opacity-80"></div>
                    <div class="flex-1 bg-teal-300 opacity-60"></div>
                    <div class="flex-1 bg-green-400 opacity-90"></div>
                    <div class="flex-1 bg-teal-400 opacity-70"></div>
                  </div>
                  <!-- Tilt indicator -->
                  <div class="absolute top-1 right-1">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7l4-4m0 0l4 4m-4-4v18"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              <!-- Content -->
              <div class="flex-1 text-left">
                <h3 class="text-white text-lg font-semibold mb-2">
                  {{ t("direction.horizontal") }}
                </h3>
                <p class="text-slate-300 text-sm mb-2">
                  {{ t("direction.horizontalDescription") }}
                </p>
                <div class="flex items-center space-x-2 text-xs text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  <span>{{ t("direction.tiltUpDown") }}</span>
                </div>
              </div>
              
              <!-- Selection indicator -->
              <div class="flex-shrink-0">
                <div 
                  class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                  :class="selectedDirection === 'horizontal' ? 'border-blue-500 bg-blue-500' : 'border-slate-400'"
                >
                  <svg 
                    v-if="selectedDirection === 'horizontal'"
                    class="w-4 h-4 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-4 pt-4">
          <button
            @click="goBack"
            class="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 cursor-pointer"
          >
            {{ t("buttons.back") }}
          </button>
          <button
            @click="confirmSelection"
            :disabled="!selectedDirection"
            class="flex-1 font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
            :class="selectedDirection 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'"
          >
            {{ t("buttons.continue") }}
          </button>
        </div>

        <!-- Info Box -->
        <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="text-sm text-blue-200">
              <p class="font-medium mb-1">{{ t("direction.tip") }}</p>
              <p>{{ t("direction.tipDescription") }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
