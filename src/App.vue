<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import StartScreen from "./components/StartScreen.vue";
import ImageUploader from "./components/ImageUploader.vue";
import ImageCropper from "./components/ImageCropper.vue";
import LenticularCard from "./components/LenticularCard.vue";
import DeviceOrientationHandler from "./components/DeviceOrientationHandler.vue";
import LanguageSwitcher from "./components/LanguageSwitcher.vue";

const { t } = useI18n();

interface ImageData {
  id: string;
  originalUrl: string;
  croppedUrl?: string;
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const currentStep = ref<"start" | "upload" | "crop" | "preview">("start");
const images = ref<ImageData[]>([]);
const currentImageIndex = ref(0);
const maxImages = 5;
const minImages = 2;
const tiltValue = ref(0);
const isTransitioning = ref(false);
const gyroscopeEnabled = ref(false);
const gyroscopePermissionGranted = ref(false);
const isGyroscopeSupported = ref(false);
const orientationHandler = ref<InstanceType<typeof DeviceOrientationHandler>>();

const startImageSelection = () => {
  currentStep.value = "upload";
  currentImageIndex.value = 0;
};

const handleImageUpload = (imageData: string) => {
  const newImage: ImageData = {
    id: Date.now().toString(),
    originalUrl: imageData,
  };

  if (currentImageIndex.value < images.value.length) {
    images.value[currentImageIndex.value] = newImage;
  } else {
    images.value.push(newImage);
  }

  // Move to cropping step
  currentStep.value = "crop";
};

const handleImageCropped = (croppedImageData: string, cropData: any) => {
  if (images.value[currentImageIndex.value]) {
    images.value[currentImageIndex.value].croppedUrl = croppedImageData;
    images.value[currentImageIndex.value].cropData = cropData;
  }

  // Move to next image or preview
  if (currentImageIndex.value < maxImages - 1) {
    currentImageIndex.value++;
    currentStep.value = "upload";
  } else {
    showPreview();
  }
};

const skipCropping = () => {
  if (images.value[currentImageIndex.value]) {
    images.value[currentImageIndex.value].croppedUrl =
      images.value[currentImageIndex.value].originalUrl;
  }

  if (currentImageIndex.value < maxImages - 1) {
    currentImageIndex.value++;
    currentStep.value = "upload";
  } else {
    showPreview();
  }
};

const finishSelection = () => {
  if (images.value.length >= minImages) {
    showPreview();
  }
};

const showPreview = () => {
  if (images.value.length >= minImages) {
    isTransitioning.value = true;
    setTimeout(() => {
      currentStep.value = "preview";
      setTimeout(() => {
        isTransitioning.value = false;
      }, 100);
    }, 300);
  }
};

const goBackToUpload = () => {
  currentStep.value = "upload";
};

const resetApp = () => {
  isTransitioning.value = true;
  setTimeout(() => {
    currentStep.value = "start";
    images.value = [];
    currentImageIndex.value = 0;
    tiltValue.value = 0;
    setTimeout(() => {
      isTransitioning.value = false;
    }, 100);
  }, 300);
};

const handleTiltChange = (value: number) => {
  tiltValue.value = value;
};

const handleGyroscopeSupport = (supported: boolean) => {
  isGyroscopeSupported.value = supported;
};

const handlePermissionGranted = (granted: boolean) => {
  gyroscopePermissionGranted.value = granted;
  if (granted) {
    gyroscopeEnabled.value = true;
  }
};

const enableGyroscope = () => {
  if (orientationHandler.value) {
    orientationHandler.value.enableGyroscope();
  }
};

const toggleMode = () => {
  if (gyroscopeEnabled.value && gyroscopePermissionGranted.value) {
    gyroscopeEnabled.value = false;
  } else if (isGyroscopeSupported.value) {
    if (gyroscopePermissionGranted.value) {
      gyroscopeEnabled.value = true;
    } else {
      enableGyroscope();
    }
  }
};

onMounted(() => {
  if (typeof DeviceOrientationEvent !== "undefined") {
    isGyroscopeSupported.value = true;
  }
});
</script>

<template>
  <div
    class="h-dvh overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col"
  >
    <!-- Language Switcher - Only on Start page -->
    <div v-if="currentStep === 'start'" class="absolute top-4 right-4 z-30">
      <LanguageSwitcher />
    </div>

    <!-- Transition Overlay -->
    <div
      v-if="isTransitioning"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300"
    >
      <div class="text-white text-center">
        <div
          class="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"
        ></div>
        <p class="text-lg">
          {{
            currentStep === "preview"
              ? t("progress.preparingCard")
              : t("progress.loading")
          }}
        </p>
      </div>
    </div>

    <!-- Start Screen -->
    <StartScreen
      v-if="currentStep === 'start'"
      :is-gyroscope-supported="isGyroscopeSupported"
      :gyroscope-enabled="gyroscopeEnabled"
      :gyroscope-permission-granted="gyroscopePermissionGranted"
      @start="startImageSelection"
      @toggle-mode="toggleMode"
      @enable-gyroscope="enableGyroscope"
    />

