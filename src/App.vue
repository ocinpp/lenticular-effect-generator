<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ImageUploader from './components/ImageUploader.vue'
import LenticularCard from './components/LenticularCard.vue'
import DeviceOrientationHandler from './components/DeviceOrientationHandler.vue'

const leftImage = ref<string | null>(null)
const rightImage = ref<string | null>(null)
const showCard = ref(false)
const isGyroscopeSupported = ref(false)
const tiltValue = ref(0)
const isTransitioning = ref(false)
const gyroscopeEnabled = ref(false)
const gyroscopePermissionGranted = ref(false)
const orientationHandler = ref<InstanceType<typeof DeviceOrientationHandler>>()

const handleImageUpload = (type: 'left' | 'right', imageData: string) => {
  if (type === 'left') {
    leftImage.value = imageData
  } else {
    rightImage.value = imageData
  }
  
  // Show card when both images are uploaded with transition
  if (leftImage.value && rightImage.value) {
    isTransitioning.value = true
    setTimeout(() => {
      showCard.value = true
      setTimeout(() => {
        isTransitioning.value = false
      }, 100)
    }, 300)
  }
}

const handleTiltChange = (value: number) => {
  tiltValue.value = value
}

const handleGyroscopeSupport = (supported: boolean) => {
  isGyroscopeSupported.value = supported
}

const handlePermissionGranted = (granted: boolean) => {
  gyroscopePermissionGranted.value = granted
  if (granted) {
    gyroscopeEnabled.value = true
  }
}

const enableGyroscope = () => {
  if (orientationHandler.value) {
    orientationHandler.value.enableGyroscope()
  }
}

const toggleMode = () => {
  if (gyroscopeEnabled.value && gyroscopePermissionGranted.value) {
    gyroscopeEnabled.value = false
  } else if (isGyroscopeSupported.value) {
    if (gyroscopePermissionGranted.value) {
      gyroscopeEnabled.value = true
    } else {
      enableGyroscope()
    }
  }
}

const resetApp = () => {
  isTransitioning.value = true
  setTimeout(() => {
    leftImage.value = null
    rightImage.value = null
    showCard.value = false
    tiltValue.value = 0
    setTimeout(() => {
      isTransitioning.value = false
    }, 100)
  }, 300)
}

onMounted(() => {
  // Check for device orientation support
  if (typeof DeviceOrientationEvent !== 'undefined') {
    isGyroscopeSupported.value = true
  }
})
</script>

<template>
  <div class="h-dvh overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
    <!-- Transition Overlay -->
    <div 
      v-if="isTransitioning"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300"
    >
      <div class="text-white text-center">
        <div class="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-lg">Preparing your lenticular card...</p>
      </div>
    </div>

    <!-- Upload Interface -->
    <div 
      v-if="!showCard" 
      class="flex-1 flex flex-col transition-all duration-500 ease-out"
      :class="{ 'opacity-0 scale-95': isTransitioning }"
    >
      <!-- Header -->
      <header class="relative z-10 px-4 py-6 flex-shrink-0">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
            Lenticular Effect Generator
          </h1>
          <p class="text-slate-300 text-sm md:text-base lg:text-lg">
            Create stunning tilt-responsive image cards
          </p>
        </div>
      </header>

      <!-- Upload Area -->
      <main class="flex-1 px-4 pb-6 flex items-center justify-center min-h-0">
        <div class="w-full max-w-4xl">
          <ImageUploader @image-uploaded="handleImageUpload" />
          
          <!-- Mode Selection -->
          <div v-if="isGyroscopeSupported" class="mt-6 flex justify-center">
            <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <h3 class="text-white text-sm font-medium mb-3 text-center">Control Mode</h3>
              <div class="flex items-center space-x-4">
                <button
                  @click="toggleMode"
                  class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300"
                  :class="gyroscopeEnabled && gyroscopePermissionGranted ? 'bg-blue-600 text-white' : 'bg-white/20 text-slate-300 hover:bg-white/30'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  <span class="text-sm">Auto (Gyroscope)</span>
                </button>
                <button
                  @click="gyroscopeEnabled = false"
                  class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300"
                  :class="!gyroscopeEnabled ? 'bg-blue-600 text-white' : 'bg-white/20 text-slate-300 hover:bg-white/30'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                  </svg>
                  <span class="text-sm">Manual (Drag)</span>
                </button>
              </div>
              <p class="text-slate-400 text-xs mt-2 text-center">
                {{ gyroscopeEnabled && gyroscopePermissionGranted ? 'Tilt your device to see the effect' : 'Drag or use slider to control the effect' }}
              </p>
            </div>
          </div>
          
          <!-- Instructions -->
          <div class="mt-6 text-center">
            <div class="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span class="text-white text-sm">
                Upload both images to generate your lenticular card
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Lenticular Card Display -->
    <div 
      v-if="showCard" 
      class="h-dvh flex flex-col transition-all duration-500 ease-out"
      :class="{ 'opacity-0 scale-105': isTransitioning }"
    >
      <!-- Compact Header -->
      <header class="relative z-20 px-4 py-3 flex-shrink-0">
        <div class="flex items-center justify-between max-w-6xl mx-auto">
          <h1 class="text-lg md:text-xl font-bold text-white">
            Lenticular Effect
          </h1>
          <button
            @click="resetApp"
            class="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-300 hover:scale-105 text-sm"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            New Card
          </button>
        </div>
      </header>

      <!-- Full-Screen Card -->
      <main class="flex-1 px-4 pb-4 min-h-0">
        <LenticularCard 
          :left-image="leftImage!"
          :right-image="rightImage!"
          :tilt-value="tiltValue"
          :is-gyroscope-supported="isGyroscopeSupported"
          :gyroscope-enabled="gyroscopeEnabled"
          :gyroscope-permission-granted="gyroscopePermissionGranted"
        />
      </main>
    </div>

    <!-- Background Animation -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-2000"></div>
    </div>

    <!-- Device Orientation Handler -->
    <DeviceOrientationHandler 
      ref="orientationHandler"
      @tilt-change="handleTiltChange"
      @gyroscope-support="handleGyroscopeSupport"
      @permission-granted="handlePermissionGranted"
    />
  </div>
</template>

<style scoped>
.animation-delay-2000 {
  animation-delay: 2s;
}
</style>