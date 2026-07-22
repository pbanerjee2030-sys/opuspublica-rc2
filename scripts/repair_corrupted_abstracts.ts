import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- Load env ---
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
      if (!process.env[key]) process.env[key] = value.trim();
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const DRY_RUN = !process.argv.includes('--apply');

const AFFECTED_IDS = [
  '12cc3ce1-6fa8-4f2f-85c4-d40c957c6198',
  'd62511c5-be8d-45cb-b6f6-8237d229bfc0',
  'e863739b-4042-4be7-8c34-d1d3d78379ce',
];

function repairText(text: string): string {
  return text.replace(/([a-z])\n(?=[a-z])/g, '$1rn');
}

function showDiff(label: string, before: string, after: string): void {
  const bLines = before.split('\n');
  const aLines = after.split('\n');
  let changed = false;

  for (let i = 0; i < Math.max(bLines.length, aLines.length); i++) {
    const b = bLines[i] ?? '';
    const a = aLines[i] ?? '';
    if (b !== a) {
      if (!changed) {
        console.log(`\n  ${label}:`);
        changed = true;
      }
      // Show the context around the changed word(s)
      const wordsB = b.split(/([a-z])\n(?=[a-z])/g);
      const wordsA = a.split(/([a-z])\n(?=[a-z])/g);
      // Simpler approach: show excerpt where change occurs
      const re = /([a-z])\n(?=[a-z])/g;
      let match: RegExpExecArray | null;
      const excerptsB: string[] = [];
      while ((match = re.exec(before)) !== null) {
        const start = Math.max(0, match.index - 20);
        const end = Math.min(before.length, match.index + match[0].length + 20);
        excerptsB.push(`  BEFORE: ...${before.slice(start, end).replace(/\n/g, '\\n')}...`);
      }

      // For after text, find the 'rn' insertions near original corruption sites
      // Re-run the match on the original to get positions
      const re2 = /([a-z])\n(?=[a-z])/g;
      const excerptsA: string[] = [];
      let idx = 0;
      let offset = 0;
      while ((match = re2.exec(before)) !== null) {
        const origPos = match.index;
        // In the fixed text, this \n has been replaced with rn
        const fixedPos = origPos + offset;
        const fragmentAfter = after.slice(Math.max(0, fixedPos - 20), Math.min(after.length, fixedPos + 21));
        excerptsA.push(`  AFTER:  ...${fragmentAfter.replace(/\n/g, '\\n').replace(/rn/g, '\x1b[32mrn\x1b[0m')}...`);
        offset += 1; // each replacement adds 1 char (\n → rn)
      }

      excerptsB.forEach((e, i) => {
        console.log(excerptsB[i]);
        if (i < excerptsA.length) console.log(excerptsA[i]);
        console.log('');
      });
    }
  }

  if (!changed) {
    console.log(`  ${label}: (no change)`);
  }
}

async function main() {
  console.log(`=== Repair Script ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY (will write to database)'}\n`);

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, abstract, content')
    .in('id', AFFECTED_IDS);

  if (error || !articles) {
    console.error('Query failed:', error?.message);
    process.exit(1);
  }

  if (articles.length === 0) {
    console.log('No affected articles found.');
    process.exit(0);
  }

  let totalFixes = 0;

  for (const article of articles) {
    const origAbstract = article.abstract || '';
    const origContent = article.content || '';
    const fixedAbstract = repairText(origAbstract);
    const fixedContent = repairText(origContent);

    const absChanged = origAbstract !== fixedAbstract;
    const conChanged = origContent !== fixedContent;

    console.log('='.repeat(72));
    console.log(`Article: ${article.title}`);
    console.log(`ID:      ${article.id}`);

    if (absChanged) {
      totalFixes += (origAbstract.match(/([a-z])\n(?=[a-z])/g) || []).length;
      showDiff('ABSTRACT', origAbstract, fixedAbstract);
    }

    if (conChanged) {
      totalFixes += (origContent.match(/([a-z])\n(?=[a-z])/g) || []).length;
      showDiff('CONTENT', origContent, fixedContent);
    }

    if (!absChanged && !conChanged) {
      console.log('  No corruption detected.');
    }

    if (!DRY_RUN && (absChanged || conChanged)) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          abstract: fixedAbstract,
          content: fixedContent,
        })
        .eq('id', article.id);

      if (updateError) {
        console.error(`  ❌ Update failed: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated successfully`);
      }
    }

    console.log('');
  }

  console.log('='.repeat(72));
  console.log(`Total mid-word newlines detected: ${totalFixes}`);
  if (DRY_RUN) {
    console.log(`\nDRY RUN complete. Re-run with --apply to write changes.`);
    console.log(`  npx tsx scripts/repair_corrupted_abstracts.ts --apply`);
  } else {
    console.log(`\nAll changes applied.`);
  }
  console.log('');
}

main().catch(console.error);
