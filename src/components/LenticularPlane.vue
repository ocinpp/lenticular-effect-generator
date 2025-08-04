<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import {
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  Vector2,
} from "three";
import type { LenticularDirection } from "./DirectionSelector.vue";

const props = defineProps<{
  images: string[];
  tilt: number;
  direction: LenticularDirection;
}>();

const meshRef = ref<Mesh>();
const material = ref<ShaderMaterial>();
const animationFrameId = ref<number>();
const lastTiltUpdate = ref(0);
const tiltBuffer = ref<number[]>([]);

// Mobile-friendly 3:4 portrait aspect ratio for better mobile viewing
const CARD_ASPECT_RATIO = 3 / 4;

// Performance optimization constants
const TILT_UPDATE_THROTTLE = 16; // ~60fps max
const TILT_SMOOTHING_SAMPLES = 3;
const MAX_TEXTURE_SIZE = 512; // Reduced for better performance

// Mobile-specific performance optimizations
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const MOBILE_MAX_TEXTURE_SIZE = 256; // Even smaller for mobile
const MOBILE_GEOMETRY_SEGMENTS = 16; // Reduced geometry complexity for mobile
const DESKTOP_GEOMETRY_SEGMENTS = 32;

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Optimized fragment shader with reduced complexity
const getFragmentShader = (direction: LenticularDirection) => `
  uniform sampler2D textures[5];
  uniform float tilt;
  uniform vec2 resolution;
  uniform int imageCount;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // All images are pre-cropped to 3:4 portrait ratio, so use UV directly
    vec2 imageUv = uv;

    // Reduced strip density for better performance
    float stripWidth = 0.005; // Slightly wider strips for better performance
    float stripIndex = ${
      direction === "vertical"
        ? "floor(uv.x / stripWidth)"
        : "floor(uv.y / stripWidth)"
    };

    // Simplified tilt calculation
    float tiltFactor = tilt * 1.5; // Reduced amplification
    float viewAngle = tiltFactor + sin(stripIndex * 0.3) * 0.2; // Reduced complexity

    // Map tilt to image selection
    float imageSelector = (viewAngle + 1.0) * 0.5;
    imageSelector = imageSelector * float(imageCount - 1);

    int imageIndex1 = int(floor(imageSelector));
    int imageIndex2 = int(ceil(imageSelector));
    float mixFactor = fract(imageSelector);

    // Clamp indices
    imageIndex1 = clamp(imageIndex1, 0, imageCount - 1);
    imageIndex2 = clamp(imageIndex2, 0, imageCount - 1);

    // Reduced parallax effect for performance
    vec2 parallaxOffset = ${
      direction === "vertical"
        ? "vec2(tilt * 0.01, 0.0)"
        : "vec2(0.0, tilt * 0.01)"
    };
    vec2 uv1 = clamp(imageUv + parallaxOffset * float(imageIndex1 - imageCount/2), 0.0, 1.0);
    vec2 uv2 = clamp(imageUv + parallaxOffset * float(imageIndex2 - imageCount/2), 0.0, 1.0);

    // Sample textures based on image indices
    vec4 color1, color2;

    if (imageIndex1 == 0) color1 = texture2D(textures[0], uv1);
    else if (imageIndex1 == 1) color1 = texture2D(textures[1], uv1);
    else if (imageIndex1 == 2) color1 = texture2D(textures[2], uv1);
    else if (imageIndex1 == 3) color1 = texture2D(textures[3], uv1);
    else color1 = texture2D(textures[4], uv1);

    if (imageIndex2 == 0) color2 = texture2D(textures[0], uv2);
    else if (imageIndex2 == 1) color2 = texture2D(textures[1], uv2);
    else if (imageIndex2 == 2) color2 = texture2D(textures[2], uv2);
    else if (imageIndex2 == 3) color2 = texture2D(textures[3], uv2);
    else color2 = texture2D(textures[4], uv2);

    // Blend between the two images
    vec4 finalColor = mix(color1, color2, smoothstep(0.0, 1.0, mixFactor));

    // Simplified line pattern for better performance
    float lineCoord = ${direction === "vertical" ? "uv.x" : "uv.y"};
    float linePattern = sin(lineCoord * 800.0); // Reduced frequency
    float lineIntensity = smoothstep(0.85, 1.0, abs(linePattern)) * 0.15; // Reduced intensity

    // Simplified shimmer effect
    float shimmer = sin(lineCoord * 200.0 + tilt * 10.0) * 0.05; // Reduced complexity

    // Combine effects with reduced intensity
    finalColor.rgb += lineIntensity * vec3(0.8, 0.85, 0.9);
    finalColor.rgb += shimmer * 0.1;

    // Simplified rainbow effect
    float rainbow = sin(lineCoord * 300.0 + tilt * 8.0) * 0.04; // Reduced complexity
    finalColor.r += rainbow * lineIntensity * 0.8;
    finalColor.g += rainbow * lineIntensity * 0.6;
    finalColor.b += rainbow * lineIntensity * 0.7;

    // Slight contrast enhancement
    finalColor.rgb = pow(finalColor.rgb, vec3(1.02));

    gl_FragColor = finalColor;
  }
`;

