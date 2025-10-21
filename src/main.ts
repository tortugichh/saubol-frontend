import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import RoomCreator from './pages/RoomCreator.vue'
import Transcription from './pages/Transcription.vue'

const routes = [
  { path: '/', name: 'RoomCreator', component: RoomCreator },
  { path: '/transcription', name: 'Transcription', component: Transcription },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
