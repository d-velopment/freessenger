import { s as store_get, u as unsubscribe_stores } from "./root.js";
import { w as writable } from "./index.js";
const storedTheme = localStorage.getItem("theme") || "light";
const theme = writable(storedTheme);
theme.subscribe((value) => {
  localStorage.setItem("theme", value);
  if (value === "dark") {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
  }
});
function ThemeToggle($$renderer) {
  var $$store_subs;
  $$renderer.push(`<button class="theme-toggle svelte-lu0t34" title="Toggle theme">`);
  if (store_get($$store_subs ??= {}, "$theme", theme) === "light") {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`);
  } else {
    $$renderer.push("<!--[-1-->");
    $$renderer.push(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`);
  }
  $$renderer.push(`<!--]--></button>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
}
export {
  ThemeToggle as T
};
