<script setup lang="ts">
import { ref, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import GIF from "gif.js";

const { t } = useI18n();

const props = defineProps<{
  images: string[];
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  gifGenerated: [gifBlob: Blob];
}>();

const isGenerating = ref(false);
const progress = ref(0);
const currentFrame = ref(0);
const totalFrames = ref(20); // Reduced default for better performance
const gifQuality = ref<"basic" | "high">("basic");
const gifDuration = ref(2.5); // Reduced default duration
const generationStatus = ref("");

// Pre-loaded images cache
const loadedImages = ref<HTMLImageElement[]>([]);

// GIF generation settings - optimized for mobile
const GIF_SETTINGS = {
  basic: {
    width: 240, // Reduced size for better performance
    height: 320,
    quality: 25, // Higher number = lower quality but faster
    dither: false,
  },
  high: {
    width: 360, // Reduced size for better performance
    height: 480,
    quality: 20, // Higher number = lower quality but faster
    dither: false,
  },
};

// Pre-load all images when component mounts
const preloadImages = async () => {
  try {
    const imagePromises = props.images.map((src) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn("Failed to load image:", src);
          // Create a fallback colored rectangle
          const canvas = document.createElement("canvas");
          canvas.width = 240;
          canvas.height = 320;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const fallbackImg = new Image();
          fallbackImg.src = canvas.toDataURL();
          fallbackImg.onload = () => resolve(fallbackImg);
        };
        img.src = src;
      });
    });

    loadedImages.value = await Promise.all(imagePromises);
    console.log("All images preloaded:", loadedImages.value.length);
  } catch (error) {
    console.error("Error preloading images:", error);
    // Create fallback images
    loadedImages.value = props.images.map((_, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 320;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = `hsl(${index * 60}, 70%, 50%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.src = canvas.toDataURL();
      return img;
    });
  }
};

const generateGif = async () => {
  if (props.images.length === 0) return;

  isGenerating.value = true;
  progress.value = 0;
  currentFrame.value = 0;
  generationStatus.value = t("gif.preparing");

  try {
    // Ensure images are loaded
    if (loadedImages.value.length === 0) {
      await preloadImages();
    }

    const settings = GIF_SETTINGS[gifQuality.value];

    console.log("Starting GIF generation with settings:", settings);
    generationStatus.value = t("gif.preparing");

    // Create GIF instance with proper worker configuration
    const gif = new GIF({
      workers: 2, // Enable workers for better performance
      workerScript: "/gif.worker.js", // Explicitly set worker script path
      quality: settings.quality,
      width: settings.width,
      height: settings.height,
      debug: false,
      dither: settings.dither,
      transparent: null,
      background: "#000000",
      repeat: 0,
      // Removed globalPalette and optimise as they don't exist in the type definition
    });

    // Set up progress tracking with timeout protection
    let progressTimeout: NodeJS.Timeout;
    let lastProgressTime = Date.now();
    let hasStartedEncoding = false;

    const resetProgressTimeout = () => {
      if (progressTimeout) clearTimeout(progressTimeout);
      progressTimeout = setTimeout(() => {
        const timeSinceLastProgress = Date.now() - lastProgressTime;
        console.warn(
          `GIF encoding appears stuck. Time since last progress: ${timeSinceLastProgress}ms`
        );

        if (timeSinceLastProgress > 30000) {
          // 30 seconds timeout
          console.error("GIF encoding timeout - forcing completion");
          isGenerating.value = false;
          generationStatus.value = "";
          alert(t("gif.generationError") + " (Timeout)");
        }
      }, 35000);
    };

    // Enhanced progress tracking
    gif.on("progress", (p: number) => {
      lastProgressTime = Date.now();
      hasStartedEncoding = true;

      const encodingProgress = Math.round(p * 100);
      progress.value = 50 + encodingProgress * 0.5; // 50-100% for encoding
      generationStatus.value = `${t("gif.generating")} ${Math.round(
        progress.value
      )}%`;

      console.log(
        "GIF encoding progress:",
        encodingProgress + "%",
        "Total:",
        Math.round(progress.value) + "%"
      );
      resetProgressTimeout();
    });

    // Handle completion
    gif.on("finished", (blob: Blob) => {
      if (progressTimeout) clearTimeout(progressTimeout);
      progress.value = 100;
      generationStatus.value = t("gif.complete");
      console.log("GIF generation completed! Size:", blob.size, "bytes");

      setTimeout(() => {
        emit("gifGenerated", blob);
        isGenerating.value = false;
      }, 500);
    });

    // Handle errors and abort
    gif.on("abort", () => {
      console.error("GIF generation aborted");
      if (progressTimeout) clearTimeout(progressTimeout);
      isGenerating.value = false;
      generationStatus.value = "";
      alert(t("gif.generationError") + " (Aborted)");
    });

    // Generate frames with reduced complexity
    const frameDelay = Math.max(
      100,
      (gifDuration.value * 1000) / totalFrames.value
    ); // Minimum 100ms

    console.log("Generating frames...");
    for (let i = 0; i < totalFrames.value; i++) {
      currentFrame.value = i + 1;
      progress.value = (i / totalFrames.value) * 40; // 0-40% for frame generation
      generationStatus.value = `${t("gif.renderingFrame")} ${i + 1}/${
        totalFrames.value
      }`;

      // Create smooth oscillating tilt animation
      const normalizedTime = i / (totalFrames.value - 1);

      // Simpler tilt calculation for better performance
      let tiltValue: number;
      if (normalizedTime <= 0.5) {
        tiltValue = -0.9 + normalizedTime * 2 * 1.8;
      } else {
        tiltValue = 0.9 - (normalizedTime - 0.5) * 2 * 1.8;
      }

      // Render frame
      const canvas = renderLenticularFrame(
        tiltValue,
        settings.width,
        settings.height
      );

      // Add frame directly to GIF
      gif.addFrame(canvas, { delay: frameDelay });

      // Yield control every few frames
      if (i % 3 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    console.log("All frames added, starting encoding...");
    progress.value = 50;
    generationStatus.value = `${t("gif.generating")} 50%`;

    // Start timeout protection
    resetProgressTimeout();

    // Add a fallback timeout for the entire process
    const globalTimeout = setTimeout(() => {
      if (isGenerating.value && !hasStartedEncoding) {
        console.error("GIF generation failed to start encoding");
        isGenerating.value = false;
        generationStatus.value = "";
        alert(t("gif.generationError") + " (Failed to start)");
      }
    }, 10000); // 10 seconds to start encoding

    // Start rendering
    console.log("Starting GIF render...");
    gif.render();

    // Clear the global timeout once encoding starts
    gif.on("progress", () => {
      clearTimeout(globalTimeout);
    });
  } catch (error: unknown) {
    console.error("Error generating GIF:", error);
    isGenerating.value = false;
    generationStatus.value = "";

    // Properly handle the error message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    alert(t("gif.generationError") + ": " + errorMessage);
  }
};

const renderLenticularFrame = (
  tiltValue: number,
  width: number,
  height: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  if (loadedImages.value.length === 0) {
    createFallbackFrame(ctx, width, height, tiltValue);
    return canvas;
  }

  try {
    renderLenticularEffect(ctx, loadedImages.value, tiltValue, width, height);
  } catch (error) {
    console.warn("Error rendering lenticular effect, using fallback:", error);
    createFallbackFrame(ctx, width, height, tiltValue);
  }

  return canvas;
};

const renderLenticularEffect = (
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  tiltValue: number,
  width: number,
  height: number
) => {
  // Clear canvas
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Calculate image blending
  // const imageSelector = (tiltValue + 1) * 0.5 * (images.length - 1)
  // const imageIndex1 = Math.floor(imageSelector)
  // const imageIndex2 = Math.ceil(imageSelector)
  // const mixFactor = imageSelector - imageIndex1

  // const idx1 = Math.max(0, Math.min(imageIndex1, images.length - 1))
  // const idx2 = Math.max(0, Math.min(imageIndex2, images.length - 1))

  // Simplified strip rendering for better performance
  const stripWidth = Math.max(4, Math.floor(width * 0.02)); // Wider strips
  const numStrips = Math.ceil(width / stripWidth);

  for (let strip = 0; strip < numStrips; strip++) {
    const x = strip * stripWidth;
    const actualStripWidth = Math.min(stripWidth, width - x);

    // Reduced variation for smoother effect
    const stripVariation = Math.sin(strip * 0.1) * 0.08;
    const stripTilt = Math.max(-1, Math.min(1, tiltValue + stripVariation));

    const stripImageSelector = (stripTilt + 1) * 0.5 * (images.length - 1);
    const stripIdx1 = Math.max(
      0,
      Math.min(Math.floor(stripImageSelector), images.length - 1)
    );
    const stripIdx2 = Math.max(
      0,
      Math.min(Math.ceil(stripImageSelector), images.length - 1)
    );
    const stripMix = stripImageSelector - stripIdx1;

    // Draw strip
    if (images[stripIdx1] && images[stripIdx1].complete) {
      try {
        const sourceX = (x / width) * images[stripIdx1].width;
        const sourceWidth =
          (actualStripWidth / width) * images[stripIdx1].width;

        ctx.globalAlpha = 1 - stripMix;
        ctx.drawImage(
          images[stripIdx1],
          sourceX,
          0,
          sourceWidth,
          images[stripIdx1].height,
          x,
          0,
          actualStripWidth,
          height
        );

        if (
          stripIdx2 !== stripIdx1 &&
          images[stripIdx2] &&
          images[stripIdx2].complete
        ) {
          ctx.globalAlpha = stripMix;
          const sourceX2 = (x / width) * images[stripIdx2].width;
          const sourceWidth2 =
            (actualStripWidth / width) * images[stripIdx2].width;

          ctx.drawImage(
            images[stripIdx2],
            sourceX2,
            0,
            sourceWidth2,
            images[stripIdx2].height,
            x,
            0,
            actualStripWidth,
            height
          );
        }

        ctx.globalAlpha = 1;
      } catch (error) {
        // Simple fallback
        const hue = stripIdx1 * 60;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, 0, actualStripWidth, height);
      }
    }

    // Reduced ridge lines for performance
    if (strip % 10 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, 0, 1, height);
      ctx.restore();
    }
  }

  // Minimal shimmer effect
  const shimmerGradient = ctx.createLinearGradient(0, 0, width, 0);
  const shimmerOffset = (tiltValue + 1) * 0.5;

  shimmerGradient.addColorStop(
    Math.max(0, shimmerOffset - 0.1),
    "rgba(255,255,255,0)"
  );
  shimmerGradient.addColorStop(shimmerOffset, "rgba(255,255,255,0.03)");
  shimmerGradient.addColorStop(
    Math.min(1, shimmerOffset + 0.1),
    "rgba(255,255,255,0)"
  );

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = shimmerGradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const createFallbackFrame = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tiltValue: number
) => {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  const hue = (tiltValue + 1) * 180;
  gradient.addColorStop(0, `hsl(${hue}, 70%, 30%)`);
  gradient.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 70%, 50%)`);
  gradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 70%, 30%)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Simple ridge lines
  const stripWidth = width * 0.025;
  const numStrips = Math.ceil(width / stripWidth);

  for (let i = 0; i < numStrips; i += 8) {
    const x = i * stripWidth;
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, 0, 1, height);
    ctx.restore();
  }
};

