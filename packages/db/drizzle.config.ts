import type { Config } from 'drizzle-kit';
import * as fs from 'fs';
import * as path from 'path';

// Wrangler v3 stores the local D1 database deep inside the .wrangler hidden folder.
// We dynamically find the .sqlite file so Drizzle Studio can connect to it.
const wranglerStateDir = path.resolve(__dirname, '../../apps/api/.wrangler/state/v3/d1');
let localDbPath = '';

if (fs.existsSync(wranglerStateDir)) {
  const findSqlite = (dir: string): string | null => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        const found = findSqlite(fullPath);
        if (found) return found;
      } else if (file.endsWith('.sqlite')) {
        return fullPath;
      }
    }
    return null;
  };
  localDbPath = findSqlite(wranglerStateDir) || '';
}

export default {
  schema: './schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: localDbPath,
  },
} satisfies Config;
