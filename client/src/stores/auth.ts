import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api';

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<{ id: string; username: string; attending: string | null } | null>(null);

  const isLoggedIn = computed(() => !!token.value && isTokenValid(token.value));

  async function signup(username: string, password: string) {
    const data = await api.signup(username, password);
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('token', data.token);
  }

  async function login(username: string, password: string) {
    const data = await api.login(username, password);
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('token', data.token);
  }

  async function fetchMe() {
    if (!token.value) return;
    try {
      user.value = await api.getMe();
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  }

  async function setAttendance(attending: 'yes' | 'no' | null) {
    user.value = await api.setAttendance(attending);
  }

  return { token, user, isLoggedIn, signup, login, fetchMe, logout, setAttendance };
});
