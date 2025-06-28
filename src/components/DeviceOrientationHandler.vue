<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  tiltChange: [value: number]
  gyroscopeSupport: [supported: boolean]
}>()

const isSupported = ref(false)
const isPermissionGranted = ref(false)
const beta = ref(0) // Front-to-back tilt
const gamma = ref(0) // Left-to-right tilt

const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
  if (event.gamma !== null) {
    gamma.value = event.gamma
    // Convert gamma (-90 to 90) to tilt value (-1 to 1)
    const tiltValue = Math.max(-1, Math.min(1, event.gamma / 45))
    emit('tiltChange', tiltValue)
  }
}

const requestPermission = async () => {
  if (typeof DeviceOrientationEvent === 'undefined') {
    emit('gyroscopeSupport', false)
    return
  }

  // Check if permission is needed (iOS 13+)
  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission()
      if (permission === 'granted') {
        isPermissionGranted.value = true
        startListening()
      } else {
        emit('gyroscopeSupport', false)
      }
    } catch (error) {
      console.error('Error requesting device orientation permission:', error)
      emit('gyroscopeSupport', false)
    }
  } else {
    // Permission not needed (Android, older iOS)
    isPermissionGranted.value = true
    startListening()
  }
}

const startListening = () => {
  if (isPermissionGranted.value) {
    window.addEventListener('deviceorientation', handleDeviceOrientation, true)
    isSupported.value = true
    emit('gyroscopeSupport', true)
  }
}

const stopListening = () => {
  window.removeEventListener('deviceorientation', handleDeviceOrientation, true)
}

onMounted(() => {
  // Check if device orientation is supported
  if (typeof DeviceOrientationEvent !== 'undefined') {
    requestPermission()
  } else {
    emit('gyroscopeSupport', false)
  }
})

onUnmounted(() => {
  stopListening()
})
</script>

<template>
  <!-- Permission request modal for iOS -->
  <div 
    v-if="typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function' && !isPermissionGranted"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-lg p-6 max-w-sm w-full">
      <h3 class="text-lg font-semibold mb-3">Enable Device Motion</h3>
      <p class="text-gray-600 mb-4">
        To experience the lenticular effect with device tilting, we need permission to access your device's orientation sensor.
      </p>
      <div class="flex space-x-3">
        <button
          @click="requestPermission"
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          Allow
        </button>
        <button
          @click="emit('gyroscopeSupport', false)"
          class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  </div>
</template>