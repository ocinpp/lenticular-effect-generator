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

// Fragment shader for lenticular effect
const fragmentShader = `
  uniform sampler2D leftTexture;
  uniform sampler2D rightTexture;
  uniform float tilt;
  uniform vec2 resolution;
  uniform float aspectRatio;
  
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    
    // Maintain aspect ratio
    vec2 aspectUv = uv;
    if (aspectRatio > 1.0) {
      aspectUv.y = (aspectUv.y - 0.5) * aspectRatio + 0.5;
    } else {
      aspectUv.x = (aspectUv.x - 0.5) / aspectRatio + 0.5;
    }
    
    // Create lenticular strips
    float stripWidth = 0.015; // Finer strips for better effect
    float stripIndex = floor(uv.x / stripWidth);
    float stripOffset = mod(uv.x, stripWidth) / stripWidth;
    
    // Calculate which image to show based on tilt and strip
    float tiltFactor = tilt * 1.5; // Amplify tilt effect
    float viewAngle = tiltFactor + sin(stripIndex * 0.3) * 0.2; // Add some variation per strip
    
    // Smooth transition between images
    float mixFactor = (viewAngle + 1.0) * 0.5;
    mixFactor = smoothstep(0.0, 1.0, mixFactor);
    
    // Add subtle parallax effect
    vec2 leftUv = aspectUv + vec2(tilt * 0.015, 0.0);
    vec2 rightUv = aspectUv - vec2(tilt * 0.015, 0.0);
    
    // Clamp UV coordinates to prevent texture bleeding
    leftUv = clamp(leftUv, 0.0, 1.0);
    rightUv = clamp(rightUv, 0.0, 1.0);
    
    vec4 leftColor = texture2D(leftTexture, leftUv);
    vec4 rightColor = texture2D(rightTexture, rightUv);
    
    // Create the lenticular effect
    vec4 finalColor = mix(leftColor, rightColor, mixFactor);
    
    // Add subtle shimmer effect based on strip position
    float shimmer = sin(uv.x * 120.0 + tilt * 8.0) * 0.05;
    finalColor.rgb += shimmer * 0.1;
    
    // Enhance contrast slightly
    finalColor.rgb = pow(finalColor.rgb, vec3(1.1));
    
    gl_FragColor = finalColor;
  }
`

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
    
    const [leftTexture, rightTexture] = await Promise.all([
      loader.loadAsync(props.leftImage),
      loader.loadAsync(props.rightImage)
    ])

    // Update plane geometry to match image aspect ratio
    const planeWidth = aspectRatio > 1 ? 6 : 6 / aspectRatio
    const planeHeight = aspectRatio > 1 ? 6 / aspectRatio : 6
    
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