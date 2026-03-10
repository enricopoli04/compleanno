<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push('/evento');
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-panel left">
      <div>
        <div class="auth-tag">— Area riservata</div>
        <h1 class="auth-title">Bentornato<br /><span class="accent">di nuovo.</span></h1>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div class="auth-form">
        <div class="field">
          <label>Username</label>
          <input
            v-model="username"
            type="text"
            placeholder="Il tuo username"
            @keyup.enter="handleLogin"
          />
        </div>
        <div class="field">
          <label>Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            @keyup.enter="handleLogin"
          />
        </div>
      </div>

      <div class="auth-actions">
        <button class="btn-full" @click="handleLogin" :disabled="loading">
          {{ loading ? 'Caricamento...' : 'Accedi →' }}
        </button>
        <div class="divider">oppure</div>
        <router-link to="/signup" class="btn-outline" style="display:block; text-align:center;">
          Crea un account
        </router-link>
      </div>

      <div class="auth-switch">
        Non hai un account?
        <router-link to="/signup">Registrati qui</router-link>
      </div>
    </div>

    <div class="auth-panel right">
      <div class="auth-deco">LOG<br />IN.</div>
      <p class="auth-quote">
        Accedi alla tua area personale per gestire la partecipazione all'evento e organizzare i
        passaggi in macchina.
      </p>
    </div>
  </div>
</template>
