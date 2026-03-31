<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { wsManager } from "$lib/websocket.js";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import { fly } from "svelte/transition";

  let messages = [];
  let newMessage = "";
  let participantCount = 0;
  let messagesEndElement; // Reference to scroll anchor
  let copySuccess = false;
  let myClientId = null;
  let typingUsers = new Set(); // Store typing user IDs
  let typingTimeout = null;
  let typingIndicatorSent = false; // Track if we've sent startTyping
  let isRateLimited = false;
  let isEditing = false;
  let warningMessage = "⚠️ Slow down! Too many actions.";

  const roomHash = $page.params.roomHash;

  const namesStructure = {
    namesAnimals: [
      "Aardvark",
      "Albatross",
      "Alligator",
      "Alpaca",
      "Ant",
      "Anteater",
      "Antelope",
      "Ape",
      "Armadillo",
      "Donkey",
      "Baboon",
      "Badger",
      "Barracuda",
      "Bat",
      "Bear",
      "Beaver",
      "Bee",
      "Bison",
      "Boar",
      "Buffalo",
      "Butterfly",
      "Camel",
      "Capybara",
      "Caribou",
      "Cassowary",
      "Cat",
      "Caterpillar",
      "Cattle",
      "Chamois",
      "Cheetah",
      "Chicken",
      "Chimpanzee",
      "Chinchilla",
      "Chough",
      "Clam",
      "Cobra",
      "Cockroach",
      "Cod",
      "Cormorant",
      "Coyote",
      "Crab",
      "Crane",
      "Crocodile",
      "Crow",
      "Curlew",
      "Deer",
      "Dinosaur",
      "Dog",
      "Dogfish",
      "Dolphin",
      "Dotterel",
      "Dove",
      "Dragonfly",
      "Duck",
      "Dugong",
      "Dunlin",
      "Eagle",
      "Echidna",
      "Eel",
      "Eland",
      "Elephant",
      "Elk",
      "Emu",
      "Falcon",
      "Ferret",
      "Finch",
      "Fish",
      "Flamingo",
      "Fly",
      "Fox",
      "Frog",
      "Gaur",
      "Gazelle",
      "Gerbil",
      "Giraffe",
      "Gnat",
      "Cow",
      "Goat",
      "Goldfinch",
      "Goldfish",
      "Goose",
      "Gorilla",
      "Goshawk",
      "Grouse",
      "Guanaco",
      "Gull",
      "Hamster",
      "Hare",
      "Hawk",
      "Hedgehog",
      "Heron",
      "Herring",
      "Hippo",
      "Hornet",
      "Horse",
      "Hyena",
      "Ibex",
      "Ibis",
      "Jackal",
      "Jaguar",
      "Jay",
      "Jellyfish",
      "Kangaroo",
      "Kingfisher",
      "Koala",
      "Kookabura",
      "Kouprey",
      "Kudu",
      "Lapwing",
      "Lark",
      "Lemur",
      "Leopard",
      "Lion",
      "Llama",
      "Lobster",
      "Locust",
      "Loris",
      "Louse",
      "Lyrebird",
      "Magpie",
      "Mallard",
      "Manatee",
      "Mandrill",
      "Mantis",
      "Marten",
      "Meerkat",
      "Mink",
      "Mole",
      "Mongoose",
      "Monkey",
      "Moose",
      "Mosquito",
      "Mouse",
      "Mule",
      "Narwhal",
      "Newt",
      "Octopus",
      "Okapi",
      "Opossum",
      "Oryx",
      "Ostrich",
      "Otter",
      "Owl",
      "Oyster",
      "Panther",
      "Parrot",
      "Partridge",
      "Peafowl",
      "Pelican",
      "Penguin",
      "Pheasant",
      "Pig",
      "Pigeon",
      "Pony",
      "Porcupine",
      "Porpoise",
      "Quail",
      "Quelea",
      "Quetzal",
      "Rabbit",
      "Raccoon",
      "Rail",
      "Ram",
      "Rat",
      "Raven",
      "Red Deer",
      "Red Panda",
      "Reindeer",
      "Rhinoceros",
      "Rook",
      "Salamander",
      "Salmon",
      "Sandpiper",
      "Sardine",
      "Scorpion",
      "Seahorse",
      "Seal",
      "Shark",
      "Sheep",
      "Shrew",
      "Skunk",
      "Snail",
      "Snake",
      "Sparrow",
      "Spider",
      "Spoonbill",
      "Squid",
      "Squirrel",
      "Starling",
      "Stingray",
      "Stinkbug",
      "Stork",
      "Swallow",
      "Swan",
      "Tapir",
      "Tarsier",
      "Termite",
      "Tiger",
      "Toad",
      "Trout",
      "Turkey",
      "Turtle",
      "Viper",
      "Vulture",
      "Wallaby",
      "Walrus",
      "Wasp",
      "Weasel",
      "Whale",
      "Wildcat",
      "Wolf",
      "Wolverine",
      "Wombat",
      "Woodcock",
      "Woodpecker",
      "Worm",
      "Wren",
      "Yak",
      "Zebra",
    ],
    namesMoods: [
      "Angry",
      "Anguished",
      "Astonished",
      "Blush",
      "Sweat",
      "Cold",
      "Hot",
      "Confused",
      "Crying",
      "Dizzy",
      "Snoring",
      "Fearful",
      "Flushed",
      "Frowning",
      "Crazy",
      "Ghost",
      "Grimacing",
      "Grin",
      "Grinning",
      "Hushed",
      "Innocent",
      "Joy",
      "Kissing",
      "Happy",
      "Funny",
      "Holy",
      "Laughing",
      "Sad",
      "Nice",
      "Lying",
      "Honest",
      "Nerd",
      "Pensive",
      "Rage",
      "Relaxed",
      "Screaming",
      "Sleepy",
      "Smiling",
      "Thinking",
      "Unamused",
      "Worried",
      "Stunning",
    ],
  };

  export const getNameMood = (clientId) => {
    if (!clientId) return "Unknown";

    // Use clientId to generate consistent random names
    const hash1 = parseInt(clientId.substring(0, 4), 36);
    const hash2 = parseInt(clientId.substring(4, 8), 36);

    const moodIndex = hash1 % namesStructure.namesMoods.length;
    const animalIndex = hash2 % namesStructure.namesAnimals.length;

    return `${namesStructure.namesMoods[moodIndex]} ${namesStructure.namesAnimals[animalIndex]}`;
  };

  onMount(() => {
    // Get our client ID from WebSocket manager
    myClientId = wsManager.clientId;

    // Join the room
    wsManager.joinRoom(roomHash);

    // Set up WebSocket event handlers
    wsManager.on("message", (data) => {
      // Ignore messages from ourselves (we already added them locally)
      if (data.clientId === myClientId) {
        return;
      }

      // Mark as other person's message
      data.isOwn = false;
      messages = [...messages, data];
      scrollToBottom();
    });

    wsManager.on("participant_count", (data) => {
      participantCount = data.count;
    });

    wsManager.on("user_typing", (data) => {
      if (data.typing) {
        typingUsers = new Set([...typingUsers, data.clientId]);
      } else {
        typingUsers = new Set(
          [...typingUsers].filter((id) => id !== data.clientId),
        );
      }
    });

    wsManager.on("rate_limit_exceeded", () => {
      isRateLimited = true;
      warningMessage = "⚠️ Slow down! Too many actions.";
      setTimeout(() => {
        isRateLimited = false;
        warningMessage = "";
      }, 3000);
    });

    // Handle keyboard close on mobile - scroll to bottom
    window.addEventListener("resize", scrollToBottom);

    return () => {
      window.removeEventListener("resize", scrollToBottom);
    };
  });

  function handleInput() {
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Start typing indicator if message is not empty
    if (newMessage.trim()) {
      // Only send startTyping once per typing session
      if (!typingIndicatorSent) {
        wsManager.startTyping();
        typingIndicatorSent = true;
      }

      // Set timeout to stop typing after 3 seconds of inactivity
      typingTimeout = setTimeout(() => {
        wsManager.stopTyping();
        typingIndicatorSent = false;
      }, 3000);
    } else {
      // Message is empty - stop typing immediately
      wsManager.stopTyping();
      typingIndicatorSent = false;
    }
  }

  function sendMessage() {
    if (newMessage.trim()) {
      // Stop typing when sending message
      wsManager.stopTyping();
      typingIndicatorSent = false;
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }

      // Add message locally immediately for better UX
      const messageData = {
        message: newMessage.trim(),
        timestamp: Date.now(),
        clientId: myClientId,
        isOwn: true,
      };

      messages = [...messages, messageData];
      scrollToBottom();

      wsManager.sendMessage(newMessage.trim());
      newMessage = "";
    }
  }

  function handleKeyPress(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
      scrollToBottom();
    }
  }

  function onInputFocus() {
    scrollToBottom();
  }

  function onInputBlur() {
    scrollToBottom();
  }

  function scrollToBottom() {
    if (messagesEndElement) {
      setTimeout(() => {
        messagesEndElement.scrollIntoView({ block: 'end',  behavior: 'smooth' });
      }, 100);
    }
  }

  function shareViaSMS() {
    const currentUrl = window.location.href;
    const message = `Go Freessenger @ ${currentUrl}`;

    // Check if Web Share API is available
    if (navigator.share) {
      navigator
        .share({
          title: "Freessenger Chat Room",
          text: message,
          url: currentUrl,
        })
        .catch((err) => {
          console.log("Share cancelled or failed:", err);
          // Fallback to SMS
          openSMSLink(message);
        });
    } else {
      // Fallback for browsers that don't support Web Share API
      openSMSLink(message);
    }
  }

  function openSMSLink(message) {
    // Create SMS link with URL encoding
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, "_blank");
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function goHome() {
    goto("/");
  }
