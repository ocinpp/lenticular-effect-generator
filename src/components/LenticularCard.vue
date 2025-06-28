<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue";
import { TresCanvas } from "@tresjs/core";
import { BasicShadowMap, SRGBColorSpace, NoToneMapping } from "three";
import LenticularPlane from "./LenticularPlane.vue";

const props = defineProps<{
  leftImage: string;
  rightImage: string;
  tiltValue: number;
  isGyroscopeSupported: boolean;
  gyroscopeEnabled: boolean;
  gyroscopePermissionGranted: boolean;
}>();

const canvasContainer = ref<HTMLElement>();
const manualTilt = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const currentTilt = ref(0);
const isTouch = ref(false);

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

// Manual drag/swipe handlers
const handleStart = (clientX: number, touch = false) => {
  isDragging.value = true;
  startX.value = clientX;
  isTouch.value = touch;
};

const handleMove = (clientX: number) => {
  if (!isDragging.value) return;

  const deltaX = clientX - startX.value;
  const sensitivity =
    props.gyroscopeEnabled && props.gyroscopePermissionGranted ? 0.5 : 1;
  manualTilt.value = Math.max(-1, Math.min(1, (deltaX * sensitivity) / 200));

  if (
    !props.gyroscopeEnabled ||
    !props.gyroscopePermissionGranted ||
    !props.tiltValue
  ) {
    currentTilt.value = manualTilt.value;
  }
};

const handleEnd = () => {
  isDragging.value = false;
  if (!props.gyroscopeEnabled || !props.gyroscopePermissionGranted) {
    // Smooth return to center for manual mode
    const smoothReturn = () => {
      manualTilt.value *= 0.9;
      currentTilt.value = manualTilt.value;
      if (Math.abs(manualTilt.value) > 0.01) {
        requestAnimationFrame(smoothReturn);
      } else {
        manualTilt.value = 0;
        currentTilt.value = 0;
      }
    };
    smoothReturn();
  }
};

// Mouse events
const handleMouseDown = (event: MouseEvent) => {
  handleStart(event.clientX);
};

const handleMouseMove = (event: MouseEvent) => {
  handleMove(event.clientX);
};

const handleMouseUp = () => {
  handleEnd();
};

// Touch events
const handleTouchStart = (event: TouchEvent) => {
  event.preventDefault();
  handleStart(event.touches[0].clientX, true);
};

const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault();
  handleMove(event.touches[0].clientX);
};

const handleTouchEnd = (event: TouchEvent) => {
  event.preventDefault();
  handleEnd();
};

onMounted(() => {
  if (canvasContainer.value) {
    // Add mouse event listeners
    canvasContainer.value.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add touch event listeners
    canvasContainer.value.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    canvasContainer.value.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    canvasContainer.value.addEventListener("touchend", handleTouchEnd, {
      passive: false,
    });
  }
});

onUnmounted(() => {
  // Clean up event listeners
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 3D Canvas - Takes most of the screen -->
    <div
      ref="canvasContainer"
      class="flex-1 relative rounded-xl overflow-hidden cursor-grab bg-black/20 backdrop-blur-sm"
      :class="{ 'cursor-grabbing': isDragging }"
    >
      <TresCanvas
        clear-color="#000000"
        :shadows="true"
        :shadow-map-type="BasicShadowMap"
        :color-space="SRGBColorSpace"
        :tone-mapping="NoToneMapping"
        class="w-full h-full"
      >
        <TresPerspectiveCamera :position="[0, 0, 5]" />
        <TresAmbientLight :intensity="0.5" />
        <TresDirectionalLight
          :position="[10, 10, 5]"
          :intensity="1"
          cast-shadow
        />

        <LenticularPlane
          :left-image="leftImage"
          :right-image="rightImage"
          :tilt="currentTilt"
        />
      </TresCanvas>

      <!-- Overlay Status and Controls -->
      <div
        class="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none"
      >
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
                ? "Auto Mode"
                : "Manual Mode"
            }}
          </span>
        </div>

        <!-- Effect Information -->
        <div class="flex space-x-2">
          <div
            class="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-center"
          >
            <div class="text-lg md:text-xl font-bold text-white">
              {{ Math.abs(currentTilt * 100).toFixed(0) }}%
            </div>
            <div class="text-xs text-slate-300">Strength</div>
          </div>
          <div
            class="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-center"
          >
            <div class="text-lg md:text-xl font-bold text-white">
              {{ currentTilt > 0 ? "R" : currentTilt < 0 ? "L" : "C" }}
            </div>
            <div class="text-xs text-slate-300">View</div>
          </div>
        </div>
      </div>

      <!-- Instructions Overlay -->
      <div
        v-if="
          (!gyroscopeEnabled ||
            !gyroscopePermissionGranted ||
            Math.abs(currentTilt) < 0.1) &&
          !isDragging
        "
        class="absolute bottom-4 left-4 right-4 flex items-center justify-center"
      >
        <div
          class="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 text-center text-white pointer-events-none"
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
                  ? "Tilt your device to see the effect"
                  : "Drag to see lenticular effect"
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Controls (for desktop or when gyroscope is disabled) -->
    <div
      v-if="!gyroscopeEnabled || !gyroscopePermissionGranted"
      class="mt-4 px-4"
    >
      <div class="bg-white/10 backdrop-blur-sm rounded-lg p-3">
        <div class="text-center mb-2">
          <span class="text-white text-sm">Manual Control</span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          v-model="currentTilt"
          class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
        />
        <div class="flex justify-between text-xs text-slate-400 mt-1">
          <span>Left</span>
          <span>Center</span>
          <span>Right</span>
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
</style>
