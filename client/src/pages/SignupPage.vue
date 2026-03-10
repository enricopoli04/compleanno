<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleSignup() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Le password non coincidono';
    return;
  }

  loading.value = true;
  try {
    await auth.signup(username.value, password.value);
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
    <div class="auth-panel right" style="justify-content: flex-start; padding-top: 4rem">
      <div class="auth-deco">SIGN<br />UP.</div>
      <p class="auth-quote">
        Unisciti e partecipa all'evento. Registrandoti potrai confermare la tua presenza e
        organizzare i passaggi in macchina con gli altri partecipanti.
      </p>
    </div>

    <div class="auth-panel left" style="border-right: none; border-left: var(--bordo)">
      <div>
        <div class="auth-tag">— Nuovo account</div>
        <h1 class="auth-title">
          Crea il<br />
          <span style="color: var(--giallo); -webkit-text-stroke: 1.5px var(--nero)">
            tuo account.
          </span>
        </h1>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div class="auth-form">
        <div class="field">
          <label>Username</label>
          <input
            v-model="username"
            type="text"
            placeholder="Scegli un username"
            @keyup.enter="handleSignup"
          />
        </div>
        <div class="field">
          <label>Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Min. 6 caratteri"
            @keyup.enter="handleSignup"
          />
        </div>
        <div class="field">
          <label>Conferma Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Ripeti la password"
            @keyup.enter="handleSignup"
          />
        </div>
      </div>

      <div class="auth-actions">
        <button class="btn-full" @click="handleSignup" :disabled="loading">
          {{ loading ? 'Caricamento...' : 'Registrati →' }}
        </button>
        <div class="divider">hai già un account?</div>
        <router-link to="/login" class="btn-outline" style="display:block; text-align:center;">
          Accedi
        </router-link>
      </div>
    </div>
  </div>
</template>
