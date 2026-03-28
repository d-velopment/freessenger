import { s as store_get, a as slot, u as unsubscribe_stores } from "../../chunks/root.js";
import { w as wsManager } from "../../chunks/websocket.js";
import { p as page } from "../../chunks/stores.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    if (store_get($$store_subs ??= {}, "$page", page).params.roomHash) {
      wsManager.joinRoom(store_get($$store_subs ??= {}, "$page", page).params.roomHash);
    }
    $$renderer2.push(`<!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
