<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { api } from '../api';

const auth = useAuthStore();

const attendees = ref<any[]>([]);
const cars = ref<any[]>([]);
const newCarSeats = ref(4);
const loading = ref(false);
const carError = ref('');

const yesAttendees = computed(() => attendees.value.filter((a) => a.attending === 'yes'));
const noAttendees = computed(() => attendees.value.filter((a) => a.attending === 'no'));

async function loadData() {
  try {
    const [att, c] = await Promise.all([api.getAttendees(), api.getCars()]);
    attendees.value = att;
    cars.value = c;
  } catch {
    // silent
  }
}

async function setAttendance(val: 'yes' | 'no') {
  loading.value = true;
  try {
    await auth.setAttendance(val);
    await loadData();
  } catch {
    // silent
  } finally {
    loading.value = false;
  }
}

async function addCar() {
  carError.value = '';
  try {
    await api.createCar(newCarSeats.value);
    await loadData();
  } catch (e: any) {
    carError.value = e.message;
  }
}

async function deleteCar(id: string) {
  try {
    await api.deleteCar(id);
    await loadData();
  } catch {
    // silent
  }
}

async function joinCar(id: string) {
  carError.value = '';
  try {
    await api.joinCar(id);
    await loadData();
  } catch (e: any) {
    carError.value = e.message;
  }
}

async function leaveCar(id: string) {
  try {
    await api.leaveCar(id);
    await loadData();
  } catch {
    // silent
  }
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function isInAnyCar(username: string): boolean {
  return cars.value.some(
    (c) => c.driverUsername === username || c.passengers.includes(username)
  );
}

function isDriver(username: string): boolean {
  return cars.value.some((c) => c.driverUsername === username);
}

function isPassengerIn(carId: string, username: string): boolean {
  const car = cars.value.find((c) => c._id === carId);
  return car ? car.passengers.includes(username) : false;
}

onMounted(async () => {
  await auth.fetchMe();
  await loadData();
});
</script>

<template>
  <div>
    <!-- ATTENDANCE SECTION -->
    <section class="attendance-section">
      <!-- SIDEBAR with attendees -->
      <div class="attendance-sidebar">
        <h2>Parteci&shy;panti</h2>

        <div style="margin-bottom: 1.5rem">
          <div
            style="
              font-size: 0.6rem;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: var(--grigio);
              margin-bottom: 0.5rem;
            "
          >
            Presenti ({{ yesAttendees.length }})
          </div>
          <ul class="attendee-list">
            <li v-for="a in yesAttendees" :key="a._id" class="attendee-item">
              <span class="attendee-badge badge-yes">sì</span>
              <span>{{ a.username }}</span>
            </li>
            <li
              v-if="yesAttendees.length === 0"
              class="attendee-item"
              style="color: var(--grigio); font-style: italic"
            >
              Nessun partecipante
            </li>
          </ul>
        </div>

        <div>
          <div
            style="
              font-size: 0.6rem;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: var(--grigio);
              margin-bottom: 0.5rem;
            "
          >
            Assenti ({{ noAttendees.length }})
          </div>
          <ul class="attendee-list">
            <li v-for="a in noAttendees" :key="a._id" class="attendee-item">
              <span class="attendee-badge badge-no">no</span>
              <span>{{ a.username }}</span>
            </li>
            <li
              v-if="noAttendees.length === 0"
              class="attendee-item"
              style="color: var(--grigio); font-style: italic"
            >
              Nessun assente
            </li>
          </ul>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="attendance-content">
        <div>
          <span class="tag" style="margin-bottom: 1rem">— La tua risposta</span>
          <h2 class="attendance-question" style="margin-top: 1rem">
            Parteciperai<br />all'evento?
          </h2>
        </div>

        <div class="attendance-buttons">
          <button
            class="btn"
            :class="{ 'active-yes': auth.user?.attending === 'yes' }"
            @click="setAttendance('yes')"
            :disabled="loading"
          >
            Sì, ci sarò
          </button>
          <button
            class="btn"
            :class="{ 'active-no': auth.user?.attending === 'no' }"
            @click="setAttendance('no')"
            :disabled="loading"
          >
            No, non ci sarò
          </button>
        </div>

        <div class="attendance-status" v-if="auth.user?.attending === 'yes'">
          Hai confermato la tua presenza. Puoi cambiare idea in qualsiasi momento.<br />
          Scorri in basso per organizzare i passaggi in macchina.
        </div>
        <div class="attendance-status" v-else-if="auth.user?.attending === 'no'">
          Hai indicato che non parteciperai. Puoi cambiare idea in qualsiasi momento.
        </div>
        <div class="attendance-status" v-else>
          Non hai ancora indicato se parteciperai. Scegli una delle opzioni qui sopra.
        </div>
      </div>
    </section>

    <!-- CARS SECTION (only if attending yes) -->
    <template v-if="auth.user?.attending === 'yes'">
      <div class="section-title">— Organizzazione Macchine</div>

      <div class="cars-header">
        <h2>Passaggi disponibili</h2>
        <div v-if="!isDriver(auth.user?.username || '')">
          <div class="add-car-form">
            <div class="field" style="margin-bottom: 0; width: 120px">
              <label>Posti</label>
              <input v-model.number="newCarSeats" type="number" min="1" max="20" />
            </div>
            <button class="btn btn-sm" @click="addCar">Offri passaggio</button>
          </div>
        </div>
      </div>

      <div v-if="carError" class="error-msg" style="margin: 0 3rem; margin-bottom: -2.5px">
        {{ carError }}
      </div>

      <div class="cars-grid" v-if="cars.length > 0">
        <div v-for="car in cars" :key="car._id" class="car-card">
          <div class="car-driver">
            <div class="car-avatar">{{ initials(car.driverUsername) }}</div>
            <div class="car-driver-info">
              <h4>{{ car.driverUsername }}</h4>
              <span>Conducente</span>
            </div>
          </div>

          <div class="car-seats">
            <span class="count">{{ car.passengers.length }}/{{ car.seats }}</span>
            posti occupati
          </div>

          <ul class="passenger-list">
            <li
              v-for="(p, i) in car.seats"
              :key="i"
              class="passenger-item"
            >
              <template v-if="car.passengers[i]">
                <span>{{ car.passengers[i] }}</span>
                <button
                  v-if="car.passengers[i] === auth.user?.username"
                  class="btn btn-sm btn-danger"
                  @click="leaveCar(car._id)"
                  style="padding: 0.2rem 0.6rem; font-size: 0.6rem"
                >
                  Esci
                </button>
              </template>
              <span v-else class="passenger-empty">— posto libero</span>
            </li>
          </ul>

          <div class="car-actions">
            <button
              v-if="
                car.driverUsername !== auth.user?.username &&
                !isPassengerIn(car._id, auth.user?.username || '') &&
                car.passengers.length < car.seats
              "
              class="btn btn-sm"
              @click="joinCar(car._id)"
            >
              Sali in macchina
            </button>
            <button
              v-if="car.driverUsername === auth.user?.username"
              class="btn btn-sm btn-danger"
              @click="deleteCar(car._id)"
            >
              Rimuovi macchina
            </button>
          </div>
        </div>
      </div>

      <div
        v-else
        style="
          padding: 3rem;
          text-align: center;
          font-size: 0.8rem;
          color: #888;
          border-bottom: var(--bordo);
        "
      >
        Nessun passaggio disponibile. Sii il primo ad offrire un passaggio!
      </div>
    </template>
  </div>
</template>
