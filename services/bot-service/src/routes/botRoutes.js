// bot-service/src/routes/botRoutes.js

import { Router, json } from "express";
import {
  health,
  move,
} from "../controllers/botControllers.js";

const router = Router();

// garante parse de JSON mesmo se o server esquecer
router.use(json({ limit: "2mb" }));

// health
router.get("/health", health);

// move
// match-service chama: POST http://localhost:3003/move
// body: { state: {...}, difficulty: "easy"|"normal"|"hard" }
router.post("/move", move);

export default router;
