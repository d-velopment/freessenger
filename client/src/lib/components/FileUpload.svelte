<script>
  import { createEventDispatcher } from 'svelte';
  import { fileUploadManager } from '$lib/fileUpload.js';

  export let accept = 'image/*,video/*';
  export let maxSize = 10 * 1024 * 1024; // 10MB
  export let multiple = false;
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let fileInput;
  let isDragging = false;
  let isUploading = false;
  let uploadProgress = 0;
  let uploadedFiles = [];
  let errorMessage = '';

  // Обработка выбора файла
  async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    await processFiles(files);
  }

  // Обработка drag & drop
  function handleDragOver(event) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event) {
    event.preventDefault();
    isDragging = false;
  }

  async function handleDrop(event) {
    event.preventDefault();
    isDragging = false;

    const files = Array.from(event.dataTransfer.files);
    await processFiles(files);
  }

  // Обработка файлов
  async function processFiles(files) {
    errorMessage = '';
    
    if (files.length === 0) return;

    if (!multiple && files.length > 1) {
      errorMessage = 'Only one file is allowed';
      return;
    }

    for (const file of files) {
      try {
        // Проверяем размер
        if (file.size > maxSize) {
          errorMessage = `File "${file.name}" is too large. Maximum size is ${fileUploadManager.formatFileSize(maxSize)}`;
          continue;
        }

        // Проверяем тип
        const fileType = fileUploadManager.getFileType(file.type);
        if (fileType === 'unknown') {
          errorMessage = `File "${file.name}" has invalid type. Only images and videos are allowed.`;
          continue;
        }

        // Создаем превью
        let preview = null;
        try {
          preview = await fileUploadManager.createPreview(file);
        } catch (error) {
          console.warn('Could not create preview for file:', file.name);
        }

        // Добавляем файл в список
        const fileInfo = {
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          fileType,
          preview,
          uploaded: false,
          uploadProgress: 0,
          uploadUrl: null,
          uploadTime: null,
          willBeDeletedAt: null,
          error: null
        };

        uploadedFiles = [...uploadedFiles, fileInfo];

        // Начинаем загрузку
        await uploadFile(fileInfo);

      } catch (error) {
        console.error('Error processing file:', error);
        errorMessage = error.message;
      }
    }
  }

  // Загрузка файла на сервер
  async function uploadFile(fileInfo) {
    try {
      isUploading = true;
      fileInfo.uploadProgress = 0;
      fileInfo.error = null;

      const result = await fileUploadManager.uploadFile(fileInfo.file, (progress) => {
        fileInfo.uploadProgress = progress;
        uploadedFiles = [...uploadedFiles]; // Обновляем реактивность
      });

      if (result.success) {
        // Обновляем информацию о загруженном файле
        fileInfo.uploaded = true;
        fileInfo.uploadUrl = result.file.url;
        fileInfo.uploadTime = result.file.uploadTime;
        fileInfo.willBeDeletedAt = result.file.willBeDeletedAt;
        fileInfo.uploadProgress = 100;

        // Отправляем событие об успешной загрузке
        dispatch('upload', {
          file: result.file,
          fileInfo
        });

        // Устанавливаем таймер для автоудаления из UI
        const deleteAfter = 60 * 1000; // 60 секунд
        setTimeout(() => {
          removeFile(fileInfo);
        }, deleteAfter);

      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      fileInfo.error = error.message;
      errorMessage = error.message;
    } finally {
      isUploading = false;
      uploadedFiles = [...uploadedFiles]; // Обновляем реактивность
    }
  }

  // Удаление файла
  async function removeFile(fileInfo) {
    try {
      // Если файл загружен на сервер, удаляем его
      if (fileInfo.uploaded && fileInfo.uploadUrl) {
        const filename = fileInfo.uploadUrl.split('/').pop();
        await fileUploadManager.deleteFile(filename);
      }

      // Удаляем из списка
      uploadedFiles = uploadedFiles.filter(f => f !== fileInfo);

      // Отправляем событие об удалении
      dispatch('remove', { fileInfo });

    } catch (error) {
      console.error('Remove file error:', error);
      errorMessage = error.message;
    }
  }

  // Очистка всех файлов
  function clearAll() {
    uploadedFiles.forEach(fileInfo => {
      if (fileInfo.uploaded && fileInfo.uploadUrl) {
        const filename = fileInfo.uploadUrl.split('/').pop();
        fileUploadManager.deleteFile(filename).catch(console.error);
      }
    });
    uploadedFiles = [];
    errorMessage = '';
  }

  // Открытие диалога выбора файла
  function openFileDialog() {
    if (!disabled && !isUploading) {
      fileInput.click();
    }
  }

  // Форматирование времени до удаления
  function getTimeUntilDeletion(willBeDeletedAt) {
    if (!willBeDeletedAt) return '';
    
    const now = Date.now();
    const timeLeft = willBeDeletedAt - now;
    
    if (timeLeft <= 0) return 'Deleted';
    
    const seconds = Math.floor(timeLeft / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    
    return `${seconds}s`;
  }

  // Реактивное обновление таймера
  $: if (uploadedFiles.some(f => f.willBeDeletedAt)) {
    const interval = setInterval(() => {
      uploadedFiles = [...uploadedFiles];
    }, 1000);
  }
</script>

<div class="file-upload-container">
  <!-- Область для drag & drop -->
  <div 
    class="upload-area"
    class:dragging={isDragging}
    class:disabled={disabled || isUploading}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    on:click={openFileDialog}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? openFileDialog() : null}
  >
    <input
      type="file"
      bind:this={fileInput}
      {accept}
      {multiple}
      {disabled}
      on:change={handleFileSelect}
      style="display: none;"
    />
    
    {#if isUploading}
      <div class="uploading">
        <div class="spinner"></div>
        <p>Uploading... {uploadProgress}%</p>
      </div>
    {:else}
      <div class="upload-prompt">
        <div class="upload-icon">📁</div>
        <p>Drop files here or click to browse</p>
        <small>Maximum file size: {fileUploadManager.formatFileSize(maxSize)}</small>
      </div>
    {/if}
  </div>

  <!-- Сообщение об ошибке -->
  {#if errorMessage}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      {errorMessage}
      <button on:click={() => errorMessage = ''} class="close-error">×</button>
    </div>
  {/if}

  <!-- Список загруженных файлов -->
  {#if uploadedFiles.length > 0}
    <div class="uploaded-files">
      <div class="files-header">
        <h3>Uploaded Files</h3>
        <button on:click={clearAll} class="clear-all">Clear All</button>
      </div>
      
      <div class="files-list">
        {#each uploadedFiles as fileInfo (fileInfo.name)}
          <div class="file-item" class:uploading={!fileInfo.uploaded} class:error={fileInfo.error}>
            {#if fileInfo.preview}
              <div class="file-preview">
                {#if fileInfo.fileType === 'image'}
                  <img src={fileInfo.preview} alt={fileInfo.name} />
                {:else if fileInfo.fileType === 'video'}
                  <video src={fileInfo.preview} muted></video>
                {/if}
              </div>
            {:else}
              <div class="file-icon">
                {fileInfo.fileType === 'image' ? '🖼️' : fileInfo.fileType === 'video' ? '🎥' : '📄'}
              </div>
            {/if}
            
            <div class="file-info">
              <div class="file-name" title={fileInfo.name}>{fileInfo.name}</div>
              <div class="file-details">
                <span class="file-size">{fileUploadManager.formatFileSize(fileInfo.size)}</span>
                {#if fileInfo.uploaded}
                  <span class="file-timer">
                    ⏰ {getTimeUntilDeletion(fileInfo.willBeDeletedAt)}
                  </span>
                {/if}
              </div>
              
              {#if fileInfo.uploadProgress > 0 && fileInfo.uploadProgress < 100}
                <div class="progress-bar">
                  <div class="progress-fill" style="width: {fileInfo.uploadProgress}%"></div>
                </div>
              {/if}
              
              {#if fileInfo.error}
                <div class="file-error">{fileInfo.error}</div>
              {/if}
            </div>
            
            <button 
              on:click={() => removeFile(fileInfo)} 
              class="remove-file"
              title="Remove file"
            >
              ×
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .file-upload-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .upload-area {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #f9f9f9;
  }

  .upload-area:hover {
    border-color: #007bff;
    background: #f0f8ff;
  }

  .upload-area.dragging {
    border-color: #007bff;
    background: #e3f2fd;
    transform: scale(1.02);
  }

  .upload-area.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .upload-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .upload-icon {
    font-size: 48px;
    opacity: 0.7;
  }

  .uploading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
    padding: 12px;
    border-radius: 4px;
    margin: 10px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .close-error {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #856404;
  }

  .uploaded-files {
    margin-top: 20px;
  }

  .files-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .files-header h3 {
    margin: 0;
    color: #333;
  }

  .clear-all {
    background: #dc3545;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    transition: all 0.3s ease;
  }

  .file-item:hover {
    border-color: #007bff;
    box-shadow: 0 2px 4px rgba(0,123,255,0.1);
  }

  .file-item.uploading {
    border-color: #ffc107;
    background: #fff8e1;
  }

  .file-item.error {
    border-color: #dc3545;
    background: #fff5f5;
  }

  .file-preview {
    width: 60px;
    height: 60px;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
  }

  .file-preview img,
  .file-preview video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .file-icon {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: #f8f9fa;
    border-radius: 4px;
  }

  .file-info {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-details {
    display: flex;
    gap: 10px;
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }

  .file-timer {
    color: #ff6b6b;
    font-weight: 500;
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: #e9ecef;
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #007bff;
    transition: width 0.3s ease;
  }

  .file-error {
    color: #dc3545;
    font-size: 12px;
    margin-top: 4px;
  }

  .remove-file {
    background: #dc3545;
    color: white;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .remove-file:hover {
    background: #c82333;
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    .file-upload-container {
      max-width: 100%;
    }
    
    .upload-area {
      padding: 30px 15px;
    }
    
    .file-item {
      padding: 10px;
    }
    
    .file-preview,
    .file-icon {
      width: 50px;
      height: 50px;
    }
  }
</style>
