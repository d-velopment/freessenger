<script>
  import { onMount } from 'svelte';
  import { wsManager } from '$lib/websocket.js';
  import { page } from '$app/stores';

  onMount(() => {
    wsManager.connect();
  });

  // Handle room hash from URL
  $: if ($page.params.roomHash) {
    wsManager.joinRoom($page.params.roomHash);
  }
</script>

<svelte:head>
  <title>FREESSENGER.COM</title>
</svelte:head>

<slot />

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow-x: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #ffffff;
    color: #333333;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  :global(body.dark) {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
