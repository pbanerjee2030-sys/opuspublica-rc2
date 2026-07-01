import * as fs from 'fs';
import * as path from 'path';

const filesToClean = [
  'app/admin/dashboard/page.tsx',
  'app/cookies/CookieClient.tsx',
  'app/books/[slug]/BookClient.tsx',
  'app/page.tsx',
  'app/submit/page.tsx',
  'app/[journal-slug]/page.tsx',
  'app/[journal-slug]/article/[id]/page.tsx',
  'app/profile/[id]/page.tsx',
  'app/privacy/PrivacyClient.tsx',
  'app/terms/TermsClient.tsx'
];

function cleanFile(filePath: string) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`Skipping: ${filePath} does not exist.`);
    return;
  }
  
  let content = fs.readFileSync(absolutePath, 'utf8');
  
  // Remove import Navbar
  content = content.replace(/import\s+Navbar\s+from\s+['"]@\/components\/Navbar['"];?\r?\n?/g, '');
  content = content.replace(/import\s+Navbar\s+from\s+['"]\.\.\/\.\.\/components\/Navbar['"];?\r?\n?/g, '');
  
  // Remove <Navbar />
  content = content.replace(/<Navbar\s*\/>\r?\n?/g, '');
  content = content.replace(/<Navbar\s*>\r?\n?/g, '');
  
  fs.writeFileSync(absolutePath, content, 'utf8');
  console.log(`Successfully cleaned Navbar reference from: ${filePath}`);
}

filesToClean.forEach(cleanFile);
console.log('Navbar cleanup script execution finished.');
