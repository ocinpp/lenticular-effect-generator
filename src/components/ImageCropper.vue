<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps<{
  imageUrl: string;
}>();

const emit = defineEmits<{
  cropped: [croppedImageData: string, cropData: any];
  skip: [];
  back: [];
}>();

const canvasRef = ref<HTMLCanvasElement>();
const imageRef = ref<HTMLImageElement>();
const containerRef = ref<HTMLElement>();
const isDragging = ref(false);
const isResizing = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const resizeHandle = ref("");

// Mobile-friendly portrait aspect ratio (3:4 - perfect for mobile viewing)
const CARD_ASPECT_RATIO = 3 / 4;

const cropArea = ref({
  x: 50,
  y: 50,
  width: 200,
  height: 267, // 3:4 ratio
});

const imageData = ref({
  width: 0,
  height: 0,
  naturalWidth: 0,
  naturalHeight: 0,
  scale: 1,
});

const handleImageLoad = () => {
  if (!imageRef.value || !containerRef.value) return;

  const img = imageRef.value;
  const container = containerRef.value;

  imageData.value.naturalWidth = img.naturalWidth;
  imageData.value.naturalHeight = img.naturalHeight;

  // Calculate display size
  const containerRect = container.getBoundingClientRect();
  const maxWidth = containerRect.width - 40;
  const maxHeight = containerRect.height - 120;

  const aspectRatio = img.naturalWidth / img.naturalHeight;

  if (aspectRatio > maxWidth / maxHeight) {
    imageData.value.width = maxWidth;
    imageData.value.height = maxWidth / aspectRatio;
  } else {
    imageData.value.height = maxHeight;
    imageData.value.width = maxHeight * aspectRatio;
  }

  imageData.value.scale = imageData.value.width / img.naturalWidth;

  // Calculate crop area with 3:4 aspect ratio (portrait)
  const cropWidth = Math.min(250, imageData.value.width * 0.7);
  const cropHeight = cropWidth / CARD_ASPECT_RATIO;

  // Ensure crop area fits within image
  const finalCropWidth = Math.min(cropWidth, imageData.value.width);
  const finalCropHeight = Math.min(cropHeight, imageData.value.height);

  // If height constraint is tighter, recalculate width
  if (finalCropHeight < cropHeight) {
    const adjustedWidth = finalCropHeight * CARD_ASPECT_RATIO;
    cropArea.value = {
      x: (imageData.value.width - adjustedWidth) / 2,
      y: (imageData.value.height - finalCropHeight) / 2,
      width: adjustedWidth,
      height: finalCropHeight,
    };
  } else {
    cropArea.value = {
      x: (imageData.value.width - finalCropWidth) / 2,
      y: (imageData.value.height - finalCropHeight) / 2,
      width: finalCropWidth,
      height: finalCropHeight,
    };
  }
};

// Touch and Mouse event handlers
const getEventCoordinates = (event: MouseEvent | TouchEvent) => {
  if ("touches" in event) {
    return {
      clientX: event.touches[0].clientX,
      clientY: event.touches[0].clientY,
    };
  }
  return {
    clientX: event.clientX,
    clientY: event.clientY,
  };
};

const handleStart = (event: MouseEvent | TouchEvent, action: string) => {
  event.preventDefault();
  const coords = getEventCoordinates(event);

  if (action === "drag") {
    isDragging.value = true;
    dragStart.value = {
      x: coords.clientX - cropArea.value.x,
      y: coords.clientY - cropArea.value.y,
    };
  } else if (action.startsWith("resize")) {
    isResizing.value = true;
    resizeHandle.value = action;
    dragStart.value = { x: coords.clientX, y: coords.clientY };
  }
};

const handleMove = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value && !isResizing.value) return;

  event.preventDefault();
  const coords = getEventCoordinates(event);

  if (isDragging.value) {
    const newX = Math.max(
      0,
      Math.min(
        imageData.value.width - cropArea.value.width,
        coords.clientX - dragStart.value.x
      )
    );
    const newY = Math.max(
      0,
      Math.min(
        imageData.value.height - cropArea.value.height,
        coords.clientY - dragStart.value.y
      )
    );

    cropArea.value.x = newX;
    cropArea.value.y = newY;
  } else if (isResizing.value) {
    const deltaX = coords.clientX - dragStart.value.x;
    const deltaY = coords.clientY - dragStart.value.y;

    if (resizeHandle.value === "resize-se") {
      // Maintain 3:4 aspect ratio during resize
      const newWidth = Math.max(
        100,
        Math.min(
          imageData.value.width - cropArea.value.x,
          cropArea.value.width + deltaX
        )
      );
      const newHeight = newWidth / CARD_ASPECT_RATIO;

      // Check if new height fits
      if (cropArea.value.y + newHeight <= imageData.value.height) {
        cropArea.value.width = newWidth;
        cropArea.value.height = newHeight;
      } else {
        // Height constrained, adjust width accordingly
        const maxHeight = imageData.value.height - cropArea.value.y;
        cropArea.value.height = maxHeight;
        cropArea.value.width = maxHeight * CARD_ASPECT_RATIO;
      }
    }

    dragStart.value = { x: coords.clientX, y: coords.clientY };
  }
};

const handleEnd = () => {
  isDragging.value = false;
  isResizing.value = false;
  resizeHandle.value = "";
};

// Mouse events
const handleMouseDown = (event: MouseEvent, action: string) => {
  handleStart(event, action);
};

const handleMouseMove = (event: MouseEvent) => {
  handleMove(event);
};

const handleMouseUp = () => {
  handleEnd();
};

// Touch events
const handleTouchStart = (event: TouchEvent, action: string) => {
  handleStart(event, action);
};

