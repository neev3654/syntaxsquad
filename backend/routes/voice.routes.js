import { Router } from 'express';
import { getVoiceToken } from '../controllers/voice.controller.js';

const router = Router();

router.post('/token', getVoiceToken);

export default router;