</script>

<div class="chat-container">
  <div
    class="chat-header"
    style:--header-top={isEditing
      ? `${window.scrollY || window.pageYOffset || document.documentElement.scrollTop}px`
      : "0"}
  >
    <div class="row">
      <button class="app-title" on:click={goHome} aria-label="Go to home page">
        <span class="free">FREE</span>SSENGER
      </button>
      <div class="header-info">
        <span class="participant-count">{participantCount} online</span>

        <button class="share-btn" on:click={shareViaSMS}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="10" x2="19" y2="16"></line>
            <line x1="16" y1="13" x2="22" y2="13"></line>
          </svg>
          Invite
        </button>
        <ThemeToggle />
      </div>
    </div>
    <div class="row">
      <h2>Room: {roomHash}</h2>
    </div>
  </div>

  <div class="messages-container">
    {#each messages as message (message.timestamp)}
      <div
        class="message"
        class:own-message={message.isOwn}
        class:other-message={!message.isOwn}
        transition:fly={{ y: message.isOwn ? 20 : -20, duration: 300 }}
      >
        <div class="message-author">{getNameMood(message.clientId)}</div>
        <div class="message-body">
          <span class="message-content">{message.message}</span>
          <span class="message-time">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    {/each}

    <!-- Typing indicator -->
    {#each Array.from(typingUsers) as clientId (clientId)}
      <div class="typing-indicator" transition:fly={{ y: -10, duration: 200 }}>
        <span class="typing-author">{getNameMood(clientId)} typing...</span>
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    {/each}

    <!-- Scroll anchor to ensure keyboard doesn't break scroll position -->
    <div bind:this={messagesEndElement}></div>
  </div>

  {#if isRateLimited}
    <div class="rate-limit-warning" transition:fly={{ y: 20, duration: 300 }}>
      {warningMessage}
    </div>
  {/if}

  <div class="message-input">
    <div class="message-input-row">
      <textarea
        bind:value={newMessage}
        placeholder="Type your message (max 2000 characters)..."
        on:focus={onInputFocus}
        on:blur={onInputBlur}
        on:keypress={handleKeyPress}
        on:input={handleInput}
        maxlength="2000"
        rows="1"
        disabled={isRateLimited}
      ></textarea>
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button
        class="send-btn"
        on:click={sendMessage}
        disabled={!newMessage.trim() || isRateLimited}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="transform: rotate(45deg) translate(-2px, 2px);"
        >
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9"></polygon>
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  * {
    box-sizing: border-box;
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 800px;
    margin: 0 auto;
    font-family: Arial, sans-serif;
    overflow-x: hidden;
    border-radius: 22px;
  }

  .chat-header {
    position: sticky;
    top: var(--header-top, 0);
    padding: 10px 10px 0 20px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .chat-header .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 10px;
  }

  .app-title {
    font-family: "Oswald", sans-serif;
    font-optical-sizing: auto;
    font-weight: 400;
    font-style: normal;
    font-size: 1.375rem;
    font-weight: bold;
    color: #333;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  .app-title:hover {
    opacity: 0.8;
  }

  .free {
    color: #ff0000;
    font-weight: bold;
  }

  .chat-header h2 {
    margin: 0;
    color: #ddd;
    font-size: 0.5em;
    line-height: 10px;
    font-weight: 100;
    word-break: break-all;
    flex-shrink: 0;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .participant-count {
    font-size: 1em;
  }

  .share-btn {
    background-color: #17a2b8;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .share-btn svg {
    width: 14px;
    height: 14px;
  }

  .share-btn:hover {
    background-color: #138496;
  }

  .share-btn:active {
    background-color: #117a8b;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background-color: #f8f9fa;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message {
    padding: 8px 15px;
    border-radius: 18px;
    max-width: 70%;
    word-wrap: break-word;
    display: flex;
    flex-direction: column;
  }

  .message-author {
    font-size: 0.8125rem;
    font-weight: 300;
    margin-bottom: 2px;
    opacity: 0.7;
  }

  .message-body {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    flex-wrap: wrap;
  }

  .message-content {
    font-size: 1em;
    font-weight: 400;
    white-space: pre-wrap;
    line-height: 1.4;
    flex: 1;
  }

  .message-time {
    font-size: 0.8125rem;
    font-weight: 300;
    opacity: 0.7;
    white-space: nowrap;
  }

  .own-message {
    align-self: flex-end;
    background-color: #007bff;
    color: white;
  }

  .other-message {
    align-self: flex-start;
    background-color: #f1f3f4;
    color: #333;
  }

  .own-message .message-author {
    color: rgba(255, 255, 255, 0.8);
  }

  .other-message .message-author {
    color: #666;
  }

  .own-message .message-time {
    color: rgba(255, 255, 255, 0.8);
  }

  .other-message .message-time {
    color: #666;
  }

  .typing-indicator {
    align-self: flex-start;
    background-color: #f1f3f4;
    color: #666;
    padding: 8px 15px;
    border-radius: 18px;
    max-width: 70%;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .typing-author {
    font-size: 0.8125rem;
    font-weight: 300;
    opacity: 0.7;
  }

  .typing-dots {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .typing-dots span {
    width: 4px;
    height: 4px;
    background-color: #666;
    border-radius: 50%;
    opacity: 0.7;
    animation: typing 1.4s infinite ease-in-out;
  }

  .typing-dots span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .typing-dots span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes typing {
    0%,
    60%,
    100% {
      transform: translateY(0);
      opacity: 0.7;
    }
    30% {
      transform: translateY(-5px);
      opacity: 1;
    }
  }

  .message-input {
    padding: 7px;
    background-color: #f8f9fa;
    border-top: 1px solid #dee2e6;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  .message-input-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .rate-limit-warning {
    background-color: #ffe6e6;
    border: 1px solid #ffcccc;
    color: #cc0000;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 1em;
    text-align: center;
  }

  .message-input textarea {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 12px;
    font-size: 1em;
    font-family: inherit;
    resize: none;
    min-height: 40px;
    max-height: 120px;
    overflow-y: auto;
  }

  .message-input textarea:disabled {
    background-color: #f0f0f0;
    color: #999;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .send-btn {
    background-color: #007bff;
    border: none;
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    color: white;
    margin-left: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    aspect-ratio: 1 / 1;
  }

  .send-btn:hover:not(:disabled) {
    background-color: #0056b3;
  }

  .send-btn:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .chat-header {
      flex-direction: column;
      text-align: center;
    }

    .chat-header h2 {
      max-width: 100%;
    }

    .message {
      max-width: 85%;
    }

    textarea {
      width: 100%;
    }

    .send-btn {
      padding: 6px;
    }

    .send-btn svg {
      width: 16px;
      height: 16px;
    }
  }
</style>
