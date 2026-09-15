import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  google: (credential) => api.post('/auth/google', { credential }),
}

export const learningAPI = {
  createGoal: (data) => api.post('/learning/goals', data),
  getGoals: () => api.get('/learning/goals'),
  getGoal: (id) => api.get(`/learning/goals/${id}`),
  generateRoadmap: (goalId) => api.post(`/roadmap/generate?goal_id=${goalId}`),
  getRoadmapByGoal: (goalId) => api.get(`/roadmap/by-goal/${goalId}`),
  getCheckpoint: (id) => api.get(`/checkpoints/${id}`),
  generateLesson: (checkpointId) => api.post(`/checkpoints/${checkpointId}/lesson`),
}

export const quizAPI = {
  generate: (data) => api.post('/quiz/generate', data),
  submit: (data) => api.post('/quiz/submit', data),
  feynman: (data) => api.post('/quiz/feynman', data),
}

export const progressAPI = {
  getProgress: (goalId) => api.get(`/progress/${goalId}`),
  getHistory: () => api.get('/history'),
  tutorChat: (data) => api.post('/tutor/chat', data),
  getResources: (checkpointId) => api.get(`/resources/${checkpointId}`),
}

export const materialsAPI = {
  upload: (formData) => api.post('/materials/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: () => api.get('/materials/'),
  search: (query) => api.post('/materials/search', { query }),
  ask: (question) => api.post('/materials/ask', { query: question }),
}

export default api
