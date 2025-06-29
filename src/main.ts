import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import i18n from './i18n'

const app = createApp(App)
app.use(i18n)

// Load saved language preference
const savedLanguage = localStorage.getItem('preferred-language')
if (savedLanguage && ['en', 'zh-TW'].includes(savedLanguage)) {
  i18n.global.locale.value = savedLanguage as 'en' | 'zh-TW'
}

app.mount('#app')