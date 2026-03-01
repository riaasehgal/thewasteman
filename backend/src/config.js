import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '..', '.env') });

/**
 * Return validated configuration from environment variables.
 */
export function getConfig() {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    dbPath: resolve(__dirname, '..', process.env.DB_PATH || './data/trashtrack.sqlite'),
    staffUser: process.env.STAFF_USER || 'staff',
    staffPass: process.env.STAFF_PASS || 'changeme',
    deviceSecret: process.env.DEVICE_SECRET || 'device-secret-changeme',
  };
}
