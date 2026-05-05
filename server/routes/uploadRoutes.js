import express from 'express';
import { upload, cloudinary } from '../config/cloudinary.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST upload single image (admin only)
router.post('/image', protect, adminOnly, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({
      url:       req.file.path,
      public_id: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE image from cloudinary (admin only)
router.delete('/image', protect, adminOnly, async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ message: 'public_id required' });
    await cloudinary.uploader.destroy(public_id);
    res.json({ message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

