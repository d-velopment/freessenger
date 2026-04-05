<script>
  import { goto } from "$app/navigation";
  import { wsManager } from "$lib/websocket.js";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import { onMount } from "svelte";

  let roomHash = "";
  let creatingRoom = false;
  let onlineUsers = 0;
  let activeRooms = 0;

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

  onMount(() => {
    // Listen for stats updates
    wsManager.on("stats", (data) => {
      onlineUsers = data.onlineUsers;
      activeRooms = data.activeRooms;
    });

    // Request initial stats after WebSocket is connected
    wsManager.onConnected(() => {
      wsManager.getStats();
    });
  });
</script>

<div class="container">
  <div class="header">
    <h1>
      <span class="free">FREE</span>SSENGER
      <span class="tagline"
        >- a messenger <span class="free">free</span> from registration</span
      >
    </h1>

    <ThemeToggle />
  </div>

  <div class="intro">
    <div class="info">
      <div class="no-wrap">
        <span class="free red">1 •</span> Create the room
      </div>
      <div class="no-wrap">
        <span class="free red">2 •</span> Invite your friends
      </div>
      <div class="no-wrap">
        <span class="free red">3 •</span> Start chatting
      </div>
    </div>
  </div>

  <div class="actions">
    <div class="create-section">
      <h2><span class="free">CREATE</span>ROOM</h2>
      <button on:click={createNewRoom} disabled={creatingRoom}>
        {creatingRoom ? "Creating..." : "Create New Room"}
      </button>
    </div>
  </div>

  <div class="outro">
    Key features:
    <div class="info">
      <details>
        <summary>Zero tracking policy</summary>
        <p>
          We don't track users, collect analytics, or store any personal data.
          All messages in chat rooms stays secured, completely private and out
          of server storage.
          <br />
          <i
            >* The only cookie we store is for Light/Dark theme preference. But
            it's on your browser, not on our server</i
          > 🙂
        </p>
      </details>
      <details>
        <summary>Instant chat access</summary>
        <p>
          Start chatting immediately without any registration, just share your
          room link via SMS or any messaging app. No email, password, or any
          other personal information required. Your privacy is preserved from
          the first moment.
        </p>
      </details>
      <details>
        <summary>Ephemeral conversations</summary>
        <p>
          All messages are temporary and disappear when the last user leaves the
          room. Nothing is saved on servers as well as on the users' side - your
          conversations exist only while you're chatting.
        </p>
      </details>
      <details>
        <summary>Your identity stays private</summary>
        <p>
          Your identity remains anonymous. The system generates unique animal
          names for each user, so no real names or personal identifiers are ever
          revealed to others.
        </p>
      </details>
      <details>
        <summary>60 seconds files sharing</summary>
        <p>
          Share files up to 10Mb quickly and securely. Files are automatically
          deleted after 60 seconds to maintain privacy and prevent long term
          data retention. Perfect for temporary sharing.
        </p>
      </details>
    </div>
  </div>

  <div class="status">
    <p>
      <strong>{onlineUsers}</strong> Users •
      <strong>{activeRooms}</strong> Rooms
    </p>
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

  .no-wrap {
    white-space: nowrap;
  }

  h1 {
    color: #333;
    margin-bottom: 10px;
    font-family: "Oswald", sans-serif;
    font-optical-sizing: auto;
    font-weight: 400;
    font-style: normal;
    font-size: 1.375rem;
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
    display: flex;
    flex-wrap: wrap;
    -ms-flex-wrap: wrap;
    align-items: center;
    justify-content: space-around;
    gap: 0.5em;
    width: 100%;
    padding: 15px;
    background-color: #d9e0f6;
    border-radius: 8px;
    margin-top: 10px;
  }

  .info .red {
    font-weight: bold;
    font-family: "Oswald", sans-serif;
    font-size: 0.9em;
  }

  .info p {
    margin: 0;
    font-size: 1em;
    color: #555;
  }

  .outro {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    padding: 10px 0 0;
    color: #999;
  }

  .outro .info {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  details {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
  }

  details[open] {
    background-color: #0001;
    border-radius: 0.4em;
  }

  summary {
    cursor: pointer;
    width: 100%;
    text-align: left;
    padding-left: 0.5em;
    font-weight: bold;
    position: relative;
    user-select: none;
  }

  details p {
    padding: 0.5em;
    background: #0002;
    border-radius: 0 0 0.4em 0.4em;
  }

  .outro p {
    font-size: 0.8em;
    text-align: left;
    padding-left: 1em;
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

  .create-section {
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
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
    font-size: 1.375rem;
  }

  .status {
    margin-top: 20px;
    padding: 15px;
    background-color: #f0f0f0;
    border-radius: 8px;
    font-size: 1em;
    display: none;
  }

  .status p {
    margin: 0;
    color: #555;
  }

  .status strong {
    color: #ff0000;
    font-weight: bold;
  }
</style>
