<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Mesh, PlaneGeometry, ShaderMaterial, TextureLoader, Vector2 } from 'three'

const props = defineProps<{
  images: string[]
  tilt: number
}>()

const meshRef = ref<Mesh>()
const material = ref<ShaderMaterial>()

// Mobile-friendly 3:4 portrait aspect ratio for better mobile viewing
const CARD_ASPECT_RATIO = 3 / 4

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Enhanced fragment shader for multi-image lenticular effect
const fragmentShader = `
  uniform sampler2D textures[5];
  uniform float tilt;
  uniform vec2 resolution;
  uniform int imageCount;
  
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    
    // All images are pre-cropped to 3:4 portrait ratio, so use UV directly
    vec2 imageUv = uv;
    
    // Create very fine lenticular strips
    float stripWidth = 0.003; // Very fine strips
    float stripIndex = floor(uv.x / stripWidth);
    
    // Calculate which image to show based on tilt and strip
    float tiltFactor = tilt * 2.0; // Amplify tilt effect
    float viewAngle = tiltFactor + sin(stripIndex * 0.5) * 0.3;
    
    // Map tilt to image selection for multiple images
    float imageSelector = (viewAngle + 1.0) * 0.5; // Normalize to 0-1
    imageSelector = imageSelector * float(imageCount - 1); // Scale to image count
    
    int imageIndex1 = int(floor(imageSelector));
    int imageIndex2 = int(ceil(imageSelector));
    float mixFactor = fract(imageSelector);
    
    // Clamp indices
    imageIndex1 = clamp(imageIndex1, 0, imageCount - 1);
    imageIndex2 = clamp(imageIndex2, 0, imageCount - 1);
    
    // Add parallax effect
    vec2 parallaxOffset = vec2(tilt * 0.02, 0.0);
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
    
    // Add very visible vertical lines to show lenticular effect
    float linePattern = sin(uv.x * 1200.0); // High frequency lines
    float lineIntensity = smoothstep(0.8, 1.0, abs(linePattern)) * 0.25; // More visible lines
    
    // Add shimmer effect
    float shimmer = sin(uv.x * 400.0 + tilt * 20.0) * 0.1;
    
    // Combine effects - make lines more prominent
    finalColor.rgb += lineIntensity * vec3(0.9, 0.95, 1.0); // Slight blue tint to lines
    finalColor.rgb += shimmer * 0.15;
    
    // Add subtle rainbow effect on the lines
    float rainbow = sin(uv.x * 600.0 + tilt * 15.0) * 0.08;
    finalColor.r += rainbow * lineIntensity * 1.2;
    finalColor.g += rainbow * lineIntensity * 0.9;
    finalColor.b += rainbow * lineIntensity * 1.1;
    
    // Enhance contrast slightly
    finalColor.rgb = pow(finalColor.rgb, vec3(1.05));
    
    gl_FragColor = finalColor;
  }
`

const resizeImage = (imageUrl: string, maxSize: number = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      // Calculate new dimensions maintaining 3:4 aspect ratio
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to data URL with compression
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.src = imageUrl
  })
}

const loadTextures = async () => {
  if (!meshRef.value || props.images.length === 0) return

  const loader = new TextureLoader()
  
  try {
    // Resize images for better performance
    const resizedImages = await Promise.all(
      props.images.map(img => resizeImage(img))
    )
    
    // Load textures
    const textures = await Promise.all(
      resizedImages.map(img => loader.loadAsync(img))
    )
    
    // Pad textures array to 5 elements (shader limitation)
    while (textures.length < 5) {
      textures.push(textures[textures.length - 1])
    }

    // Update plane geometry to 3:4 portrait aspect ratio (mobile-friendly)
    const maxSize = 5
    const planeWidth = maxSize * CARD_ASPECT_RATIO
    const planeHeight = maxSize
    
    const geometry = new PlaneGeometry(planeWidth, planeHeight, 64, 64)
    meshRef.value.geometry = geometry

    // Create shader material
    const shaderMaterial = new ShaderMaterial({
      uniforms: {
        textures: { value: textures },
        tilt: { value: props.tilt },
        resolution: { value: new Vector2(1024, 768) },
        imageCount: { value: props.images.length }
      },
      vertexShader,
      fragmentShader
    })

    material.value = shaderMaterial
    meshRef.value.material = shaderMaterial
  } catch (error) {
    console.error('Error loading textures:', error)
  }
}

// Watch for tilt changes
watch(() => props.tilt, (newTilt) => {
  if (material.value) {
    material.value.uniforms.tilt.value = newTilt
  }
})

// Watch for image changes
watch(() => props.images, () => {
  loadTextures()
}, { deep: true })

onMounted(() => {
  loadTextures()
})
</script>

<template>
  <TresMesh ref="meshRef" :position="[0, 0, 0]">
    <TresPlaneGeometry :args="[3.75, 5, 32, 32]" />
    <TresMeshBasicMaterial color="#ffffff" />
  </TresMesh>
</template>