const resizeImage = (
  imageUrl: string,
  maxSize: number = isMobile ? MOBILE_MAX_TEXTURE_SIZE : MAX_TEXTURE_SIZE
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to data URL with higher compression for performance
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = imageUrl;
  });
};

// Smooth tilt value to prevent jittery updates
const smoothTilt = (newTilt: number): number => {
  tiltBuffer.value.push(newTilt);
  if (tiltBuffer.value.length > TILT_SMOOTHING_SAMPLES) {
    tiltBuffer.value.shift();
  }

  // Calculate average
  const sum = tiltBuffer.value.reduce((acc, val) => acc + val, 0);
  return sum / tiltBuffer.value.length;
};

// Throttled tilt update function
const updateTilt = (newTilt: number) => {
  const now = Date.now();
  if (now - lastTiltUpdate.value < TILT_UPDATE_THROTTLE) {
    return;
  }

  lastTiltUpdate.value = now;

  if (material.value) {
    const smoothedTilt = smoothTilt(newTilt);
    material.value.uniforms.tilt.value = smoothedTilt;
  }
};

const loadTextures = async () => {
  if (!meshRef.value || props.images.length === 0) return;

  const loader = new TextureLoader();

  try {
    // Resize images for better performance
    const resizedImages = await Promise.all(
      props.images.map((img) => resizeImage(img))
    );

    // Load textures with error handling
    const textures = await Promise.all(
      resizedImages.map(async (img) => {
        try {
          const texture = await loader.loadAsync(img);
          // Optimize texture settings for performance
          texture.generateMipmaps = false;
          texture.minFilter = 1003; // LinearFilter
          texture.magFilter = 1003; // LinearFilter
          return texture;
        } catch (error) {
          console.warn("Failed to load texture:", error);
          // Return a fallback texture or the first successful one
          return null;
        }
      })
    );

    // Filter out failed textures and pad array
    const validTextures = textures.filter((t) => t !== null);
    if (validTextures.length === 0) {
      console.error("No textures could be loaded");
      return;
    }

    // Pad textures array to 5 elements (shader limitation)
    while (validTextures.length < 5) {
      validTextures.push(validTextures[validTextures.length - 1]);
    }

    // Update plane geometry to 3:4 portrait aspect ratio (mobile-friendly)
    const maxSize = 5;
    const planeWidth = maxSize * CARD_ASPECT_RATIO;
    const planeHeight = maxSize;

    // Reduced geometry complexity for better performance (mobile-optimized)
    const segments = isMobile
      ? MOBILE_GEOMETRY_SEGMENTS
      : DESKTOP_GEOMETRY_SEGMENTS;
    const geometry = new PlaneGeometry(
      planeWidth,
      planeHeight,
      segments,
      segments
    );
    meshRef.value.geometry = geometry;

    // Dispose of old material to prevent memory leaks
    if (material.value) {
      material.value.dispose();
    }

    // Create shader material with mobile-optimized settings
    const resolution = isMobile ? MOBILE_MAX_TEXTURE_SIZE : MAX_TEXTURE_SIZE;
    const shaderMaterial = new ShaderMaterial({
      uniforms: {
        textures: { value: validTextures },
        tilt: { value: props.tilt },
        resolution: { value: new Vector2(resolution, resolution) },
        imageCount: { value: props.images.length },
      },
      vertexShader,
      fragmentShader: getFragmentShader(props.direction),
      // Performance optimizations (enhanced for mobile)
      transparent: false,
      alphaTest: 0,
      depthWrite: true,
      depthTest: true,
      precision: isMobile ? "mediump" : "highp", // Lower precision on mobile
    });

    material.value = shaderMaterial;
    meshRef.value.material = shaderMaterial;
  } catch (error) {
    console.error("Error loading textures:", error);
  }
};

// Cleanup function to prevent memory leaks
const cleanup = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
  }

  if (material.value) {
    // Dispose of textures
    const textures = material.value.uniforms.textures.value;
    if (Array.isArray(textures)) {
      textures.forEach((texture) => {
        if (texture && texture.dispose) {
          texture.dispose();
        }
      });
    }

    // Dispose of material
    material.value.dispose();
  }

  if (meshRef.value && meshRef.value.geometry) {
    meshRef.value.geometry.dispose();
  }
};

// Watch for tilt changes with throttling
watch(
  () => props.tilt,
  (newTilt) => {
    updateTilt(newTilt);
  }
);

// Watch for image changes
watch(
  () => props.images,
  () => {
    cleanup();
    loadTextures();
  },
  { deep: true }
);

// Watch for direction changes
watch(
  () => props.direction,
  () => {
    cleanup();
    loadTextures();
  }
);

onMounted(() => {
  loadTextures();
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <TresMesh ref="meshRef" :position="[0, 0, 0]" />
</template>
