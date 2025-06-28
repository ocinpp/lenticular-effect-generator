<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  imageUploaded: [type: 'left' | 'right', imageData: string]
}>()

const leftImagePreview = ref<string | null>(null)
const rightImagePreview = ref<string | null>(null)
const isDragging = ref(false)
const dragType = ref<'left' | 'right' | null>(null)

const handleFileSelect = (event: Event, type: 'left' | 'right') => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file, type)
  }
}

const handleDrop = (event: DragEvent, type: 'left' | 'right') => {
  event.preventDefault()
  isDragging.value = false
  dragType.value = null
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0], type)
  }
}

const handleDragOver = (event: DragEvent, type: 'left' | 'right') => {
  event.preventDefault()
  isDragging.value = true
  dragType.value = type
}

const handleDragLeave = () => {
  isDragging.value = false
  dragType.value = null
}

const processFile = (file: File, type: 'left' | 'right') => {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (type === 'left') {
      leftImagePreview.value = result
    } else {
      rightImagePreview.value = result
    }
    emit('imageUploaded', type, result)
  }
  reader.readAsDataURL(file)
}

const removeImage = (type: 'left' | 'right') => {
  if (type === 'left') {
    leftImagePreview.value = null
  } else {
    rightImagePreview.value = null
  }
}
</script>

<template>
  <div class="grid md:grid-cols-2 gap-3 lg:gap-4">
    <!-- Left Image Upload -->
    <div class="space-y-2">
      <h3 class="text-base md:text-lg font-semibold text-white text-center">Left Image</h3>
      <div 
        class="relative drop-zone border-2 border-dashed border-slate-400 rounded-lg p-3 text-center bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-blue-400 hover:bg-white/10"
        :class="{ 'dragover border-blue-500 bg-blue-50/10': isDragging && dragType === 'left' }"
        @drop="handleDrop($event, 'left')"
        @dragover="handleDragOver($event, 'left')"
        @dragleave="handleDragLeave"
      >
        <div v-if="!leftImagePreview" class="py-3">
          <div class="w-8 h-8 md:w-10 md:h-10 mb-2 mx-auto bg-slate-600 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <p class="text-white mb-1 text-xs md:text-sm">Drop image or</p>
          <input
            type="file"
            accept="image/*"
            class="file-input"
            id="left-file"
            @change="handleFileSelect($event, 'left')"
          >
          <label
            for="left-file"
            class="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors duration-300 text-xs md:text-sm"
          >
            Browse
          </label>
        </div>
        
        <div v-else class="relative">
          <img :src="leftImagePreview" alt="Left image preview" class="w-full h-20 md:h-24 object-cover rounded-md">
          <button
            @click="removeImage('left')"
            class="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-300"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <div class="mt-1 text-xs text-slate-300 text-center">Left Image</div>
        </div>
      </div>
    </div>

    <!-- Right Image Upload -->
    <div class="space-y-2">
      <h3 class="text-base md:text-lg font-semibold text-white text-center">Right Image</h3>
      <div 
        class="relative drop-zone border-2 border-dashed border-slate-400 rounded-lg p-3 text-center bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-blue-400 hover:bg-white/10"
        :class="{ 'dragover border-blue-500 bg-blue-50/10': isDragging && dragType === 'right' }"
        @drop="handleDrop($event, 'right')"
        @dragover="handleDragOver($event, 'right')"
        @dragleave="handleDragLeave"
      >
        <div v-if="!rightImagePreview" class="py-3">
          <div class="w-8 h-8 md:w-10 md:h-10 mb-2 mx-auto bg-slate-600 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <p class="text-white mb-1 text-xs md:text-sm">Drop image or</p>
          <input
            type="file"
            accept="image/*"
            class="file-input"
            id="right-file"
            @change="handleFileSelect($event, 'right')"
          >
          <label
            for="right-file"
            class="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors duration-300 text-xs md:text-sm"
          >
            Browse
          </label>
        </div>
        
        <div v-else class="relative">
          <img :src="rightImagePreview" alt="Right image preview" class="w-full h-20 md:h-24 object-cover rounded-md">
          <button
            @click="removeImage('right')"
            class="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-300"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <div class="mt-1 text-xs text-slate-300 text-center">Right Image</div>
        </div>
      </div>
    </div>
  </div>
</template>