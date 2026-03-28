import { b as attr, e as escape_html } from "../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import "../../chunks/websocket.js";
import { T as ThemeToggle } from "../../chunks/ThemeToggle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let roomHash = "";
    let creatingRoom = false;
    $$renderer2.push(`<div class="container svelte-1uha8ag"><div class="header svelte-1uha8ag"><h1 class="svelte-1uha8ag">Freessenger</h1> `);
    ThemeToggle($$renderer2);
    $$renderer2.push(`<!----></div> <p class="svelte-1uha8ag">Simple WebSocket messenger</p> <div class="actions svelte-1uha8ag"><div class="join-section svelte-1uha8ag"><h2 class="svelte-1uha8ag">Join Chat</h2> <input type="text"${attr("value", roomHash)} placeholder="Enter room hash (64 characters)" maxlength="64" class="svelte-1uha8ag"/> <button${attr("disabled", !roomHash.trim(), true)} class="svelte-1uha8ag">Join Room</button></div> <div class="or svelte-1uha8ag">OR</div> <div class="create-section svelte-1uha8ag"><h2 class="svelte-1uha8ag">Create New Chat</h2> <button${attr("disabled", creatingRoom, true)} class="svelte-1uha8ag">${escape_html("Create New Room")}</button></div></div></div>`);
  });
}
export {
  _page as default
};
