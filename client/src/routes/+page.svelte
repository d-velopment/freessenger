<script>
  import { goto } from "$app/navigation";
  import { wsManager } from "$lib/websocket.js";
  import ThemeToggle from "$lib/ThemeToggle.svelte";

  let roomHash = "";
  let creatingRoom = false;

  function joinRoom() {
    if (roomHash.trim()) {
      goto(`/chat/${roomHash.trim()}`);
    }
  }

  function createNewRoom() {
    creatingRoom = true;
    wsManager.on("room_created", (data) => {
      goto(`/chat/${data.roomHash}`);
    });
    wsManager.createRoom();
  }

  function handleKeyPress(event) {
    if (event.key === "Enter") {
      joinRoom();
    }
  }
</script>

<div class="container">
  <div class="header">
    <h1><span class="free">FREE</span>SSENGER
      <span class="tagline">- a messenger <span class="free">free</span> from registration</span></h1>
    
    <ThemeToggle />
  </div>

  <div class="intro">
    <div class="info">
      <p>No registration • No messages storage • Rooms are unique</p>
    </div>
  </div>

  <div class="actions">
    <div class="create-section">
      <h2><span class="free">CREATE</span>ROOM</h2>
      <button on:click={createNewRoom} disabled={creatingRoom}>
        {creatingRoom ? "Creating..." : "Create New Room"}
      </button>
    </div>

    <div class="or">OR</div>

    <div class="join-section">
      <h2><span class="free">JOIN</span>ROOM</h2>
      <input
        type="text"
        bind:value={roomHash}
        placeholder="Enter room hash (64 characters)"
        on:keypress={handleKeyPress}
        maxlength="64"
      />
      <button on:click={joinRoom} disabled={!roomHash.trim()}>
        Join Room
      </button>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 600px;
    margin: 20px auto;
    padding: 20px;
    text-align: center;
    font-family: Arial, sans-serif;
    border-radius: 20px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    color: #333;
    margin-bottom: 10px;
    font-family: "Oswald", sans-serif;
    font-optical-sizing: auto;
    font-weight: 400;
    font-style: normal;
    font-size: 22px;
    font-weight: bold;
    text-align: left;
  }

  .free {
    color: #ff0000;
  }

  .tagline {
    color: #666;
    font-family: "Kaushan Script", cursive;
  }

  .intro {
    display: flex;
    flex-direction: column;
    
    padding: 10px 0 20px;
    border-top: 1px solid #ddd;
  }

  .info {
    padding: 15px;
    background-color: #d9e0f6;
    border-radius: 8px;
    margin-top: 10px;
  }

  .info p {
    margin: 0;
    font-size: 14px;
    color: #555;
  }

  p {
    color: #666;
    margin-bottom: 40px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .join-section,
  .create-section {
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  .or {
    font-weight: bold;
    color: #888;
  }

  input {
    width: 100%;
    padding: 12px;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: monospace;
  }

  button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }

  button:hover:not(:disabled) {
    background-color: #0056b3;
  }

  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  h2 {
    margin-top: 0;
    color: #333;
    font-family: "Oswald", sans-serif;
    font-weight: bold;
    font-size: 22px;
  }

  /* Dark theme styles */
  :global(body.dark) .container {
    background-color: #2d2d2d;
    border: 1px solid #404040;
  }

  :global(body.dark) h1 {
    color: #f0f0f0;
  }

  :global(body.dark) p {
    color: #b0b0b0;
  }

  :global(body.dark) h2 {
    color: #e0e0e0;
    border-bottom: 1px solid #404040;
  }

  :global(body.dark) input {
    background-color: #3d3d3d;
    border: 1px solid #555;
    color: #e0e0e0;
  }

  :global(body.dark) input:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  :global(body.dark) button {
    background-color: #007bff;
    color: white;
  }

  :global(body.dark) button:hover {
    background-color: #0056b3;
  }

  :global(body.dark) button:disabled {
    background-color: #555;
    color: #999;
  }

  :global(body.dark) .info {
    background-color: #00596c;
  }

  :global(body.dark) .info p {
    color: #b0b0b0;
  }
</style>
