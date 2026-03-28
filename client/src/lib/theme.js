import { writable } from 'svelte/store';

// Get theme from localStorage or default to 'light'
const storedTheme = localStorage.getItem('theme') || 'light';
export const theme = writable(storedTheme);

// Subscribe to theme changes and save to localStorage
theme.subscribe(value => {
  localStorage.setItem('theme', value);
  
  // Apply theme to document
  if (value === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
});

// Toggle theme function
export function toggleTheme() {
  theme.update(current => current === 'light' ? 'dark' : 'light');
}
