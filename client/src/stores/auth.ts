import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: string; username: string; role: 'user' | 'admin'; attending: string | null; note: string } | null>(null);

  const isLoggedIn = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  let initPromise: Promise<void> | null = null;

  function init() {
    if (!initPromise) {
      initPromise = api
        .getMe()
        .then((me) => {
          user.value = me;
        })
        .catch(() => {
          user.value = null;
        });
    }
    return initPromise;
  }

  async function fetchMe() {
    try {
      user.value = await api.getMe();
    } catch {
      user.value = null;
    }
  }

  async function signup(username: string, password: string) {
    const data = await api.signup(username, password);
    user.value = data.user;
  }

  async function login(username: string, password: string) {
    const data = await api.login(username, password);
    user.value = data.user;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      user.value = null;
    }
  }

  async function setAttendance(attending: 'yes' | 'no' | null) {
    user.value = await api.setAttendance(attending);
  }

  async function setNote(note: string) {
    user.value = await api.setNote(note);
  }

  return { user, isLoggedIn, isAdmin, init, fetchMe, signup, login, logout, setAttendance, setNote };
});
