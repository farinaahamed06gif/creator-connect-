import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", router);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}/api/v1/health`);
});