<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const emit = defineEmits<{
  tiltChange: [value: number];
  gyroscopeSupport: [supported: boolean];
  permissionGranted: [granted: boolean];
}>();

const isSupported = ref(false);
const isPermissionGranted = ref(false);
const showPermissionModal = ref(false);
const permissionDenied = ref(false);
const beta = ref(0); // Front-to-back tilt
const gamma = ref(0); // Left-to-right tilt

// Performance optimization for orientation events
const lastOrientationUpdate = ref(0);
const ORIENTATION_THROTTLE = 16; // ~60fps max
const orientationBuffer = ref<number[]>([]);
const SMOOTHING_SAMPLES = 5;

// Smooth orientation values to prevent jittery updates
const smoothOrientation = (newValue: number): number => {
  orientationBuffer.value.push(newValue);
  if (orientationBuffer.value.length > SMOOTHING_SAMPLES) {
    orientationBuffer.value.shift();
  }

  // Calculate weighted average (more recent values have higher weight)
  let weightedSum = 0;
  let totalWeight = 0;

  orientationBuffer.value.forEach((value, index) => {
    const weight = index + 1; // More recent values get higher weight
    weightedSum += value * weight;
    totalWeight += weight;
  });

  return weightedSum / totalWeight;
};

const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
  // Throttle orientation updates for performance
  const now = Date.now();
  if (now - lastOrientationUpdate.value < ORIENTATION_THROTTLE) {
    return;
  }
  lastOrientationUpdate.value = now;

  if (event.gamma !== null) {
    gamma.value = event.gamma;

    // Smooth the gamma value to prevent jittery updates
    const smoothedGamma = smoothOrientation(event.gamma);

    // Convert gamma (-90 to 90) to tilt value (-1 to 1) with deadzone
    const deadzone = 2; // Degrees of deadzone to prevent micro-movements
    let tiltValue = 0;

    if (Math.abs(smoothedGamma) > deadzone) {
      const adjustedGamma =
        smoothedGamma > 0 ? smoothedGamma - deadzone : smoothedGamma + deadzone;
      tiltValue = Math.max(-1, Math.min(1, adjustedGamma / 45));
    }

    emit("tiltChange", tiltValue);
  }
};

const requestPermission = async () => {
  if (typeof DeviceOrientationEvent === "undefined") {
    emit("gyroscopeSupport", false);
    return false;
  }

  // Check if permission is needed (iOS 13+)
  if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
    try {
      const permission = await (
        DeviceOrientationEvent as any
      ).requestPermission();
      if (permission === "granted") {
        isPermissionGranted.value = true;
        showPermissionModal.value = false;
        startListening();
        emit("permissionGranted", true);
        return true;
      } else {
        permissionDenied.value = true;
        emit("gyroscopeSupport", false);
        emit("permissionGranted", false);
        return false;
      }
    } catch (error) {
      console.error("Error requesting device orientation permission:", error);
      permissionDenied.value = true;
      emit("gyroscopeSupport", false);
      emit("permissionGranted", false);
      return false;
    }
  } else {
    // Permission not needed (Android, older iOS)
    isPermissionGranted.value = true;
    startListening();
    emit("permissionGranted", true);
    return true;
  }
};

const startListening = () => {
  if (isPermissionGranted.value) {
    // Use passive event listener for better performance
    window.addEventListener("deviceorientation", handleDeviceOrientation, {
      passive: true,
    });
    isSupported.value = true;
    emit("gyroscopeSupport", true);
  }
};

const stopListening = () => {
  window.removeEventListener("deviceorientation", handleDeviceOrientation);
  // Clear buffers
  orientationBuffer.value = [];
};

const checkSupport = () => {
  if (typeof DeviceOrientationEvent !== "undefined") {
    isSupported.value = true;
    emit("gyroscopeSupport", true);

    // For iOS, we need to show the permission modal
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      showPermissionModal.value = true;
    } else {
      // For Android and older iOS, try to start immediately
      requestPermission();
    }
  } else {
    emit("gyroscopeSupport", false);
  }
};

const enableGyroscope = () => {
  requestPermission();
};

const skipGyroscope = () => {
  showPermissionModal.value = false;
  emit("gyroscopeSupport", false);
  emit("permissionGranted", false);
};

// Expose methods for parent component
defineExpose({
  enableGyroscope,
  isSupported: () => isSupported.value,
  isPermissionGranted: () => isPermissionGranted.value,
  permissionDenied: () => permissionDenied.value,
});

onMounted(() => {
  checkSupport();
});

onUnmounted(() => {
  stopListening();
});
</script>

<template>
  <!-- Permission request modal for iOS -->
  <div
    v-if="showPermissionModal"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-lg p-6 max-w-sm w-full">
      <h3 class="text-lg font-semibold mb-3">
        {{ t("permissions.enableDeviceMotion") }}
      </h3>
      <p class="text-gray-600 mb-4">
        {{ t("permissions.permissionDescription") }}
      </p>
      <div class="flex space-x-3">
        <button
          @click="enableGyroscope"
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer"
        >
          {{ t("buttons.allow") }}
        </button>
        <button
          @click="skipGyroscope"
          class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors cursor-pointer"
        >
          {{ t("buttons.skip") }}
        </button>
      </div>
    </div>
  </div>
</template>
