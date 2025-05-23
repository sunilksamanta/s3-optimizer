const sharp = require('sharp');

class ImageProcessor {
  constructor() {
    this.width = parseInt(process.env.RESIZE_WIDTH) || 1024;
    // Setting height to null to maintain aspect ratio
    this.height = null;
  }

  async resizeImage(buffer, options = {}) {
    try {
      const {
        width = this.width,
        height = null, // Default to null to maintain aspect ratio
        fit = 'inside', // 'cover', 'contain', 'fill', 'inside', 'outside'
        quality = 100,
        format = null // null means keep original format
      } = options;

      let sharpInstance = sharp(buffer);

      // Get original image metadata
      const metadata = await sharpInstance.metadata();
      console.log(`Original dimensions: ${metadata.width}x${metadata.height}, Format: ${metadata.format}`);

      // Calculate target dimensions
      let targetWidth = width;
      let targetHeight = height;
      
      // If height is null, maintain aspect ratio based on width
      if (width && !height) {
        const aspectRatio = metadata.width / metadata.height;
        targetHeight = Math.round(width / aspectRatio);
      }

      // Resize the image
      sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
        fit: fit,
        withoutEnlargement: true // Don't enlarge if original is smaller
      });

      // Set output format and quality
      if (format) {
        switch (format.toLowerCase()) {
          case 'jpeg':
          case 'jpg':
            sharpInstance = sharpInstance.jpeg({ quality });
            break;
          case 'png':
            sharpInstance = sharpInstance.png({ quality });
            break;
          case 'webp':
            sharpInstance = sharpInstance.webp({ quality });
            break;
        }
      } else {
        // Keep original format but optimize
        switch (metadata.format) {
          case 'jpeg':
            sharpInstance = sharpInstance.jpeg({ quality });
            break;
          case 'png':
            sharpInstance = sharpInstance.png({ quality });
            break;
          case 'webp':
            sharpInstance = sharpInstance.webp({ quality });
            break;
        }
      }

      const resizedBuffer = await sharpInstance.toBuffer();
      
      console.log(`Resized to: ${targetWidth}x${targetHeight}, Original size: ${buffer.length} bytes, New size: ${resizedBuffer.length} bytes`);
      
      return {
        buffer: resizedBuffer,
        originalFormat: metadata.format,
        originalSize: buffer.length,
        newSize: resizedBuffer.length,
        compressionRatio: ((buffer.length - resizedBuffer.length) / buffer.length * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error resizing image:', error);
      throw error;
    }
  }

  getContentType(format) {
    const contentTypes = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'tiff': 'image/tiff',
      'gif': 'image/gif'
    };

    return contentTypes[format.toLowerCase()] || 'image/jpeg';
  }

  // Method to create different resize options for different use cases
  getResizeOptions(type = 'default') {
    const options = {
      thumbnail: {
        width: 150,
        height: null, // Auto-calculate height based on aspect ratio
        fit: 'inside',
        quality: 70
      },
      medium: {
        width: 800,
        height: null, // Auto-calculate height based on aspect ratio
        fit: 'inside',
        quality: 80
      },
      large: {
        width: 1200,
        height: null, // Auto-calculate height based on aspect ratio
        fit: 'inside',
        quality: 85
      },
      default: {
        width: this.width,
        height: null, // Auto-calculate height based on aspect ratio
        fit: 'inside',
        quality: 80
      }
    };

    return options[type] || options.default;
  }
}

module.exports = ImageProcessor;