const handleTouchMove = (event: TouchEvent) => {
  handleMove(event);
};

const handleTouchEnd = () => {
  handleEnd();
};

const cropImage = () => {
  if (!canvasRef.value || !imageRef.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d")!;
  const img = imageRef.value;

  // Calculate crop coordinates in original image space
  const scaleX = img.naturalWidth / imageData.value.width;
  const scaleY = img.naturalHeight / imageData.value.height;

  const cropX = cropArea.value.x * scaleX;
  const cropY = cropArea.value.y * scaleY;
  const cropWidth = cropArea.value.width * scaleX;
  const cropHeight = cropArea.value.height * scaleY;

  // Set canvas size to maintain 3:4 aspect ratio
  const outputWidth = 600; // Standard output width for portrait
  const outputHeight = outputWidth / CARD_ASPECT_RATIO;

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Draw cropped image to fit the 3:4 canvas
  ctx.drawImage(
    img,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const croppedImageData = canvas.toDataURL("image/jpeg", 0.9);

  emit("cropped", croppedImageData, {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
    aspectRatio: CARD_ASPECT_RATIO,
  });
};

onMounted(() => {
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", handleTouchEnd);

  nextTick(() => {
    if (imageRef.value) {
      if (imageRef.value.complete) {
        handleImageLoad();
      } else {
        imageRef.value.onload = handleImageLoad;
      }
    }
  });
});

onUnmounted(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("touchmove", handleTouchMove);
  document.removeEventListener("touchend", handleTouchEnd);
});
</script>

<template>
  <div ref="containerRef" class="h-full flex flex-col overflow-hidden">
    <!-- Cropping Area -->
    <div
      class="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden"
    >
      <div class="relative inline-block">
        <img
          ref="imageRef"
          :src="props.imageUrl"
          alt="Image to crop"
          class="block touch-none"
          :style="{
            width: imageData.width + 'px',
            height: imageData.height + 'px',
          }"
          draggable="false"
        />

        <!-- Crop Overlay -->
        <div
          class="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move touch-none"
          :style="{
            left: cropArea.x + 'px',
            top: cropArea.y + 'px',
            width: cropArea.width + 'px',
            height: cropArea.height + 'px',
          }"
          @mousedown="handleMouseDown($event, 'drag')"
          @touchstart="handleTouchStart($event, 'drag')"
        >
          <!-- Resize Handle -->
          <div
            class="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 cursor-se-resize touch-none flex items-center justify-center"
            @mousedown.stop="handleMouseDown($event, 'resize-se')"
            @touchstart.stop="handleTouchStart($event, 'resize-se')"
          >
            <svg
              class="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22 22H2v-2h18V2h2v20z" />
              <path d="M14 14h8v8h-8z" />
            </svg>
          </div>

          <!-- Grid Lines -->
          <div class="absolute inset-0 pointer-events-none">
            <div
              class="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"
            ></div>
            <div
              class="absolute left-2/3 top-0 bottom-0 w-px bg-white/50"
            ></div>
            <div class="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
            <div class="absolute top-2/3 left-0 right-0 h-px bg-white/50"></div>
          </div>

          <!-- Aspect Ratio Indicator -->
          <div
            class="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded pointer-events-none"
          >
            {{ t("crop.portraitRatio") }}
          </div>
        </div>

        <!-- Dimmed Overlay -->
        <div
          class="absolute inset-0 bg-black/50 pointer-events-none"
          style="
            clip-path: polygon(
              0% 0%,
              0% 100%,
              var(--crop-x) 100%,
              var(--crop-x) var(--crop-y),
              calc(var(--crop-x) + var(--crop-width)) var(--crop-y),
              calc(var(--crop-x) + var(--crop-width))
                calc(var(--crop-y) + var(--crop-height)),
              var(--crop-x) calc(var(--crop-y) + var(--crop-height)),
              var(--crop-x) 100%,
              100% 100%,
              100% 0%
            );
          "
          :style="{
            '--crop-x': (cropArea.x / imageData.width) * 100 + '%',
            '--crop-y': (cropArea.y / imageData.height) * 100 + '%',
            '--crop-width': (cropArea.width / imageData.width) * 100 + '%',
            '--crop-height': (cropArea.height / imageData.height) * 100 + '%',
          }"
        ></div>
      </div>
    </div>

    <!-- Fixed Bottom Controls -->
    <div
      class="flex-shrink-0 px-4 pb-4 bg-black/20 backdrop-blur-sm border-t border-white/10"
    >
      <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="text-white text-sm">
            <p class="font-medium">{{ t("crop.touchInstructions") }}</p>
            <p class="text-slate-400">
              {{ t("crop.cropSize") }}
              {{ Math.round(cropArea.width / imageData.scale) }} ×
              {{ Math.round(cropArea.height / imageData.scale) }}px ({{
                t("crop.portraitRatio")
              }})
            </p>
            <p class="text-blue-300 text-xs">
              {{ t("crop.perfectAspectRatio") }}
            </p>
          </div>
        </div>

        <div class="flex space-x-3">
          <button
            @click="$emit('back')"
            class="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors cursor-pointer"
          >
            {{ t("buttons.back") }}
          </button>
          <button
            @click="$emit('skip')"
            class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            {{ t("buttons.skipCrop") }}
          </button>
          <button
            @click="cropImage"
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
          >
            {{ t("buttons.applyCrop") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden canvas for cropping -->
    <canvas ref="canvasRef" class="hidden"></canvas>
  </div>
</template>

<style scoped>
.cursor-move {
  cursor: move;
}
.cursor-se-resize {
  cursor: se-resize;
}
.touch-none {
  touch-action: none;
}
</style>
