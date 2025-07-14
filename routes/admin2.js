// routes/admin2.js
import express from "express";
const router = express.Router();

router.get("/admin2/:p1?", (req, res) => {
  const { url, baseUrl, originalUrl, params } = req;
  res.json({ url, baseUrl, originalUrl, params });
});

export default router;