import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MID_WORD_NEWLINE = /[a-z]\n[a-z]/;

function highlightNewlines(text: string): string {
  return text.replace(/\n/g, '\\n');
}

function findCorruptionExcerpt(fullText: string, pattern: RegExp, contextChars = 60): string[] {
  const excerpts: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, 'g');
  while ((match = re.exec(fullText)) !== null) {
    const start = Math.max(0, match.index - contextChars);
    const end = Math.min(fullText.length, match.index + match[0].length + contextChars);
    const excerpt = fullText.slice(start, end).replace(/\n/g, '\\n');
    excerpts.push(`...${excerpt}...`);
  }
  return excerpts;
}

async function diagnose() {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, abstract, content, published_at, status')
    .order('published_at', { ascending: false });

  if (error || !articles) {
    console.error('Query failed:', error?.message);
    process.exit(1);
  }

  let affected = 0;
  let unaffected = 0;

  for (const article of articles) {
    const abs = article.abstract || '';
    const con = article.content || '';
    const absMatches = abs.match(MID_WORD_NEWLINE);
    const conMatches = con.match(MID_WORD_NEWLINE);

    if (!absMatches && !conMatches) {
      unaffected++;
      console.log(`[OK]  ${article.id.slice(0,8)} | ${article.published_at?.slice(0,10)} | ${(article.title || '').slice(0,60)}`);
      continue;
    }

    affected++;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[CORRUPTED] Article ID: ${article.id}`);
    console.log(`Title:        ${article.title}`);
    console.log(`Published:    ${article.published_at}`);
    console.log(`Status:       ${article.status}`);
    console.log('');

    if (absMatches) {
      console.log('--- ABSTRACT corruption ---');
      console.log('  Raw (newlines shown as \\n):');
      console.log(`  ${highlightNewlines(abs)}`);
      console.log('');
      console.log('  Excerpts around each mid-word newline:');
      findCorruptionExcerpt(abs, MID_WORD_NEWLINE).forEach(e => console.log(`  ${e}`));
      console.log('');
      console.log('  Proposed fix (collapse \\n to space):');
      console.log(`  ${abs.replace(/\n/g, ' ')}`);
      console.log('');
    }

    if (conMatches) {
      console.log('--- CONTENT corruption ---');
      console.log('  Excerpts around each mid-word newline:');
      findCorruptionExcerpt(con, MID_WORD_NEWLINE).forEach(e => console.log(`  ${e}`));
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`SUMMARY:`);
  console.log(`  Corrupted:  ${affected}`);
  console.log(`  Unaffected: ${unaffected}`);
  console.log(`  Total:      ${articles.length}`);
  console.log(`\nNo data was modified. Read-only diagnostic complete.`);
}

diagnose().catch(console.error);
