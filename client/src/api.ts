const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
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
    request<{ token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Event
  getMe: () => request<any>('/event/me'),

  setAttendance: (attending: 'yes' | 'no' | null) =>
    request<any>('/event/attendance', {
      method: 'PUT',
      body: JSON.stringify({ attending }),
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
};
