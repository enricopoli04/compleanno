const BASE = import.meta.env.VITE_API_URL || '/api';

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const csrf = getCsrfToken();
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...(opts.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Errore del server');
  }

  return data as T;
}

export const api = {
  // Auth
  signup: (username: string, password: string) =>
    request<{ user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  // Event
  getMe: () => request<any>('/event/me'),

  setAttendance: (attending: 'yes' | 'no' | null) =>
    request<any>('/event/attendance', {
      method: 'PUT',
      body: JSON.stringify({ attending }),
    }),

  setNote: (note: string) =>
    request<any>('/event/note', {
      method: 'PUT',
      body: JSON.stringify({ note }),
    }),

  getAttendees: () => request<any[]>('/event/attendees'),

  // Cars
  getCars: () => request<any[]>('/event/cars'),

  createCar: (seats: number) =>
    request<any>('/event/cars', {
      method: 'POST',
      body: JSON.stringify({ seats }),
    }),

  deleteCar: (id: string) =>
    request<any>(`/event/cars/${id}`, { method: 'DELETE' }),

  joinCar: (id: string) =>
    request<any>(`/event/cars/${id}/join`, { method: 'POST' }),

  leaveCar: (id: string) =>
    request<any>(`/event/cars/${id}/leave`, { method: 'POST' }),

  updateCar: (id: string, seats: number) =>
    request<any>(`/event/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ seats }),
    }),

  // Admin
  adminGetUsers: () => request<any[]>('/admin/users'),

  adminSetUserAttendance: (id: string, attending: 'yes' | 'no' | null) =>
    request<any>(`/admin/users/${id}/attendance`, {
      method: 'PUT',
      body: JSON.stringify({ attending }),
    }),

  adminDeleteUser: (id: string) =>
    request<any>(`/admin/users/${id}`, { method: 'DELETE' }),

  adminGetCars: () => request<any[]>('/admin/cars'),

  adminUpdateCar: (id: string, seats: number) =>
    request<any>(`/admin/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ seats }),
    }),

  adminDeleteCar: (id: string) =>
    request<any>(`/admin/cars/${id}`, { method: 'DELETE' }),
};
