import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage.js";
import { randomBytes } from "crypto";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate unique filename
    const ext = req.file.originalname.split(".").pop();
    const filename = `material-boards/${randomBytes(16).toString("hex")}.${ext}`;

    // Upload to S3
    const result = await storagePut(filename, req.file.buffer, req.file.mimetype);

    res.json({ url: result.url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
