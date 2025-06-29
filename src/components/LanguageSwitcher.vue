<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { locale, t } = useI18n();
const showDropdown = ref(false);

const languages = [
  { code: "en", name: "English" },
  { code: "zh-TW", name: "繁體中文" },
];

const currentLanguage = ref(
  languages.find((lang) => lang.code === locale.value) || languages[0]
);

const switchLanguage = (langCode: string) => {
  locale.value = langCode;
  currentLanguage.value =
    languages.find((lang) => lang.code === langCode) || languages[0];
  showDropdown.value = false;

  // Save to localStorage
  localStorage.setItem("preferred-language", langCode);
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

// Close dropdown when clicking outside
const closeDropdown = () => {
  showDropdown.value = false;
};
</script>

<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all duration-300 cursor-pointer"
      :title="t('languages.switchLanguage')"
    >
      <!-- Proper globe/world icon -->
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="showDropdown"
      class="absolute top-full right-0 mt-2 w-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 overflow-hidden z-50"
      @click.stop
    >
      <button
        v-for="language in languages"
        :key="language.code"
        @click="switchLanguage(language.code)"
        class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
        :class="{ 'bg-blue-100': language.code === locale }"
      >
        <span class="text-gray-800 font-medium">{{ language.name }}</span>
        <svg
          v-if="language.code === locale"
          class="w-4 h-4 text-blue-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </button>
    </div>

    <!-- Backdrop to close dropdown -->
    <div
      v-if="showDropdown"
      class="fixed inset-0 z-40"
      @click="closeDropdown"
    ></div>
  </div>
</template>
