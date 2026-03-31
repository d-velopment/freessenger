<script>
  import '../styles.css';
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
