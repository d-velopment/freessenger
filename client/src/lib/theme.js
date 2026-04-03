import { writable } from 'svelte/store';

// Get theme from localStorage or default to 'light' (только в браузере)
const getStoredTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('theme') || 'light';
  }
  return 'light';
};

const storedTheme = getStoredTheme();
export const theme = writable(storedTheme);

// Subscribe to theme changes and save to localStorage (только в браузере)
theme.subscribe(value => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('theme', value);
  }
  
  // Apply theme to document (только в браузере)
  if (typeof window !== 'undefined' && window.document) {
    if (value === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }
});

// Toggle theme function
export function toggleTheme() {
  theme.update(current => current === 'light' ? 'dark' : 'light');
}
