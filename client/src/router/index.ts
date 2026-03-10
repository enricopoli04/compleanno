import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import LoginPage from '../pages/LoginPage.vue';
import SignupPage from '../pages/SignupPage.vue';
import EventPage from '../pages/EventPage.vue';
import AttendancePage from '../pages/AttendancePage.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
  { path: '/signup', name: 'signup', component: SignupPage, meta: { guest: true } },
  { path: '/evento', name: 'evento', component: EventPage, meta: { auth: true } },
  { path: '/partecipazione', name: 'partecipazione', component: AttendancePage, meta: { auth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  if (to.meta.auth && !auth.isLoggedIn) {
    next('/login');
  } else if (to.meta.guest && auth.isLoggedIn) {
    next('/evento');
  } else {
    next();
  }
});

export default router;
