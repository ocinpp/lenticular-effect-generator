<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  imageUploaded: [imageData: string]
}>()

const imagePreview = ref<string | null>(null)
const isDragging = ref(false)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    imagePreview.value = result
    emit('imageUploaded', result)
  }
  reader.readAsDataURL(file)
}

const removeImage = () => {
  imagePreview.value = null
}
</script>

<template>
  <div class="w-full max-w-lg mx-auto">
    <div 
      class="relative drop-zone border-2 border-dashed border-slate-400 rounded-xl p-8 text-center bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-blue-400 hover:bg-white/10"
      :class="{ 'dragover border-blue-500 bg-blue-50/10': isDragging }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div v-if="!imagePreview" class="py-8">
        <div class="w-16 h-16 mb-4 mx-auto bg-slate-600 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h3 class="text-white text-lg font-semibold mb-2">Upload Image</h3>
        <p class="text-slate-300 mb-4">Drop your image here or click to browse</p>
        <input
          type="file"
          accept="image/*"
          class="file-input"
          id="file-input"
          @change="handleFileSelect"
        >
        <label
          for="file-input"
          class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors duration-300 font-medium"
        >
          Choose Image
        </label>
        <p class="text-slate-400 text-sm mt-3">
          Supports JPG, PNG, GIF up to 10MB
        </p>
      </div>
      
      <div v-else class="relative">
        <img :src="imagePreview" alt="Image preview" class="w-full h-48 object-cover rounded-lg">
        <button
          @click="removeImage"
          class="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-300"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <div class="mt-3 text-center">
          <p class="text-white font-medium">Image Selected</p>
          <p class="text-slate-300 text-sm">Click "Continue" or upload a different image</p>
        </div>
      </div>
    </div>
  </div>
</template>