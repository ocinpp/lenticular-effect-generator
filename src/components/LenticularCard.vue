<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { TresCanvas } from "@tresjs/core";
import { BasicShadowMap, SRGBColorSpace, NoToneMapping } from "three";
import LenticularPlane from "./LenticularPlane.vue";

const { t } = useI18n();

const props = defineProps<{
  images: string[];
  tiltValue: number;
  isGyroscopeSupported: boolean;
  gyroscopeEnabled: boolean;
  gyroscopePermissionGranted: boolean;
}>();

const emit = defineEmits<{
  tiltChange: [value: number];
}>();

const canvasContainer = ref<HTMLElement>();
const manualTilt = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const currentTilt = ref(0);

// Mobile detection for performance optimizations
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

// Performance optimization for manual controls
const lastManualUpdate = ref(0);
const MANUAL_UPDATE_THROTTLE = isMobile ? 33 : 16; // 30fps on mobile, 60fps on desktop

// Computed pixel ratio for TypeScript compatibility
const pixelRatio = computed(() => {
  if (typeof window !== "undefined") {
    return isMobile
      ? Math.min(window.devicePixelRatio, 2)
      : window.devicePixelRatio;
  }
  return 1;
});

// Watch for tilt value changes from gyroscope or manual input
watch(
  () => props.tiltValue,
  (newValue) => {
    if (
      props.gyroscopeEnabled &&
      props.gyroscopePermissionGranted &&
      !isDragging.value
    ) {
      currentTilt.value = newValue;
    }
  }
);

// Throttled manual tilt update
const updateManualTilt = (newTilt: number) => {
  const now = Date.now();
  if (now - lastManualUpdate.value < MANUAL_UPDATE_THROTTLE) {
    return;
  }
  lastManualUpdate.value = now;

  manualTilt.value = newTilt;
  if (
    !props.gyroscopeEnabled ||
    !props.gyroscopePermissionGranted ||
    !props.tiltValue
  ) {
    currentTilt.value = manualTilt.value;
    emit("tiltChange", currentTilt.value);
  }
};

// Manual drag/swipe handlers
const handleStart = (clientX: number) => {
  isDragging.value = true;
  startX.value = clientX;
};

const handleMove = (clientX: number) => {
  if (!isDragging.value) return;

  const deltaX = clientX - startX.value;
  const sensitivity =
    props.gyroscopeEnabled && props.gyroscopePermissionGranted ? 0.5 : 1;
  const newTilt = Math.max(-1, Math.min(1, (deltaX * sensitivity) / 200));

  updateManualTilt(newTilt);
};

const handleEnd = () => {
  isDragging.value = false;
  if (!props.gyroscopeEnabled || !props.gyroscopePermissionGranted) {
    // Smooth return to center for manual mode with reduced animation frequency
    let animationId: number;
    const smoothReturn = () => {
      manualTilt.value *= 0.92; // Slightly faster decay
      updateManualTilt(manualTilt.value);

      if (Math.abs(manualTilt.value) > 0.01) {
        animationId = requestAnimationFrame(smoothReturn);
      } else {
        manualTilt.value = 0;
        currentTilt.value = 0;
        emit("tiltChange", 0);
        cancelAnimationFrame(animationId);
      }
    };
    smoothReturn();
  }
};

// Mouse events
const handleMouseDown = (event: MouseEvent) => {
  event.preventDefault();
  handleStart(event.clientX);
};

const handleMouseMove = (event: MouseEvent) => {
  handleMove(event.clientX);
};

const handleMouseUp = () => {
  handleEnd();
};

// Touch events - with proper event handling
const handleTouchStart = (event: TouchEvent) => {
  // Don't prevent default for buttons and interactive elements
  const target = event.target as HTMLElement;
  if (target.closest("button") || target.closest('[role="button"]')) {
    return;
  }

  event.preventDefault();
  handleStart(event.touches[0].clientX);
};

const handleTouchMove = (event: TouchEvent) => {
  // Only prevent default if we're actually dragging
  if (isDragging.value) {
    event.preventDefault();
    handleMove(event.touches[0].clientX);
  }
};

