<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { wsManager } from "$lib/websocket.js";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import { fileUploadManager } from "$lib/fileUpload.js";
  import { fly } from "svelte/transition";

  let messages = [];
  let newMessage = "";
  let participantCount = 0;
  let textareaElement; // Reference to textarea element
  let myClientId = null;
  let typingUsers = new Set(); // Store typing user IDs
  let typingTimeout = null;
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

    // Use full clientId to generate consistent random names
    const hash1 = Math.abs(parseInt(clientId.substring(0, 8), 36));
    const hash2 = Math.abs(parseInt(clientId.substring(8, 16), 36));

    const moodIndex = hash1 % namesStructure.namesMoods.length;
    const animalIndex = hash2 % namesStructure.namesAnimals.length;

    return `${namesStructure.namesMoods[moodIndex]} ${namesStructure.namesAnimals[animalIndex]}`;
  };

  export const getInitials = (clientId) => {
    if (!clientId) return "?";

    const fullName = getNameMood(clientId);
    const words = fullName.split(" ");

    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return "??";
  };

  function getColorFromClientId(clientId) {
    if (!clientId) return "#f1f3f4";

    // Generate hue from clientId (0-360, but skip blue range 200-240)
    const hash = Math.abs(parseInt(clientId.substring(0, 8), 36));
    let hue = hash % 360;

    // Avoid blue hues (roughly 200-240 degrees)
    if (hue >= 200 && hue <= 240) {
      hue = (hue + 120) % 360;
    }

    // Pastel colors: low saturation (25-35%), high value (88-93%)
    const saturation = 25 + (hash % 11); // 25-35%
    const value = 38 + ((hash >> 8) % 6); // 88-93%

    // Convert HSV to RGB
    const s = saturation / 100;
    const v = value / 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = v - c;

    let r, g, b;
    if (hue < 60) {
      [r, g, b] = [c, x, 0];
    } else if (hue < 120) {
      [r, g, b] = [x, c, 0];
    } else if (hue < 180) {
      [r, g, b] = [0, c, x];
    } else if (hue < 240) {
      [r, g, b] = [0, x, c];
    } else if (hue < 300) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }

    const toHex = (val) => {
      const hex = Math.round((val + m) * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  onMount(() => {
    // Get our client ID from WebSocket manager
    myClientId = wsManager.clientId;

    // Listen for server clientId updates
    wsManager.on("client_id", (data) => {
      myClientId = data.clientId;
    });

    // Join the room
    wsManager.joinRoom(roomHash);

    // Set up WebSocket event handlers
    wsManager.on("message", (data) => {
      console.log("[WebSocket] Received message:", data);

      // Ignore messages from ourselves (we already added them locally)
      if (data.clientId === wsManager.clientId) {
        console.log("[WebSocket] Ignoring own message");
        return;
      }

      // Handle system messages (connect/disconnect)
      if (data.isSystem) {
        // Format system message as "{name} connected/disconnected"
        data.message = `${getNameMood(data.clientId)} ${data.message}`;
        data.isOwn = false;
        messages = [...messages, data];
        return;
      }

      // Проверяем, является ли сообщение JSON с файловыми данными
      let messageData;
      try {
        // Пытаемся распарсить сообщение как JSON
        const parsedData = JSON.parse(data.message);
        console.log("[WebSocket] Parsed JSON message:", parsedData);

        // Если это файловое сообщение
        if (parsedData.type === "file" && parsedData.fileUrl) {
          messageData = {
            type: "file",
            fileUrl: parsedData.fileUrl,
            fileName: parsedData.fileName,
            fileSize: parsedData.fileSize,
            fileType: parsedData.fileType,
            timestamp: parsedData.timestamp || data.timestamp,
            clientId: data.clientId,
            isOwn: false,
            fileDisabled: false,
          };
          console.log("[WebSocket] File message from other user:", messageData);

          // Устанавливаем таймер для отключения скачивания через 60 секунд (для видео и других файлов)
          if (!parsedData.fileType.startsWith("image/")) {
            setTimeout(() => {
              messageData.fileDisabled = true;
              messages = [...messages]; // Обновляем массив для реактивности
            }, 60000);
          }
        } else {
          // Если JSON но не файл, используем как обычное сообщение
          messageData = {
            ...data,
            isOwn: false,
          };
        }
      } catch (e) {
        // Если не JSON, используем как обычное текстовое сообщение
        messageData = {
          ...data,
          isOwn: false,
        };
      }

      console.log("[WebSocket] Adding message to chat:", messageData);
      messages = [...messages, messageData];
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

    // Handle keyboard close on mobile
    window.addEventListener("resize", () => {});

    return () => {
      window.removeEventListener("resize", () => {});
    };
  });

  // Проверка на смайлики
  function isEmojiOnly(text) {
    // Проверяем что текст существует и является строкой
    if (!text || typeof text !== "string") {
      return false;
    }

    // Проверяем на Unicode эмодзи (простые диапазоны)
    const hasUnicodeEmoji =
      /[😀-🿿]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);

    return hasUnicodeEmoji;
  }

  // Функция для скролла к textarea
  function scrollToTextarea() {
    if (textareaElement) {
      textareaElement.focus();
      textareaElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Обработчик клавиатурных событий
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();

      // Скролл к textarea
      setTimeout(() => {
        scrollToTextarea();
      }, 0);
    }
  }

  // Прямая загрузка файла
  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log(
      "[Client Debug] File selected:",
      file.name,
      "Size:",
      file.size,
      "MB:",
      file.size / 1024 / 1024,
    );

    // Получаем кнопку и сохраняем оригинальное состояние заранее
    const uploadBtn = document.querySelector(".file-upload-btn");
    const originalContent = uploadBtn ? uploadBtn.innerHTML : "📎";

    try {
      // Проверяем размер файла
      if (file.size > 10 * 1024 * 1024) {
        console.log(
          "[Client Debug] File too large:",
          file.size / 1024 / 1024,
          "MB",
        );
        alert("File too large. Maximum size is 10MB.");
        return;
      }

      console.log("[Client Debug] Starting upload...");

      // Показываем индикатор загрузки
      if (uploadBtn) {
        uploadBtn.innerHTML = "0%";
        uploadBtn.disabled = true;
      }

      // Загружаем файл с прогрессом
      const result = await fileUploadManager.uploadFile(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
        if (uploadBtn) {
          uploadBtn.innerHTML = `${progress}%`;
        }
      });

      // Восстанавливаем SVG иконку после загрузки
      if (uploadBtn) {
        uploadBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        `;
        uploadBtn.disabled = false;
      }

      if (result.success) {
        // Отправляем сообщение с файлом в чат
        const messageData = {
          type: "file",
          fileUrl: result.file.url,
          fileName: result.file.originalName,
          fileSize: result.file.size,
          fileType: result.file.mimetype,
          timestamp: result.file.uploadTime,
          clientId: wsManager.clientId,
          isOwn: true,
          fileDisabled: false,
        };

        messages = [...messages, messageData];

        // Устанавливаем таймер для отключения скачивания через 60 секунд (для видео и других файлов)
        if (!result.file.mimetype.startsWith("image/")) {
          setTimeout(() => {
            messageData.fileDisabled = true;
            messages = [...messages]; // Обновляем массив для реактивности
          }, 60000);
        }

        // Отправляем через WebSocket как JSON внутри текстового сообщения
        const fileMessage = {
          type: "file",
          fileUrl: result.file.url,
          fileName: result.file.originalName,
          fileSize: result.file.size,
          fileType: result.file.mimetype,
        };

        console.log("[Client] Sending file message:", fileMessage);
        wsManager.sendMessage(JSON.stringify(fileMessage));

        console.log("File uploaded successfully:", result.file);
      }
    } catch (error) {
      console.error("File upload error:", error);
      alert("Upload failed: " + error.message);
    } finally {
      // Восстанавливаем кнопку
      if (uploadBtn) {
        uploadBtn.innerHTML = originalContent;
        uploadBtn.disabled = false;
      }

      // Очищаем input
      event.target.value = "";
    }
  }

  async function sendMessage() {
    if (newMessage.trim()) {
      // Stop typing when sending message
      wsManager.stopTyping();
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }

      // Add message locally immediately for better UX
      const messageData = {
        message: newMessage.trim(),
        timestamp: Date.now(),
        clientId: wsManager.clientId,
        isOwn: true,
      };

      messages = [...messages, messageData];

      wsManager.sendMessage(newMessage.trim());
      newMessage = "";
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

  // Функции для работы с файлами
  function openImageFullscreen(imageUrl) {
    // Извлекаем имя файла из URL для заголовка
    const fileName = imageUrl.split("/").pop() || "Image";
    // Создаем модальное окно для изображения
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      cursor: pointer;
    `;

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = fileName;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border-radius: 1em;
      box-shadow: 0 1em 2em 1em rgba(0,0,0,0.5);
    `;

    modal.appendChild(img);
    document.body.appendChild(modal);

    // Закрытие по клику
    modal.onclick = () => {
      document.body.removeChild(modal);
    };

    // Закрытие по ESC
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        document.removeEventListener("keydown", handleEsc);
      }
    };
    document.addEventListener("keydown", handleEsc);
  }

  function downloadFile(fileUrl, fileName) {
    // Создаем временную ссылку для скачивания
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getFileIcon(mimeType) {
    if (mimeType.startsWith("video/")) {
      return "🎥";
    } else if (mimeType.includes("pdf")) {
      return "📄";
    } else if (mimeType.includes("zip") || mimeType.includes("rar")) {
      return "📦";
    } else if (mimeType.includes("audio/")) {
      return "🎵";
    } else {
      return "📎"; // По умолчанию
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
        •
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

    {#if messages}
      {@const reverseMessages = [...messages].reverse()}
      {#each reverseMessages as message (message.timestamp)}
        <div
          class="message"
          class:own-message={message.isOwn}
          class:other-message={!message.isOwn}
          class:system-message={message.isSystem}
          style:background-color={!message.isOwn
            ? getColorFromClientId(message.clientId)
            : undefined}
          transition:fly={{
            y: message.isOwn ? 20 : -20,
            duration: 300,
            delay: 125,
          }}
        >
          {#if !message.isSystem}
            <div class="message-author">
              <div class="author-initials">
                {getInitials(message.clientId)}
              </div>
              <span class="author-full-name"
                >{getNameMood(message.clientId)}</span
              >
            </div>
          {/if}
          <div class="message-body">
            {#if message.type === "file"}
              <div class="file-message">
                <div class="file-container">
                  {#if message.fileType.startsWith("image/")}
                    <img
                      src={message.fileUrl}
                      alt="Image"
                      class="file-preview"
                      on:click={() => openImageFullscreen(message.fileUrl)}
                      title={message.fileName}
                    />
                  {:else if message.fileType.startsWith("video/")}
                    <div class="video-container">
                      <video
                        src={message.fileUrl}
                        class="file-preview"
                        class:file-disabled={message.fileDisabled}
                        preload="metadata"
                        controls={!message.fileDisabled}
                        title={message.fileDisabled
                          ? "File has been deleted"
                          : message.fileName}
                      ></video>

                      <div
                        class="file-deletion-overlay"
                        class:overlay-disabled={message.fileDisabled}
                      >
                        <img
                          src="/assets/broken.png"
                          alt="File has been deleted"
                          class="broken-glass"
                        />
                      </div>
                    </div>
                  {:else}
                    <!-- Другие файлы - иконка с деталями -->
                    <div
                      class="file-download"
                      class:file-disabled={message.fileDisabled}
                      on:click={() =>
                        !message.fileDisabled &&
                        downloadFile(message.fileUrl, message.fileName)}
                      title={message.fileDisabled
                        ? "File has been deleted"
                        : message.fileName}
                    >
                      <div class="file-icon">
                        {getFileIcon(message.fileType)}
                      </div>
                      <div class="file-info">
                        <span class="file-name"
                          >{message.fileName ||
                            message.fileUrl.split("/").pop()}</span
                        >
                        <span class="file-size"
                          >{formatFileSize(message.fileSize)}</span
                        >
                      </div>
                    </div>

                    <!-- Индикатор удаления файла -->
                    <div
                      class="file-deletion-overlay"
                      class:overlay-disabled={message.fileDisabled}
                    >
                      <img
                        src="/assets/broken.png"
                        alt="File has been deleted"
                        class="broken-glass"
                      />
                    </div>
                  {/if}
                </div>
              </div>
            {:else}
              <!-- Обычное текстовое сообщение -->
              <span
                class="message-content"
                class:emoji-only={isEmojiOnly(message.message)}
                >{message.message}</span
              >
            {/if}
            {#if message.type !== "file"}
              <span class="message-time">{formatTime(message.timestamp)}</span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}

    {#if myClientId}
      <div class="client-name">
        <span class="client-name-label">Your name:&nbsp;</span>{getNameMood(
          myClientId,
        )}
      </div>
    {/if}
  </div>

  {#if isRateLimited}
    <div class="rate-limit-warning" transition:fly={{ y: 20, duration: 300 }}>
      {warningMessage}
    </div>
  {/if}

  <div class="message-input">
    <div class="message-input-row">
      <input
        type="file"
        id="file-upload"
        accept="*"
        style="display: none;"
        on:change={handleFileSelect}
        disabled={isRateLimited}
      />
      <button
        class="send-button file-upload-btn"
        on:click={() => document.getElementById("file-upload").click()}
        title="Upload file"
        disabled={isRateLimited}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
      <textarea
        bind:value={newMessage}
        bind:this={textareaElement}
        on:keydown={handleKeyDown}
        placeholder="Type a message..."
        class="message-textarea"
        rows="1"
        disabled={isRateLimited}
      ></textarea>
      <button
        class="send-button"
        on:click={sendMessage}
        disabled={!newMessage.trim() || isRateLimited}
        title="Send message"
      >
        {isRateLimited ? "⏳" : "➤"}
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
    gap: 0.5em;
  }

  .client-name {
    text-align: center;
    font-size: 0.825em;
    font-weight: 900;
    color: #57f;
    letter-spacing: -0.04em;
    opacity: 0.5;
    z-index: 1;
  }

  .client-name-label {
    font-weight: 100;
    color: #666;
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
    position: relative;
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background-color: #f8f9fa;
    display: flex;
    flex-direction: column-reverse;
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
    opacity: 0.3;
    display: flex;
    align-items: center;
    gap: 0.45em;
  }

  .author-initials {
    width: 20px;
    height: 20px;
    padding-top: 0.1em;
    margin-left: -0.9em;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.5rem;
    font-weight: 600;
    color: white;
    flex-shrink: 0;
    background-color: #0005;
  }

  .author-full-name {
    flex: 1;
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

  .message-content.emoji-only {
    font-size: 4em !important;
    line-height: 1.2;
  }

  /* Стили для файлов в сообщениях */
  .file-message {
    padding-top: 0.3em;
  }

  .file-container {
    position: relative;
    display: inline-block;
  }

  .video-container {
    position: relative;
    display: inline-block;
  }

  .file-deletion-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    animation: fadeInDeletionOverlay 60s linear forwards;
    pointer-events: none;
    mix-blend-mode: screen;
    transition: transform 0.3s ease;
  }

  .file-deletion-overlay.overlay-disabled {
    opacity: 1;
    animation: none;
    pointer-events: none;
  }

  .file-container:hover .file-deletion-overlay:not(.overlay-disabled) {
    transform: scale(1.05);
  }

  .video-container:hover .file-deletion-overlay:not(.overlay-disabled) {
    transform: scale(1.05);
  }

  .broken-glass {
    width: inherit;
    height: inherit;
    opacity: 0.8;
  }

  .file-preview.file-disabled {
    opacity: 0.5;
    filter: brightness(0.5);
    pointer-events: none;
  }

  @keyframes fadeInDeletionOverlay {
    0% {
      opacity: 0;
    }
    90% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .file-preview {
    display: block;
    width: 15em;
    height: 15em;
    object-fit: cover;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .file-preview:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .file-download {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #ddd;
    border: 1px solid #e9ecef;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    max-width: 300px;
  }

  .file-download:hover {
    background: #e9ecef;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .file-download.file-disabled {
    opacity: 0.5;
    pointer-events: none;
    background: #f8f9fa;
  }

  .file-download.file-disabled:hover {
    transform: none;
    box-shadow: none;
    background: #f8f9fa;
  }

  .file-icon {
    font-size: 2em;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .file-info {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    display: block;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }

  .file-size {
    display: block;
    font-size: 0.875em;
    color: #666;
  }

  .message-time {
    font-size: 0.8125rem;
    font-weight: 300;
    opacity: 0.3;
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
  }

  .system-message {
    align-self: flex-start;
    background-color: #f1f3f4;
    font-style: italic;
  }

  .system-message .message-content {
    opacity: 0.3;
    font-size: 0.9em;
    font-style: italic;
  }

  .own-message .message-author {
    color: #fff;
  }

  .other-message .message-author {
    color: #fff;
  }

  .own-message .message-time {
    color: #fff;
  }

  .other-message .message-time {
    color: #fff;
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
    gap: 0.5em;
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
    height: 100%;
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 0.6em;
    font-size: 1em;
    font-family: inherit;
    resize: none;
    overflow-y: auto;
    scroll-padding: 20px;
  }

  .message-input textarea:disabled {
    background-color: #f0f0f0;
    color: #999;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .message-input .send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: #007bff;
    color: white;
    border: none;
    padding: 0;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.8em;
    min-width: 4em;
  }

  .message-input .send-button:hover:not(:disabled) {
    background: #0056b3;
    transform: scale(1.05);
  }

  .message-input .send-button:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: scale(1);
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

    .message-input .file-upload-btn {
      color: white;
      border: none;
      padding: 10px 12px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .message-input .file-upload-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .message-input .file-upload-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: scale(1);
    }
  }
</style>
