import path from 'node:path';

import { createRequestHandler } from 'expo-server/adapter/vercel';

/**
 * The Vercel function that serves the whole HealthMatrix API: every Expo Router API route
 * (`src/app/api/**`) and the public emergency page (`/e/<code>`). `npx expo export -p web` builds
 * them into `dist/server`, which `vercel.json` ships with this function. Server settings
 * (MongoDB, Twilio, Mobilab) come from the Vercel project's environment variables.
 */
export default createRequestHandler({ build: path.join(__dirname, '../dist/server') });
