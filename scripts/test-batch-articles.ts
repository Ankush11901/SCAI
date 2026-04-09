import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

interface TestCase {
  articleType: string
  topic: string
  variation: 'statement' | 'question' | 'listicle'
  wordCount: number
}

const TEST_CASES: TestCase[] = [
  // ── Informational ──
  { articleType: 'informational', topic: 'Intermittent Fasting', variation: 'statement', wordCount: 1000 },
  { articleType: 'informational', topic: 'Electric Cars', variation: 'question', wordCount: 1000 },
  { articleType: 'informational', topic: 'Blockchain Technology', variation: 'listicle', wordCount: 1500 },
  { articleType: 'informational', topic: 'Sleep Hygiene', variation: 'statement', wordCount: 1500 },

  // ── Commercial ──
  { articleType: 'commercial', topic: 'Standing Desks', variation: 'statement', wordCount: 1000 },
  { articleType: 'commercial', topic: 'Robot Vacuums', variation: 'question', wordCount: 1000 },

  // ── How-to ──
  { articleType: 'how-to', topic: 'Start a Podcast', variation: 'statement', wordCount: 1500 },
  { articleType: 'how-to', topic: 'Grow Tomatoes Indoors', variation: 'question', wordCount: 1000 },

  // ── Listicle ──
  { articleType: 'listicle', topic: 'Budget Travel Destinations', variation: 'listicle', wordCount: 1500 },
  { articleType: 'listicle', topic: 'Home Workout Equipment', variation: 'listicle', wordCount: 1000 },

  // ── Comparison ──
  { articleType: 'comparison', topic: 'Spotify vs Apple Music', variation: 'statement', wordCount: 1000 },
  { articleType: 'comparison', topic: 'React vs Vue', variation: 'question', wordCount: 1000 },

  // ── Review ──
  { articleType: 'review', topic: 'Sony WH-1000XM5', variation: 'statement', wordCount: 1000 },
  { articleType: 'review', topic: 'Dyson V15 Detect', variation: 'question', wordCount: 1000 },

  // ── Recipe ──
  { articleType: 'recipe', topic: 'Homemade Pizza Dough', variation: 'statement', wordCount: 1000 },
  { articleType: 'recipe', topic: 'Thai Green Curry', variation: 'question', wordCount: 1000 },

  // ── Local ──
  { articleType: 'local', topic: 'Gyms in Brooklyn New York', variation: 'statement', wordCount: 1000 },
  { articleType: 'local', topic: 'Dog Parks in Portland Oregon', variation: 'question', wordCount: 1000 },

  // ── Affiliate ──
  { articleType: 'affiliate', topic: 'Best Air Purifiers', variation: 'statement', wordCount: 1500 },
  { articleType: 'affiliate', topic: 'Best Gaming Monitors', variation: 'listicle', wordCount: 1500 },
]

async function runSingleTest(testCase: TestCase, index: number) {
  const { JSDOM } = await import('jsdom');
  const { orchestrateUnifiedGeneration } = await import('../lib/services/unified-orchestrator');

  const mock = async (_p: any) => ({ url: 'https://placehold.co/600x400?text=Placeholder' });

  let finalHtml = '';
  let finalWordCount = 0;

  const gen = orchestrateUnifiedGeneration(
    testCase.articleType,
    testCase.topic,
    testCase.variation,
    testCase.wordCount,
    mock,
    'default',
    'openai',
    'Clean Studio',
    false,
    true,
    true,
  );

  for await (const ev of gen) {
    if (ev.type === 'complete') { finalHtml = ev.html; finalWordCount = ev.wordCount; }
    else if (ev.type === 'error') { return { index, testCase, error: ev.error, analysis: null }; }
  }

  if (!finalHtml) return { index, testCase, error: 'No HTML', analysis: null };

  const doc = new JSDOM(finalHtml).window.document;

  const h1 = doc.querySelector('h1')?.textContent?.trim() || '(none)';
  const title = doc.querySelector('title')?.textContent?.trim() || '';

  const sections = doc.querySelectorAll('section[data-component="scai-section"]');
  const h2s: string[] = [];
  sections.forEach((s: any) => h2s.push(s.querySelector('h2')?.textContent?.trim() || ''));

  const closingH2 = doc.querySelector('[data-component="scai-closing"] h2')?.textContent?.trim() || '(none)';

  const toc = doc.querySelector('[data-component="scai-table-of-contents"]');
  const tocItems = toc ? Array.from(toc.querySelectorAll('a')).map((a: any) => a.textContent?.trim()) : [];
  const allH2s = Array.from(doc.querySelectorAll('h2')).map((h: any) => h.textContent?.trim());
  const tocOk = tocItems.every((item: string) => allH2s.includes(item));

  // Variation format checks
  const issues: string[] = [];
  const v = testCase.variation;

  if (v === 'question') {
    if (!h1.endsWith('?')) issues.push('H1 missing ?');
    h2s.forEach((h, i) => { if (!h.endsWith('?')) issues.push(`H2#${i + 1} missing ?`); });
    if (!closingH2.endsWith('?')) issues.push('Closing H2 missing ?');
  } else if (v === 'listicle') {
    h2s.forEach((h, i) => { if (!/^\d+[\.\)]?\s/.test(h)) issues.push(`H2#${i + 1} not numbered`); });
  } else {
    if (h1.endsWith('?')) issues.push('H1 has ? in statement');
    h2s.forEach((h, i) => { if (h.endsWith('?')) issues.push(`H2#${i + 1} has ? in statement`); });
    if (closingH2.endsWith('?')) issues.push('Closing H2 has ? in statement');
  }

  if (!tocOk) issues.push('TOC mismatch');

  return {
    index,
    testCase,
    error: null,
    analysis: { h1, h2s, closingH2, tocOk, title, wordCount: finalWordCount, issues },
  };
}

