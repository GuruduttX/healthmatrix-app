import { Router } from 'express';

import { isDBConnected } from '../config/db.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { careRoutes } from '../modules/care/care.routes.js';
import { ekaayRoutes } from '../modules/ekaay/ekaay.routes.js';
import { emergencyRoutes } from '../modules/emergency/emergency.routes.js';
import { familyRoutes } from '../modules/family/family.routes.js';
import { membersRoutes } from '../modules/members/members.routes.js';
import { recordsRoutes } from '../modules/records/records.routes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  const db = isDBConnected();
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
});

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/members', membersRoutes);
apiRoutes.use('/emergency', emergencyRoutes);
apiRoutes.use('/records', recordsRoutes);
apiRoutes.use('/ekaay', ekaayRoutes);
apiRoutes.use('/care', careRoutes);
apiRoutes.use('/family', familyRoutes);
