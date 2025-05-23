const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

class S3Client {
  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME;
    this.directoryPrefix = process.env.S3_DIRECTORY_PREFIX;
  }

  async listObjects() {
    try {
      const params = {
        Bucket: this.bucketName,
        Prefix: this.directoryPrefix
      };

      const data = await s3.listObjectsV2(params).promise();
      
      // Filter only image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.tiff'];
      const imageObjects = data.Contents.filter(obj => {
        const extension = obj.Key.toLowerCase().slice(obj.Key.lastIndexOf('.'));
        return imageExtensions.includes(extension);
      });

      console.log(`Found ${imageObjects.length} image files in ${this.directoryPrefix}`);
      return imageObjects;
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }

  async downloadObject(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      const data = await s3.getObject(params).promise();
      console.log(`Downloaded: ${key}`);
      return data.Body;
    } catch (error) {
      console.error(`Error downloading ${key}:`, error);
      throw error;
    }
  }

  async uploadObject(key, buffer, contentType) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read' // Set the ACL to public-read if needed
      };

      const result = await s3.upload(params).promise();
      console.log(`Uploaded: ${key}`);
      return result;
    } catch (error) {
      console.error(`Error uploading ${key}:`, error);
      throw error;
    }
  }

  async getObjectMetadata(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      const data = await s3.headObject(params).promise();
      return data;
    } catch (error) {
      console.error(`Error getting metadata for ${key}:`, error);
      throw error;
    }
  }
}

module.exports = S3Client;