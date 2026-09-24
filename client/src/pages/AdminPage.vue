<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { api } from '../api';

const auth = useAuthStore();

const users = ref<any[]>([]);
const cars = ref<any[]>([]);
const errorMsg = ref('');

async function loadData() {
  try {
    const [u, c] = await Promise.all([api.adminGetUsers(), api.adminGetCars()]);
    users.value = u;
    cars.value = c;
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

async function setAttendance(id: string, attending: 'yes' | 'no' | null) {
  errorMsg.value = '';
  try {
    await api.adminSetUserAttendance(id, attending);
    await loadData();
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

async function deleteUser(id: string) {
  errorMsg.value = '';
  try {
    await api.adminDeleteUser(id);
    await loadData();
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

async function updateCarSeats(id: string, seats: number) {
  errorMsg.value = '';
  try {
    await api.adminUpdateCar(id, seats);
    await loadData();
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

async function deleteCar(id: string) {
  errorMsg.value = '';
  try {
    await api.adminDeleteCar(id);
    await loadData();
  } catch (e: any) {
    errorMsg.value = e.message;
  }
}

onMounted(loadData);
</script>

<template>
  <div>
    <div class="section-title">— Amministrazione</div>

    <div v-if="errorMsg" class="error-msg" style="margin: 1.5rem 3rem">
      {{ errorMsg }}
    </div>

    <!-- USERS -->
    <div style="padding: 2rem 3rem; border-bottom: var(--bordo)">
      <h2 style="margin-bottom: 1rem">Utenti ({{ users.length }})</h2>

      <div
        v-for="u in users"
        :key="u._id"
        style="
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.7rem 0;
          border-bottom: var(--bordo);
          flex-wrap: wrap;
        "
      >
        <strong style="min-width: 140px">{{ u.username }}</strong>

        <span
          class="attendee-badge"
          :style="u.role === 'admin' ? 'background: var(--nero); color: var(--bianco)' : 'background: #eee; color: #555'"
        >
          {{ u.role }}
        </span>

        <span
          class="attendee-badge"
          :class="u.attending === 'yes' ? 'badge-yes' : ''"
          :style="u.attending === 'no' ? 'background: #555; color: white' : (u.attending === null ? 'background: #eee; color: #888' : '')"
        >
          {{ u.attending === 'yes' ? 'sì' : u.attending === 'no' ? 'no' : 'nessuna risposta' }}
        </span>

        <div style="margin-left: auto; display: flex; gap: 0.5rem; flex-wrap: wrap">
          <button class="btn btn-sm" @click="setAttendance(u._id, 'yes')">Sì</button>
          <button class="btn btn-sm" @click="setAttendance(u._id, 'no')">No</button>
          <button class="btn btn-sm" @click="setAttendance(u._id, null)">Reset</button>
          <button
            v-if="u._id !== auth.user?.id"
            class="btn btn-sm btn-danger"
            @click="deleteUser(u._id)"
          >
            Elimina
          </button>
        </div>
      </div>

      <div v-if="users.length === 0" style="color: var(--grigio); font-style: italic; padding: 1rem 0">
        Nessun utente registrato
      </div>
    </div>

    <!-- CARS -->
    <div style="padding: 2rem 3rem">
      <h2 style="margin-bottom: 1rem">Macchine ({{ cars.length }})</h2>

      <div
        v-for="c in cars"
        :key="c._id"
        style="
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.7rem 0;
          border-bottom: var(--bordo);
          flex-wrap: wrap;
        "
      >
        <strong style="min-width: 140px">{{ c.driverUsername }}</strong>
        <span style="font-size: 0.72rem; color: var(--grigio)">
          {{ c.passengers.length }}/{{ c.seats }} posti — {{ c.passengers.join(', ') || 'nessun passeggero' }}
        </span>

        <div style="margin-left: auto; display: flex; align-items: center; gap: 0.5rem">
          <input
            type="number"
            autocomplete="off"
            min="1"
            max="20"
            :value="c.seats"
            @change="updateCarSeats(c._id, +($event.target as HTMLInputElement).value)"
            style="width: 60px; padding: 0.4rem; border: var(--bordo)"
          />
          <button class="btn btn-sm btn-danger" @click="deleteCar(c._id)">Elimina</button>
        </div>
      </div>

      <div v-if="cars.length === 0" style="color: var(--grigio); font-style: italic; padding: 1rem 0">
        Nessuna macchina registrata
      </div>
    </div>
  </div>
</template>
