<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Mesh, PlaneGeometry, ShaderMaterial, TextureLoader, Vector2 } from 'three'

const props = defineProps<{
  leftImage: string
  rightImage: string
  tilt: number
}>()

const meshRef = ref<Mesh>()
const material = ref<ShaderMaterial>()
const imageAspectRatio = ref(1)

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Enhanced fragment shader for better lenticular effect
const fragmentShader = `
  uniform sampler2D leftTexture;
  uniform sampler2D rightTexture;
  uniform float tilt;
  uniform vec2 resolution;
  uniform float aspectRatio;
  
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    
    // Calculate proper UV coordinates to fit image without stretching
    vec2 imageUv = uv;
    
    // Fit image properly based on aspect ratio
    if (aspectRatio > 1.0) {
      // Wide image - fit height, center horizontally
      float scale = 1.0 / aspectRatio;
      imageUv.x = (imageUv.x - 0.5) * aspectRatio + 0.5;
      if (imageUv.x < 0.0 || imageUv.x > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
    } else {
      // Tall image - fit width, center vertically
      imageUv.y = (imageUv.y - 0.5) / aspectRatio + 0.5;
      if (imageUv.y < 0.0 || imageUv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
    }
    
    // Create more visible lenticular strips
    float stripWidth = 0.008; // Even finer strips for better effect
    float stripIndex = floor(uv.x / stripWidth);
    float stripOffset = mod(uv.x, stripWidth) / stripWidth;
    
    // Calculate which image to show based on tilt and strip
    float tiltFactor = tilt * 2.0; // Amplify tilt effect more
    float viewAngle = tiltFactor + sin(stripIndex * 0.5) * 0.3; // More variation per strip
    
    // Smooth transition between images
    float mixFactor = (viewAngle + 1.0) * 0.5;
    mixFactor = smoothstep(0.1, 0.9, mixFactor);
    
    // Add more pronounced parallax effect
    vec2 leftUv = imageUv + vec2(tilt * 0.02, 0.0);
    vec2 rightUv = imageUv - vec2(tilt * 0.02, 0.0);
    
    // Clamp UV coordinates to prevent texture bleeding
    leftUv = clamp(leftUv, 0.0, 1.0);
    rightUv = clamp(rightUv, 0.0, 1.0);
    
    vec4 leftColor = texture2D(leftTexture, leftUv);
    vec4 rightColor = texture2D(rightTexture, rightUv);
    
    // Create the lenticular effect with more visible strips
    vec4 finalColor = mix(leftColor, rightColor, mixFactor);
    
    // Add more visible vertical lines to show lenticular effect
    float lineIntensity = sin(uv.x * 800.0) * 0.15; // More visible lines
    float linePattern = smoothstep(0.8, 1.0, abs(sin(uv.x * 400.0))); // Sharp lines
    
    // Add shimmer effect that's more visible
    float shimmer = sin(uv.x * 200.0 + tilt * 10.0) * 0.1;
    
    // Combine effects
    finalColor.rgb += (lineIntensity + shimmer) * 0.2;
    finalColor.rgb += linePattern * 0.05; // Subtle line overlay
    
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
      
      // Calculate new dimensions
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

const calculateAspectRatio = (imageUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve(img.width / img.height)
    }
    img.src = imageUrl
  })
}

const loadTextures = async () => {
  if (!meshRef.value) return

  const loader = new TextureLoader()
  
  try {
    // Calculate aspect ratio from the first image
    const aspectRatio = await calculateAspectRatio(props.leftImage)
    imageAspectRatio.value = aspectRatio
    
    // Resize images for better performance
    const [resizedLeftImage, resizedRightImage] = await Promise.all([
      resizeImage(props.leftImage),
      resizeImage(props.rightImage)
    ])
    
    const [leftTexture, rightTexture] = await Promise.all([
      loader.loadAsync(resizedLeftImage),
      loader.loadAsync(resizedRightImage)
    ])

    // Update plane geometry to match image aspect ratio but fit properly
    const maxSize = 6
    let planeWidth, planeHeight
    
    if (aspectRatio > 1) {
      // Wide image
      planeWidth = maxSize
      planeHeight = maxSize / aspectRatio
    } else {
      // Tall image
      planeWidth = maxSize * aspectRatio
      planeHeight = maxSize
    }
    
    const geometry = new PlaneGeometry(planeWidth, planeHeight, 64, 64)
    meshRef.value.geometry = geometry

    // Create shader material
    const shaderMaterial = new ShaderMaterial({
      uniforms: {
        leftTexture: { value: leftTexture },
        rightTexture: { value: rightTexture },
        tilt: { value: props.tilt },
        resolution: { value: new Vector2(1024, 768) },
        aspectRatio: { value: aspectRatio }
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
watch([() => props.leftImage, () => props.rightImage], () => {
  loadTextures()
})

onMounted(() => {
  loadTextures()
})
</script>

<template>
  <TresMesh ref="meshRef" :position="[0, 0, 0]">
    <TresPlaneGeometry :args="[4, 3, 32, 32]" />
    <TresMeshBasicMaterial color="#ffffff" />
  </TresMesh>
</template>