async function main() {
  const { writeFileSync, mkdirSync } = await import('fs');
  mkdirSync('./test-output', { recursive: true });

  console.log('='.repeat(90));
  console.log(`BATCH ARTICLE TEST — ${TEST_CASES.length} articles`);
  console.log('='.repeat(90));

  // Run in batches of 4 to avoid rate limits
  const BATCH_SIZE = 4;
  const allResults: any[] = [];

  for (let b = 0; b < TEST_CASES.length; b += BATCH_SIZE) {
    const batch = TEST_CASES.slice(b, b + BATCH_SIZE);
    console.log(`\n── Batch ${Math.floor(b / BATCH_SIZE) + 1}/${Math.ceil(TEST_CASES.length / BATCH_SIZE)}: ${batch.map(t => t.articleType).join(', ')} ──`);

    const results = await Promise.allSettled(
      batch.map((tc, i) => {
        const idx = b + i;
        console.log(`  [START] #${idx + 1} ${tc.articleType}/${tc.variation}: "${tc.topic}"`);
        return runSingleTest(tc, idx);
      })
    );

    for (const r of results) {
      const val = r.status === 'fulfilled' ? r.value : { index: -1, testCase: { articleType: '?', topic: '?', variation: '?', wordCount: 0 }, error: (r as any).reason?.message, analysis: null };
      allResults.push(val);
      const tc = val.testCase;
      if (val.error) {
        console.log(`  [FAIL] ${tc.articleType}/${tc.variation}: ${val.error}`);
      } else {
        const a = val.analysis!;
        const status = a.issues.length === 0 ? '✓' : `⚠ ${a.issues.length}`;
        console.log(`  [DONE] ${tc.articleType}/${tc.variation}: ${a.wordCount}w ${status}`);
      }
    }
  }

  // Print summary table
  console.log(`\n${'='.repeat(90)}`);
  console.log('SUMMARY');
  console.log('='.repeat(90));
  console.log(`${'#'.padEnd(3)} ${'Type'.padEnd(14)} ${'Variation'.padEnd(10)} ${'Words'.padEnd(6)} ${'H2s'.padEnd(4)} ${'TOC'.padEnd(5)} ${'Issues'.padEnd(8)} H1`);
  console.log('-'.repeat(90));

  let totalIssues = 0;

  allResults.sort((a: any, b: any) => a.index - b.index);

  for (const r of allResults) {
    const tc = r.testCase;
    if (r.error) {
      console.log(`${String(r.index + 1).padEnd(3)} ${tc.articleType.padEnd(14)} ${tc.variation.padEnd(10)} ${'ERR'.padEnd(6)} ${'—'.padEnd(4)} ${'—'.padEnd(5)} ${'CRASH'.padEnd(8)} ${r.error}`);
      totalIssues++;
      continue;
    }
    const a = r.analysis!;
    const issueCount = a.issues.length;
    totalIssues += issueCount;
    console.log(`${String(r.index + 1).padEnd(3)} ${tc.articleType.padEnd(14)} ${tc.variation.padEnd(10)} ${String(a.wordCount).padEnd(6)} ${String(a.h2s.length).padEnd(4)} ${(a.tocOk ? '✓' : '✗').padEnd(5)} ${(issueCount === 0 ? '✓' : '⚠ ' + issueCount).padEnd(8)} ${a.h1}`);
  }

  console.log('-'.repeat(90));
  console.log(`Total: ${allResults.length} articles, ${totalIssues} with issues\n`);

  // Print issues detail
  const withIssues = allResults.filter((r: any) => r.analysis?.issues?.length > 0);
  if (withIssues.length > 0) {
    console.log('ISSUE DETAILS:');
    for (const r of withIssues) {
      console.log(`  #${r.index + 1} ${r.testCase.articleType}/${r.testCase.variation} "${r.testCase.topic}":`);
      for (const issue of r.analysis!.issues) {
        console.log(`    - ${issue}`);
      }
    }
  }

  // Print all H1 + H2s for review
  console.log(`\n${'='.repeat(90)}`);
  console.log('FULL STRUCTURE');
  console.log('='.repeat(90));

  for (const r of allResults) {
    if (r.error) continue;
    const tc = r.testCase;
    const a = r.analysis!;
    console.log(`\n#${r.index + 1} [${tc.articleType}/${tc.variation}] "${tc.topic}" (${a.wordCount}w)`);
    console.log(`  H1: ${a.h1}`);
    a.h2s.forEach((h: string, i: number) => console.log(`  H2${i + 1}: ${h}`));
    console.log(`  Closing: ${a.closingH2}`);
    console.log(`  Title: ${a.title}`);
  }
}

main().catch(console.error);
