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
const totalFrames = ref(30);
const gifQuality = ref<"basic" | "high">("basic");
const gifDuration = ref(3);
const generationStatus = ref("");

// Pre-loaded images cache
const loadedImages = ref<HTMLImageElement[]>([]);

// GIF generation settings
const GIF_SETTINGS = {
  basic: {
    width: 300,
    height: 400,
    quality: 20, // Slightly lower quality for faster processing
    dither: false,
  },
  high: {
    width: 450,
    height: 600,
    quality: 15, // Slightly lower quality for faster processing
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
          canvas.width = 300;
          canvas.height = 400;
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
      canvas.width = 300;
      canvas.height = 400;
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

    // Generate frames with smooth lenticular animation
    const frameDelay = Math.max(
      80,
      (gifDuration.value * 1000) / totalFrames.value
    ); // Minimum 80ms for smoother playback
    const frames: { canvas: HTMLCanvasElement; delay: number }[] = [];

    // Pre-generate all frames
    for (let i = 0; i < totalFrames.value; i++) {
      currentFrame.value = i + 1;
      progress.value = (i / totalFrames.value) * 30; // 0-30% for frame generation
      generationStatus.value = `${t("gif.renderingFrame")} ${i + 1}/${
        totalFrames.value
      }`;

      // Create smooth oscillating tilt animation
      const normalizedTime = i / (totalFrames.value - 1);

      // Create a smooth back-and-forth motion
      let tiltValue: number;
      if (normalizedTime <= 0.5) {
        // First half: go from -0.8 to +0.8
        tiltValue = -0.8 + normalizedTime * 2 * 1.6;
      } else {
        // Second half: go from +0.8 back to -0.8
        tiltValue = 0.8 - (normalizedTime - 0.5) * 2 * 1.6;
      }

      console.log(
        `Rendering frame ${i + 1}/${
          totalFrames.value
        }, tilt: ${tiltValue.toFixed(2)}`
      );

      // Render frame with lenticular effect
      const canvas = renderLenticularFrame(
        tiltValue,
        settings.width,
        settings.height
      );
      frames.push({ canvas, delay: frameDelay });

      // Small delay to prevent blocking UI
      if (i % 3 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    console.log("All frames generated, starting GIF creation...");
    progress.value = 30;
    generationStatus.value = t("gif.generating");

    // Create GIF with web workers enabled for better performance
    const gif = new GIF({
      workers: 2, // Enable 2 web workers for better performance
      quality: settings.quality,
      width: settings.width,
      height: settings.height,
      debug: false,
      dither: settings.dither,
      transparent: null,
      background: "#000000",
      repeat: 0,
      workerScript: "/gif.worker.js", // Path to the worker script in public directory
    });

    // Add progress event listener for real progress tracking
    gif.on("progress", (p: number) => {
      const workerProgress = Math.round(p * 100);
      progress.value = 30 + workerProgress * 0.7; // 30-100% for GIF encoding
      generationStatus.value = `${t("gif.generating")} ${Math.round(
        progress.value
      )}%`;
      console.log("GIF encoding progress:", workerProgress + "%");
    });

    // Add all frames at once
    console.log("Adding frames to GIF...");
    for (let i = 0; i < frames.length; i++) {
      gif.addFrame(frames[i].canvas, { delay: frames[i].delay });

      // Small delay every few frames to keep UI responsive
      if (i % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    console.log("All frames added, starting encoding...");
    progress.value = 30;
    generationStatus.value = `${t("gif.generating")} 30%`;

    // Use a promise-based approach with increased timeout for web workers
    const gifBlob = await new Promise<Blob>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;

      // Increased timeout for web worker processing (2 minutes for high quality)
      const timeoutDuration = gifQuality.value === "high" ? 120000 : 90000;

      // Set a timeout to prevent infinite waiting
      timeoutId = setTimeout(() => {
        console.error(
          `GIF generation timeout after ${timeoutDuration / 1000} seconds`
        );
        reject(new Error("GIF generation timeout"));
      }, timeoutDuration);

      // Handle successful completion
      gif.on("finished", (blob: Blob) => {
        clearTimeout(timeoutId);

        progress.value = 100;
        generationStatus.value = t("gif.complete");
        console.log("GIF generation completed! Size:", blob.size, "bytes");

        resolve(blob);
      });

      // Handle errors
      gif.on("abort", () => {
        clearTimeout(timeoutId);
        console.error("GIF generation aborted");
        reject(new Error("GIF generation aborted"));
      });

      // Start rendering
      console.log("Starting GIF render with web workers...");
      gif.render();
    });

    // Small delay to show completion
    setTimeout(() => {
      emit("gifGenerated", gifBlob);
      isGenerating.value = false;
    }, 500);
  } catch (error) {
    console.error("Error generating GIF:", error);
    isGenerating.value = false;
    generationStatus.value = "";
    alert(t("gif.generationError"));
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
    // Fallback: create a simple gradient frame
    createFallbackFrame(ctx, width, height, tiltValue);
    return canvas;
  }

  try {
    // Create lenticular effect using pre-loaded images
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
  // Clear canvas with black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Calculate which images to blend based on tilt
  // const imageSelector = (tiltValue + 1) * 0.5 * (images.length - 1);
  // const imageIndex1 = Math.floor(imageSelector);
  // const imageIndex2 = Math.ceil(imageSelector);
  // const mixFactor = imageSelector - imageIndex1;

  // Clamp indices
  // const idx1 = Math.max(0, Math.min(imageIndex1, images.length - 1));
  // const idx2 = Math.max(0, Math.min(imageIndex2, images.length - 1));

  // Optimized lenticular strips effect
  const stripWidth = Math.max(3, Math.floor(width * 0.015)); // Wider strips for better performance
  const numStrips = Math.ceil(width / stripWidth);

  for (let strip = 0; strip < numStrips; strip++) {
    const x = strip * stripWidth;
    const actualStripWidth = Math.min(stripWidth, width - x);

    // Add slight variation to create the lenticular lens effect
    const stripVariation = Math.sin(strip * 0.15) * 0.1; // Reduced variation for smoother effect
    const stripTilt = Math.max(-1, Math.min(1, tiltValue + stripVariation));

    // Determine which image to use for this strip
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

    // Draw blended strip
    if (images[stripIdx1] && images[stripIdx1].complete) {
      try {
        // Calculate source coordinates maintaining aspect ratio
        const sourceX = (x / width) * images[stripIdx1].width;
        const sourceWidth =
          (actualStripWidth / width) * images[stripIdx1].width;

        // Draw primary image strip
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

        // Blend with secondary image if different
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
        // Fallback: fill with interpolated color
        const hue1 = stripIdx1 * 60;
        const hue2 = stripIdx2 * 60;
        const blendedHue = hue1 + (hue2 - hue1) * stripMix;
        ctx.fillStyle = `hsl(${blendedHue}, 70%, 50%)`;
        ctx.fillRect(x, 0, actualStripWidth, height);
      }
    }

    // Add lenticular ridge lines (reduced frequency)
    if (strip % 8 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, 0, 1, height);
      ctx.restore();
    }
  }

  // Simplified shimmer effect
  const shimmerGradient = ctx.createLinearGradient(0, 0, width, 0);
  const shimmerOffset = (tiltValue + 1) * 0.5;
  const shimmerWidth = 0.15;

  shimmerGradient.addColorStop(
    Math.max(0, shimmerOffset - shimmerWidth),
    "rgba(255,255,255,0)"
  );
  shimmerGradient.addColorStop(shimmerOffset, "rgba(255,255,255,0.04)");
  shimmerGradient.addColorStop(
    Math.min(1, shimmerOffset + shimmerWidth),
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
  // Create a gradient background as fallback
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  const hue = (tiltValue + 1) * 180; // 0-360 degrees
  gradient.addColorStop(0, `hsl(${hue}, 70%, 30%)`);
  gradient.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 70%, 50%)`);
  gradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 70%, 30%)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add lenticular effect simulation
  const stripWidth = width * 0.02;
  const numStrips = Math.ceil(width / stripWidth);

  for (let i = 0; i < numStrips; i += 6) {
    const x = i * stripWidth;
    ctx.save();
    ctx.globalAlpha = 0.06;
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
    class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="closeModal"
  >
    <div
      class="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-800">
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
      <div v-if="!isGenerating" class="space-y-4 mb-6">
        <!-- Quality Setting -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{{
            t("gif.quality")
          }}</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="gifQuality = 'basic'"
              class="px-4 py-2 rounded-lg border transition-colors cursor-pointer"
              :class="
                gifQuality === 'basic'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              "
            >
              {{ t("gif.basicQuality") }}
              <div class="text-xs opacity-75">300×400px</div>
            </button>
            <button
              @click="gifQuality = 'high'"
              class="px-4 py-2 rounded-lg border transition-colors cursor-pointer"
              :class="
                gifQuality === 'high'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              "
            >
              {{ t("gif.highQuality") }}
              <div class="text-xs opacity-75">450×600px</div>
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
            max="5"
            step="0.5"
            v-model="gifDuration"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>2{{ t("gif.seconds") }}</span>
            <span>5{{ t("gif.seconds") }}</span>
          </div>
        </div>

        <!-- Frame Count -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ t("gif.frames") }}: {{ totalFrames }}
          </label>
          <input
            type="range"
            min="20"
            max="40"
            step="5"
            v-model="totalFrames"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>20</span>
            <span>40</span>
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
              {{ gifQuality === "basic" ? "1-3MB" : "3-8MB" }}
            </div>
          </div>
        </div>
      </div>

      <!-- Generation Progress -->
      <div v-if="isGenerating" class="mb-6">
        <div class="text-center mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-2">
            {{ generationStatus }}
          </div>
          <div class="text-sm text-gray-600">
            {{
              currentFrame > 0 && progress < 30
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

        <!-- Warning for long processing -->
        <div
          v-if="progress > 30 && progress < 95"
          class="mt-3 p-2 bg-yellow-50 rounded-lg"
        >
          <div class="text-xs text-yellow-800 text-center">
            Processing with web workers may take 1-2 minutes for high quality
            GIFs...
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          v-if="!isGenerating"
          @click="closeModal"
          class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors cursor-pointer"
        >
          {{ t("buttons.cancel") }}
        </button>
        <button
          v-if="!isGenerating"
          @click="generateGif"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-medium"
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
