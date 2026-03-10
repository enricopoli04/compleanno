<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const router = useRouter();

onMounted(async () => {
  if (auth.isLoggedIn) {
    await auth.fetchMe();
  }
});

function logout() {
  auth.logout();
  router.push('/login');
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}
</script>

<template>
  <nav class="app-nav">
    <router-link to="/evento" class="nav-logo">EVENTO</router-link>

    <ul class="nav-links" v-if="auth.isLoggedIn">
      <li><router-link to="/evento">Info Evento</router-link></li>
      <li><router-link to="/partecipazione">Partecipazione</router-link></li>
    </ul>

    <ul class="nav-right" v-if="!auth.isLoggedIn">
      <li><router-link to="/login">Accedi</router-link></li>
      <li class="signup-link"><router-link to="/signup">Registrati</router-link></li>
    </ul>

    <template v-else>
      <div style="margin-left: auto; display: flex; align-items: stretch;">
        <div class="nav-user" v-if="auth.user">
          <span class="user-badge">{{ initials(auth.user.username) }}</span>
          {{ auth.user.username }}
        </div>
        <ul class="nav-right" style="margin-left: 0;">
          <li><button @click="logout">Esci</button></li>
        </ul>
      </div>
    </template>
  </nav>

  <router-view />

  <footer>
    <span>&copy; 2025 Nome Organizzazione</span>
    <span>evento@email.it</span>
  </footer>
</template>
