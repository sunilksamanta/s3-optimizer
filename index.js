const S3Client = require('./s3Client');
const ImageProcessor = require('./imageProcessor');
require('dotenv').config();
const fs = require('fs');

class ImageResizerApp {
  constructor() {
    this.s3Client = new S3Client();
    this.imageProcessor = new ImageProcessor();
    this.processedCount = 0;
    this.errorCount = 0;
    this.totalSavings = 0;
  }

  async processAllImages() {
    console.log('Starting image processing...');
    console.log('==============================');

    try {
      // Get list of all image objects
      const imageObjects = await this.s3Client.listObjects({
        Bucket: this.s3Client.bucketName,
        Prefix: this.s3Client.directoryPrefix
      });

      if (imageObjects.length === 0) {
        console.log('No images found in the specified directory.');
        return;
      }

      console.log(`Processing ${imageObjects.length} images...`);
      console.log('==============================');

    //   Process images one by one
      for (const obj of imageObjects) {
        await this.processImage(obj.Key);
        
        // Add a small delay to avoid overwhelming S3
        await this.delay(100);
      }

      this.printSummary();

    } catch (error) {
      console.error('Error in processAllImages:', error);
    }
  }

  async processImage(key) {
    try {
      console.log(`\nProcessing: ${key}`);
      
      // Download the image
      const imageBuffer = await this.s3Client.downloadObject(key);
      
      // Get original metadata for content type
      const metadata = await this.s3Client.getObjectMetadata(key);
      // Log in MB
        console.log(`Original size: ${(metadata.ContentLength / 1024 / 1024).toFixed(2)} MB`);

      // Resize the image
      const resizeResult = await this.imageProcessor.resizeImage(imageBuffer);

      // save the file locally
    //   fs.writeFileSync(`./resized_${key}`, resizeResult.buffer);
      
      // Determine content type
      const contentType = this.imageProcessor.getContentType(resizeResult.originalFormat);

      // backup the original image into a different folder
      const backupKey = key.replace(this.s3Client.directoryPrefix, `${this.s3Client.directoryPrefix}backup/`);
      await this.s3Client.uploadObject(backupKey, imageBuffer, metadata.ContentType);
      

      // Upload the resized image back to the same location
      await this.s3Client.uploadObject(key, resizeResult.buffer, contentType);
      
      this.processedCount++;
    //   this.totalSavings += (resizeResult.originalSize - resizeResult.newSize);
      
      console.log(`✅ Successfully processed: ${key}`);
    //   console.log(`   Size reduction: ${resizeResult.compressionRatio}%`);
      
    } catch (error) {
      console.error(`❌ Error processing ${key}:`, error.message);
      this.errorCount++;
    }
  }

  async processImageWithCustomOptions(key, resizeOptions) {
    try {
      console.log(`\nProcessing with custom options: ${key}`);
      
      const imageBuffer = await this.s3Client.downloadObject(key);
      const metadata = await this.s3Client.getObjectMetadata(key);
      
      const resizeResult = await this.imageProcessor.resizeImage(imageBuffer, resizeOptions);
      const contentType = this.imageProcessor.getContentType(resizeResult.originalFormat);
      
      await this.s3Client.uploadObject(key, resizeResult.buffer, contentType);
      
      console.log(`✅ Successfully processed with custom options: ${key}`);
      return resizeResult;
      
    } catch (error) {
      console.error(`❌ Error processing ${key}:`, error.message);
      throw error;
    }
  }

  async processSingleImage(key) {
    console.log('Processing single image...');
    console.log('==============================');
    
    await this.processImage(key);
    this.printSummary();
  }

  printSummary() {
    console.log('\n==============================');
    console.log('PROCESSING SUMMARY');
    console.log('==============================');
    console.log(`Total processed: ${this.processedCount}`);
    console.log(`Errors: ${this.errorCount}`);
    console.log(`Total size savings: ${(this.totalSavings / 1024 / 1024).toFixed(2)} MB`);
    console.log('==============================');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const app = new ImageResizerApp();
  
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'all':
      await app.processAllImages();
      break;
      
    case 'single':
      const imagePath = args[1];
      if (!imagePath) {
        console.error('Please provide image path: npm run start single path/to/image.jpg');
        process.exit(1);
      }
      await app.processSingleImage(imagePath);
      break;
      
    case 'custom':
      const customPath = args[1];
      const width = parseInt(args[2]) || 800;
      const height = parseInt(args[3]) || 600;
      const quality = parseInt(args[4]) || 80;
      
      if (!customPath) {
        console.error('Please provide image path: npm run start custom path/to/image.jpg [width] [height] [quality]');
        process.exit(1);
      }
      
      const customOptions = { width, height, quality, fit: 'inside' };
      await app.processImageWithCustomOptions(customPath, customOptions);
      app.printSummary();
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run start all                    - Process all images');
      console.log('  npm run start single <path>          - Process single image');
      console.log('  npm run start custom <path> [w] [h] [q] - Process with custom dimensions');
      console.log('\nExamples:');
      console.log('  npm run start all');
      console.log('  npm run start single images/photo.jpg');
      console.log('  npm run start custom images/photo.jpg 1200 800 90');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the application
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ImageResizerApp;