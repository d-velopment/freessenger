import axios from 'axios';

class FileUploadManager {
  constructor() {
    this.uploadUrl = '/upload';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    // Разрешаем все файлы
  }

  // Загрузка файла
  async uploadFile(file, onProgress = null) {
    try {
      // Проверяем размер файла
      if (file.size > this.maxFileSize) {
        throw new Error('File too large. Maximum size is 10MB.');
      }

      // Создаем FormData
      const formData = new FormData();
      formData.append('file', file);

      // Настраиваем axios для отслеживания прогресса
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      };

      // Отправляем запрос
      const response = await axios.post(this.uploadUrl, formData, config);

      if (response.data.success) {
        return {
          success: true,
          file: response.data.file
        };
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }

    } catch (error) {
      console.error('File upload error:', error);
      
      // Обработка ошибок
      if (error.response) {
        // Ошибка от сервера
        const message = error.response.data?.error || error.message;
        throw new Error(message);
      } else {
        // Ошибка сети или другая
        throw error;
      }
    }
  }

  // Удаление файла
  async deleteFile(filename) {
    try {
      const response = await axios.delete(`${this.uploadUrl}/${filename}`);
      
      if (response.data.success) {
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('File delete error:', error);
      throw error;
    }
  }

  // Получение информации о файле
  async getFileInfo(filename) {
    try {
      const response = await axios.get(`${this.uploadUrl}/${filename}/info`);
      
      if (response.data.success) {
        return {
          success: true,
          file: response.data.file
        };
      } else {
        throw new Error(response.data.error || 'File not found');
      }
    } catch (error) {
      console.error('File info error:', error);
      throw error;
    }
  }

  // Форматирование размера файла
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Проверка типа файла (изображение или видео)
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    }
    return 'unknown';
  }

  // Создание превью для изображения
  createImagePreview(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Not an image file'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Создание превью для видео
  createVideoPreview(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('video/')) {
        reject(new Error('Not a video file'));
        return;
      }

      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadeddata = () => {
        // Устанавливаем размеры canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Рисуем первый кадр
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Конвертируем в data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };

      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  // Создание превью (автоматически определяет тип)
  async createPreview(file) {
    try {
      if (file.type.startsWith('image/')) {
        return await this.createImagePreview(file);
      } else if (file.type.startsWith('video/')) {
        return await this.createVideoPreview(file);
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (error) {
      console.error('Preview creation error:', error);
      throw error;
    }
  }
}

// Экспорт экземпляра
export const fileUploadManager = new FileUploadManager();
export default fileUploadManager;