const handleTouchEnd = (event: TouchEvent) => {
  if (isDragging.value) {
    event.preventDefault();
    handleEnd();
  }
};

onMounted(() => {
  // Add global mouse event listeners for mouse move and up
  document.addEventListener("mousemove", handleMouseMove, { passive: false });
  document.addEventListener("mouseup", handleMouseUp, { passive: true });
});

onUnmounted(() => {
  // Clean up global event listeners
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});
</script>

<template>
  <div class="flex flex-col">
    <!-- Main Content Area -->
    <div class="flex-1 flex items-center justify-center py-4 min-h-0">
      <!-- Overlay Status and Controls -->
      <div class="flex items-start justify-between pointer-events-none z-10">
        <!-- Status Indicator -->
        <div
          class="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2"
        >
          <div
            class="w-2 h-2 rounded-full"
            :class="
              gyroscopeEnabled &&
              gyroscopePermissionGranted &&
              Math.abs(currentTilt) > 0.1
                ? 'bg-green-400 animate-pulse'
                : 'bg-yellow-400'
            "
          ></div>
          <span class="text-white text-xs md:text-sm">
            {{
              gyroscopeEnabled && gyroscopePermissionGranted
                ? t("modes.autoMode")
                : t("modes.manualMode")
            }}
          </span>
        </div>

        <!-- Effect Information -->
        <div class="flex space-x-2">
          <div
            class="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-center"
          >
            <div class="text-lg md:text-xl font-bold text-white">
              {{ images.length }}
            </div>
            <div class="text-xs text-slate-300">
              {{ t("preview.images") }}
            </div>
          </div>
          <div
            class="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-center"
          >
            <div class="text-lg md:text-xl font-bold text-white">
              {{ Math.abs(currentTilt * 100).toFixed(0) }}%
            </div>
            <div class="text-xs text-slate-300">
              {{ t("preview.strength") }}
            </div>
          </div>
          <div
            class="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-center"
          >
            <div class="text-lg md:text-xl font-bold text-white">
              {{ currentTilt > 0 ? "R" : currentTilt < 0 ? "L" : "C" }}
            </div>
            <div class="text-xs text-slate-300">
              {{ t("preview.view") }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3D Canvas Container with proper aspect ratio -->
    <div class="w-full max-w-md mx-auto">
      <div
        ref="canvasContainer"
        class="relative rounded-xl overflow-hidden cursor-grab bg-black/20 backdrop-blur-sm w-full"
        :class="{ 'cursor-grabbing': isDragging }"
        style="touch-action: pan-y pinch-zoom; aspect-ratio: 3/4"
        @mousedown="handleMouseDown"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <TresCanvas
          clear-color="#000000"
          :shadows="false"
          :shadow-map-type="BasicShadowMap"
          :color-space="SRGBColorSpace"
          :tone-mapping="NoToneMapping"
          :antialias="false"
          :power-preference="isMobile ? 'low-power' : 'high-performance'"
          :pixel-ratio="pixelRatio"
          class="w-full h-full"
        >
          <TresPerspectiveCamera :position="[0, 0, 5]" />
          <TresAmbientLight :intensity="isMobile ? 0.8 : 0.6" />
          <TresDirectionalLight
            v-if="!isMobile"
            :position="[10, 10, 5]"
            :intensity="0.8"
          />

          <LenticularPlane :images="images" :tilt="currentTilt" />
        </TresCanvas>

        <!-- Instructions overlay -->
        <div class="py-4 flex justify-center pointer-events-none z-10">
          <!-- Instructions (only show when not actively using the effect) -->
          <div
            v-if="
              (!gyroscopeEnabled ||
                !gyroscopePermissionGranted ||
                Math.abs(currentTilt) < 0.1) &&
              !isDragging
            "
            class="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-center text-white shadow-lg"
          >
            <div class="flex items-center space-x-2">
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                ></path>
              </svg>
              <span class="text-xs md:text-sm">
                {{
                  gyroscopeEnabled && gyroscopePermissionGranted
                    ? t("preview.tiltDevice")
                    : t("preview.dragHorizontally")
                }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
