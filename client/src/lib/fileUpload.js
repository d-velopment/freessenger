import axios from 'axios';

class FileUploadManager {
  constructor() {
    this.uploadUrl = '/upload';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    // Allow all file types
  }

  // Upload file
  async uploadFile(file, onProgress = null) {
    try {
      // Check file size
      if (file.size > this.maxFileSize) {
        throw new Error('File too large. Maximum size is 10MB.');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Configure axios for progress tracking
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

      // Send request
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
      
      // Error handling
      if (error.response) {
        // Server error
        const message = error.response.data?.error || error.message;
        throw new Error(message);
      } else {
        // Network error or other
        throw error;
      }
    }
  }

  // Delete file
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

  // Get file information
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

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check file type (image or video)
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    }
    return 'unknown';
  }

  // Create image preview
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

  // Create video preview
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
        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw first frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };

      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  // Create preview (auto-detect type)
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

// Export instance
export const fileUploadManager = new FileUploadManager();
export default fileUploadManager;
