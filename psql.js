const fs = require('fs');
fs.appendFileSync('psql_debug.log', JSON.stringify(process.argv) + '\n');
const { spawnSync } = require('child_process');
let args = process.argv.slice(2).map(a => {
  if (a.includes('127.0.0.1:54322')) {
    return a.replace('127.0.0.1:54322', '127.0.0.1:5432');
  }
  return a;
});
const res = spawnSync('docker', ['exec', 'supabase_db_opuspublica-rc2-local', 'psql', ...args], { stdio: 'inherit' });
process.exit(res.status || 0);