const closeModal = () => {
  if (!isGenerating.value) {
    emit("close");
  }
};

// Preload images when component becomes visible
const handleVisibilityChange = async () => {
  if (props.isVisible && loadedImages.value.length === 0) {
    await preloadImages();
  }
};

// Watch for visibility changes
watch(() => props.isVisible, handleVisibilityChange);

// Cleanup on unmount
onUnmounted(() => {
  isGenerating.value = false;
  loadedImages.value = [];
});
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    style="z-index: 9999"
    @click.self="closeModal"
  >
    <div
      class="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 sm:mb-6">
        <h2 class="text-lg sm:text-xl font-bold text-gray-800">
          {{ t("gif.generateGif") }}
        </h2>
        <button
          v-if="!isGenerating"
          @click="closeModal"
          class="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors cursor-pointer"
        >
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
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <!-- Settings (only show when not generating) -->
      <div v-if="!isGenerating" class="space-y-4 mb-4 sm:mb-6">
        <!-- Quality Setting -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{{
            t("gif.quality")
          }}</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="gifQuality = 'basic'"
              class="px-3 sm:px-4 py-2 rounded-lg border transition-colors cursor-pointer text-sm"
              :class="
                gifQuality === 'basic'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              "
            >
              {{ t("gif.basicQuality") }}
              <div class="text-xs opacity-75">240×320px</div>
            </button>
            <button
              @click="gifQuality = 'high'"
              class="px-3 sm:px-4 py-2 rounded-lg border transition-colors cursor-pointer text-sm"
              :class="
                gifQuality === 'high'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              "
            >
              {{ t("gif.highQuality") }}
              <div class="text-xs opacity-75">360×480px</div>
            </button>
          </div>
        </div>

        <!-- Duration Setting -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ t("gif.duration") }}: {{ gifDuration }}{{ t("gif.seconds") }}
          </label>
          <input
            type="range"
            min="2"
            max="4"
            step="0.5"
            v-model="gifDuration"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>2{{ t("gif.seconds") }}</span>
            <span>4{{ t("gif.seconds") }}</span>
          </div>
        </div>

        <!-- Frame Count -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ t("gif.frames") }}: {{ totalFrames }}
          </label>
          <input
            type="range"
            min="15"
            max="30"
            step="5"
            v-model="totalFrames"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>15</span>
            <span>30</span>
          </div>
        </div>

        <!-- Preview Info -->
        <div class="bg-blue-50 rounded-lg p-3">
          <div class="text-sm text-blue-800">
            <div class="font-medium mb-1">{{ t("gif.previewSettings") }}:</div>
            <div>
              {{ t("gif.size") }}: {{ GIF_SETTINGS[gifQuality].width }}×{{
                GIF_SETTINGS[gifQuality].height
              }}px
            </div>
            <div>
              {{ t("gif.duration") }}: {{ gifDuration }}{{ t("gif.seconds") }}
            </div>
            <div>{{ t("gif.frames") }}: {{ totalFrames }}</div>
            <div>
              {{ t("gif.estimatedSize") }}:
              {{ gifQuality === "basic" ? "0.5-2MB" : "1-4MB" }}
            </div>
          </div>
        </div>

        <!-- Mobile Performance Warning -->
        <div class="bg-yellow-50 rounded-lg p-3">
          <div class="text-sm text-yellow-800">
            <div class="font-medium mb-1">
              📱 {{ t("gif.mobileOptimized") }}:
            </div>
            <div>{{ t("gif.mobileWarning") }}</div>
          </div>
        </div>
      </div>

      <!-- Generation Progress -->
      <div v-if="isGenerating" class="mb-4 sm:mb-6">
        <div class="text-center mb-4">
          <div class="text-base sm:text-lg font-semibold text-gray-800 mb-2">
            {{ generationStatus }}
          </div>
          <div class="text-sm text-gray-600">
            {{
              currentFrame > 0 && progress < 50
                ? t("gif.renderingFrame") +
                  " " +
                  currentFrame +
                  "/" +
                  totalFrames
                : ""
            }}
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            class="bg-blue-600 h-3 rounded-full transition-all duration-300"
            :style="{ width: progress + '%' }"
          ></div>
        </div>

        <div class="text-center text-sm text-gray-600">
          {{ Math.round(progress) }}% {{ t("gif.complete") }}
        </div>

        <!-- Processing stages info -->
        <div class="mt-3 p-2 bg-blue-50 rounded-lg">
          <div class="text-xs text-blue-800 text-center">
            <div v-if="progress < 40">🎬 {{ t("gif.renderingFrames") }}</div>
            <div v-else-if="progress < 50">
              📦 {{ t("gif.preparingEncoding") }}
            </div>
            <div v-else-if="progress < 95">⚙️ {{ t("gif.encoding") }}</div>
            <div v-else>✅ {{ t("gif.finalizing") }}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          v-if="!isGenerating"
          @click="closeModal"
          class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer text-sm sm:text-base"
        >
          {{ t("buttons.cancel") }}
        </button>
        <button
          v-if="!isGenerating"
          @click="generateGif"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-medium text-sm sm:text-base"
        >
          {{ t("gif.generateGif") }}
        </button>
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
