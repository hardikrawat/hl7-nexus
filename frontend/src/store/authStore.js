import { create } from 'zustand';

const TOKEN_KEY = 'nexus_token';
const USER_KEY = 'nexus_username';

function readStorage(key) {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

export const useAuthStore = create((set) => ({
  token: readStorage(TOKEN_KEY),
  username: readStorage(USER_KEY),

  setAuth: (token, username) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, username);
    set({ token, username });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, username: null });
  },
}));