    <!-- Upload Interface -->
    <div
      v-if="currentStep === 'upload'"
      class="flex-1 flex flex-col transition-all duration-500 ease-out overflow-hidden"
      :class="{ 'opacity-0 scale-95': isTransitioning }"
    >
      <header class="relative z-10 px-4 py-4 flex-shrink-0">
        <div class="max-w-4xl mx-auto">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-xl md:text-2xl font-bold text-white">
              {{ t("upload.selectImage") }} {{ currentImageIndex + 1 }}
            </h1>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-white/20 rounded-full h-2 mb-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all duration-300"
              :style="{
                width: `${((currentImageIndex + 1) / maxImages) * 100}%`,
              }"
            ></div>
          </div>

          <!-- Progress Text - Moved below progress bar -->
          <div class="text-sm text-slate-300 mb-4">
            {{ currentImageIndex + 1 }} {{ t("progress.of") }} {{ maxImages }}
            {{ t("progress.max") }}
          </div>

          <p class="text-slate-300 text-sm">
            {{
              currentImageIndex === 0
                ? t("progress.chooseFirst")
                : currentImageIndex === 1
                ? t("progress.chooseSecond")
                : t("progress.chooseImage")
            }}
            {{ currentImageIndex + 1 }}
            {{ t("upload.selectImage").toLowerCase() }}
          </p>
        </div>
      </header>

      <main
        class="flex-1 px-4 flex items-center justify-center min-h-0 overflow-y-auto"
      >
        <div class="w-full max-w-2xl py-4">
          <ImageUploader @image-uploaded="handleImageUpload" />
        </div>
      </main>

      <!-- Fixed Bottom Bar -->
      <div
        class="flex-shrink-0 px-4 py-4 bg-black/20 backdrop-blur-sm border-t border-white/10"
      >
        <div class="max-w-4xl mx-auto flex justify-center space-x-4">
          <button
            v-if="currentImageIndex > 0"
            @click="
              currentImageIndex--;
              currentStep = 'upload';
            "
            class="px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-300 cursor-pointer"
          >
            {{ t("buttons.previous") }}
          </button>

          <button
            v-if="
              images.length >= minImages && currentImageIndex >= minImages - 1
            "
            @click="finishSelection"
            class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 cursor-pointer"
          >
            {{ t("buttons.finish") }} ({{ images.length }}
            {{ t("preview.images").toLowerCase() }})
          </button>
        </div>
      </div>
    </div>

    <!-- Crop Interface -->
    <div
      v-if="currentStep === 'crop'"
      class="flex-1 flex flex-col transition-all duration-500 ease-out overflow-hidden"
      :class="{ 'opacity-0 scale-95': isTransitioning }"
    >
      <header class="relative z-10 px-4 py-4 flex-shrink-0">
        <div class="max-w-4xl mx-auto">
          <div class="flex items-center justify-between mb-2">
            <h1 class="text-xl md:text-2xl font-bold text-white">
              {{ t("crop.cropImage") }} {{ currentImageIndex + 1 }}
            </h1>
            <div class="text-sm text-slate-300">
              {{ currentImageIndex + 1 }} {{ t("progress.of") }}
              {{ images.length }}
            </div>
          </div>
          <p class="text-slate-300 text-sm">
            {{ t("crop.adjustCrop") }}
          </p>
        </div>
      </header>

      <main class="flex-1 min-h-0 overflow-hidden">
        <ImageCropper
          v-if="images[currentImageIndex]"
          :image-url="images[currentImageIndex].originalUrl"
          @cropped="handleImageCropped"
          @skip="skipCropping"
          @back="goBackToUpload"
        />
      </main>
    </div>

    <!-- Preview Interface -->
    <div
      v-if="currentStep === 'preview'"
      class="h-dvh flex flex-col transition-all duration-500 ease-out overflow-hidden"
      :class="{ 'opacity-0 scale-105': isTransitioning }"
    >
      <header class="relative z-20 px-4 py-3 flex-shrink-0">
        <div class="flex items-center justify-between max-w-6xl mx-auto">
          <!-- Title on the left -->
          <h1 class="text-lg md:text-xl font-bold text-white">
            {{ t("preview.lenticularEffect") }} ({{ images.length }}
            {{ t("preview.images").toLowerCase() }})
          </h1>

          <!-- New Card button on the right -->
          <button
            @click="resetApp"
            class="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all duration-300 hover:scale-105 text-sm cursor-pointer"
          >
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            {{ t("buttons.newCard") }}
          </button>
        </div>
      </header>

      <main class="flex-1 px-4 pb-4 min-h-0 overflow-hidden">
        <LenticularCard
          :images="images.map((img: ImageData) => img.croppedUrl || img.originalUrl)"
          :tilt-value="tiltValue"
          :is-gyroscope-supported="isGyroscopeSupported"
          :gyroscope-enabled="gyroscopeEnabled"
          :gyroscope-permission-granted="gyroscopePermissionGranted"
        />
      </main>
    </div>

    <!-- Background Animation -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"
      ></div>
      <div
        class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow animation-delay-2000"
      ></div>
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
