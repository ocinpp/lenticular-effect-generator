<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import GifGenerator from "./GifGenerator.vue";

const { t } = useI18n();

const props = defineProps<{
  images: string[];
  gyroscopeEnabled: boolean;
  gyroscopePermissionGranted: boolean;
  currentTilt: number;
}>();

const emit = defineEmits<{
  tiltChange: [value: number];
}>();

const showGifGenerator = ref(false);

// GIF generation handlers with better mobile support
const openGifGenerator = (event?: Event) => {
  console.log("GIF Generator button clicked");
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  showGifGenerator.value = true;
};

const closeGifGenerator = () => {
  showGifGenerator.value = false;
};

const handleGifGenerated = (gifBlob: Blob) => {
  console.log("GIF generated successfully", gifBlob);

  // Create download link
  const url = URL.createObjectURL(gifBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lenticular-effect-${Date.now()}.gif`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  closeGifGenerator();
};
</script>

<template>
  <!-- Fixed Bottom Bar -->
  <div
    class="flex-shrink-0 px-4 py-4 bg-black/20 backdrop-blur-sm border-t border-white/10"
  >
    <div class="max-w-md mx-auto space-y-4">
      <!-- Manual Controls (for desktop or when gyroscope is disabled) -->
      <div
        v-if="!props.gyroscopeEnabled || !props.gyroscopePermissionGranted"
        class="bg-white/10 backdrop-blur-sm rounded-lg p-3"
      >
        <div class="text-center mb-2">
          <span class="text-white text-sm">{{
            t("preview.manualControl")
          }}</span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.02"
          :value="props.currentTilt"
          class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          @input="
            emit(
              'tiltChange',
              parseFloat(($event.target as HTMLInputElement).value)
            )
          "
        />
        <div class="flex justify-between text-xs text-slate-400 mt-1">
          <span>{{ t("preview.left") }}</span>
          <span>{{ t("preview.center") }}</span>
          <span>{{ t("preview.right") }}</span>
        </div>
      </div>

      <!-- Download GIF Button -->
      <div class="flex justify-center">
        <button
          @click="openGifGenerator"
          @touchstart.stop
          @touchend.stop="openGifGenerator"
          class="flex items-center space-x-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-6 py-3 rounded-full transition-all duration-200 shadow-lg cursor-pointer select-none"
          style="
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          <span class="text-sm font-medium">{{ t("gif.downloadGif") }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- GIF Generator Modal -->
  <GifGenerator
    :images="props.images"
    :is-visible="showGifGenerator"
    @close="closeGifGenerator"
    @gif-generated="handleGifGenerated"
  />
</template>

<style scoped>
/* Custom slider styling */
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Enhanced button styling for mobile */
button {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
