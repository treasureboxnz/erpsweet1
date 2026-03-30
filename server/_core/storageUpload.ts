import { Express } from 'express';
import multer from 'multer';
import { storagePut } from '../storage';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export function registerStorageUploadRoute(app: Express) {
  app.post('/api/storage/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const path = req.body.path;
      if (!path) {
        return res.status(400).json({ error: 'No path specified' });
      }

      // Upload file to S3 using the storage helper
      const result = await storagePut(
        path,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({
        url: result.url,
        key: result.key,
      });
    } catch (error) {
      console.error('Storage upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
