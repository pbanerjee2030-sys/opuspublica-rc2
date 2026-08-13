// tests/setup-env.ts
// Loads environment variables for Vitest test execution.
// Priority: .env.local (if it exists) → .env (if it exists) → .env.example (template)
// This ensures a clean checkout can run `npm test` without manually exporting
// GOVERNANCE_DATABASE_URL, while keeping real secrets in .env.local (gitignored).
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envFiles = ['.env.local', '.env', '.env.example'];
for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    break;
  }
}
