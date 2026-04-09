import dotenv from 'dotenv';

// Load environment variables BEFORE any app imports
dotenv.config({ path: '.env.local' });
dotenv.config();

interface TestCase {
  articleType: string
  topic: string
  variation: string
  wordCount: number
}

const TEST_CASES: TestCase[] = [
  { articleType: 'affiliate', topic: 'Best Wireless Headphones', variation: 'statement', wordCount: 1500 },
  { articleType: 'commercial', topic: 'Home Security Cameras', variation: 'statement', wordCount: 1000 },
  { articleType: 'comparison', topic: 'iPhone vs Samsung Galaxy', variation: 'statement', wordCount: 1000 },
  { articleType: 'how-to', topic: 'Train a Puppy', variation: 'statement', wordCount: 1000 },
  { articleType: 'listicle', topic: 'Productivity Apps', variation: 'listicle', wordCount: 1000 },
  { articleType: 'local', topic: 'Coffee Shops in Austin Texas', variation: 'statement', wordCount: 1000 },
  { articleType: 'recipe', topic: 'Chocolate Chip Cookies', variation: 'statement', wordCount: 1000 },
  { articleType: 'review', topic: 'MacBook Pro M4', variation: 'statement', wordCount: 1000 },
]

async function runSingleTest(testCase: TestCase) {
  const { JSDOM } = await import('jsdom');
  const { orchestrateUnifiedGeneration } = await import('../lib/services/unified-orchestrator');

  const mockImageGenerator = async (_params: any) => {
    return { url: 'https://placehold.co/600x400?text=Placeholder' };
  };

  let finalHtml = '';
  let finalWordCount = 0;

  const generator = orchestrateUnifiedGeneration(
    testCase.articleType,
    testCase.topic,
    testCase.variation as any,
    testCase.wordCount,
    mockImageGenerator,
    'default',
    'openai',
    'Clean Studio',
    false,
    true,
    true,
  );

  for await (const event of generator) {
    if (event.type === 'complete') {
      finalHtml = event.html;
      finalWordCount = event.wordCount;
    } else if (event.type === 'error') {
      return { testCase, error: event.error, html: '', analysis: null };
    }
  }

  if (!finalHtml) {
    return { testCase, error: 'No HTML generated', html: '', analysis: null };
  }

  // Parse and analyze
  const dom = new JSDOM(finalHtml);
  const doc = dom.window.document;

  const h1 = doc.querySelector('h1')?.textContent?.trim() || '(no H1)';

  // Overview
  const overview = doc.querySelector('[data-component="scai-overview"]');
  const overviewText = overview?.textContent?.trim() || '(no overview)';

  // Sections
  const sections = doc.querySelectorAll('section[data-component="scai-section"], section[id^="section-"]');
  const sectionData: Array<{ h2: string; wordCount: number; excerpt: string }> = [];
  sections.forEach((section: any) => {
    const h2 = section.querySelector('h2')?.textContent?.trim() || '(no H2)';
    const paragraphs = Array.from(section.querySelectorAll('p.scai-paragraph'));
    const sectionText = paragraphs.map((p: any) => p.textContent?.trim() || '').join(' ');
    const wordCount = sectionText.split(/\s+/).filter(Boolean).length;
    const excerpt = sectionText.substring(0, 150) + (sectionText.length > 150 ? '...' : '');
    sectionData.push({ h2, wordCount, excerpt });
  });

  // Closing
  const closing = doc.querySelector('[data-component="scai-closing"]');
  const closingH2 = closing?.querySelector('h2')?.textContent?.trim() || '(no closing H2)';
  const closingText = closing ? Array.from(closing.querySelectorAll('p')).map((p: any) => p.textContent?.trim()).join(' ') : '';

  // TOC — includes section H2s + component H2s, but NOT closing H2
  const toc = doc.querySelector('[data-component="scai-table-of-contents"]');
  const tocItems = toc ? Array.from(toc.querySelectorAll('a')).map((a: any) => a.textContent?.trim()) : [];
  // Grab ALL h2 elements in the article (any class) to verify TOC entries exist in HTML
  const allH2s = Array.from(doc.querySelectorAll('h2')).map((h: any) => h.textContent?.trim());
  const tocMatch = tocItems.every((item: string) => allH2s.includes(item));
  const tocMismatchItems = tocItems.filter((item: string) => !allH2s.includes(item));

  // Meta
  const metaTitle = doc.querySelector('title')?.textContent?.trim() || '';
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  return {
    testCase,
    error: null,
    html: finalHtml,
    analysis: {
      h1,
      overviewExcerpt: overviewText.substring(0, 200) + (overviewText.length > 200 ? '...' : ''),
      sections: sectionData,
      closingH2,
      closingExcerpt: closingText.substring(0, 150) + (closingText.length > 150 ? '...' : ''),
      tocItems,
      allH2s,
      tocMatch,
      tocMismatchItems,
      metaTitle,
      metaTitleLength: metaTitle.length,
      metaDesc,
      metaDescLength: metaDesc.length,
      wordCount: finalWordCount,
    },
  };
}

async function runAllTests() {
  const { writeFileSync, mkdirSync } = await import('fs');

  console.log('='.repeat(80));
  console.log('ARTICLE TYPE COHERENCE TEST — ALL TYPES');
  console.log('='.repeat(80));
  console.log(`Testing ${TEST_CASES.length} article types in parallel...\n`);

  const startTime = Date.now();

  // Run all in parallel
  const results = await Promise.allSettled(
    TEST_CASES.map(async (tc) => {
      console.log(`[START] ${tc.articleType}: "${tc.topic}"`);
      try {
        const result = await runSingleTest(tc);
        console.log(`[DONE]  ${tc.articleType}: ${result.error ? '❌ ' + result.error : '✓'}`);
        return result;
      } catch (err: any) {
        console.log(`[FAIL]  ${tc.articleType}: ${err.message}`);
        return { testCase: tc, error: err.message, html: '', analysis: null };
      }
    })
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nAll tests completed in ${elapsed}s\n`);

  // Save HTML files
  mkdirSync('./test-output', { recursive: true });

  console.log('='.repeat(80));
  console.log('DETAILED RESULTS');
  console.log('='.repeat(80));

  for (const settled of results) {
    const result = settled.status === 'fulfilled' ? settled.value : { testCase: { articleType: '?', topic: '?' }, error: (settled as any).reason?.message, analysis: null, html: '' };

    console.log(`\n${'━'.repeat(80)}`);
    console.log(`📝 ${result.testCase.articleType.toUpperCase()}: "${result.testCase.topic}"`);
    console.log('━'.repeat(80));

    if (result.error) {
      console.log(`  ❌ ERROR: ${result.error}`);
      continue;
    }

    if (!result.analysis) continue;

    const a = result.analysis;

    // Save HTML
    const filename = `${result.testCase.articleType}.html`;
    writeFileSync(`./test-output/${filename}`, result.html, 'utf-8');

    console.log(`  H1: "${a.h1}"`);
    console.log(`  Word Count: ${a.wordCount}`);
    console.log(`  Overview: ${a.overviewExcerpt}`);
    console.log(`  Sections (${a.sections.length}):`);
    a.sections.forEach((s: any, i: number) => {
      console.log(`    ${i + 1}. "${s.h2}" (${s.wordCount}w)`);
      console.log(`       ${s.excerpt}`);
    });
    console.log(`  Closing H2: "${a.closingH2}"`);
    console.log(`  Closing: ${a.closingExcerpt}`);
    console.log(`  TOC matches H2s: ${a.tocMatch ? '✓ YES' : '✗ NO'}`);
    if (!a.tocMatch) {
      console.log(`    TOC entries not found in H2s: ${JSON.stringify(a.tocMismatchItems)}`);
      console.log(`    TOC: ${JSON.stringify(a.tocItems)}`);
      console.log(`    All H2s: ${JSON.stringify(a.allH2s)}`);
    }
    console.log(`  Meta Title: "${a.metaTitle}" (${a.metaTitleLength} chars)`);
    console.log(`  Meta Desc: "${a.metaDesc}" (${a.metaDescLength} chars)`);

    // Coherence checks
    const issues: string[] = [];

    // Check closing H2 connects to H1
    const h1Words = new Set(a.h1.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
    const closingWords = a.closingH2.toLowerCase().split(/\s+/);
    const sharedWords = closingWords.filter((w: string) => h1Words.has(w));
    if (sharedWords.length === 0) {
      issues.push(`Closing H2 shares no significant words with H1`);
    }

    // Check variation format
    const variation = result.testCase.variation;
    if (variation === 'question') {
      if (!a.h1.endsWith('?')) issues.push('H1 should end with ? for question variation');
      a.sections.forEach((s: any, i: number) => {
        if (!s.h2.endsWith('?')) issues.push(`H2 #${i + 1} should end with ? for question variation`);
      });
      if (!a.closingH2.endsWith('?')) issues.push('Closing H2 should end with ? for question variation');
    } else if (variation === 'listicle') {
      a.sections.forEach((s: any, i: number) => {
        if (!/^\d+[\.\)]?\s/.test(s.h2)) issues.push(`H2 #${i + 1} "${s.h2}" should start with a number for listicle variation`);
      });
    } else if (variation === 'statement') {
      if (a.h1.endsWith('?')) issues.push('H1 should NOT end with ? for statement variation');
      a.sections.forEach((s: any, i: number) => {
        if (s.h2.endsWith('?')) issues.push(`H2 #${i + 1} should NOT end with ? for statement variation`);
      });
      if (a.closingH2.endsWith('?')) issues.push('Closing H2 should NOT end with ? for statement variation');
    }

    if (issues.length > 0) {
      console.log(`  ⚠️ ISSUES (${issues.length}):`);
      issues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log(`  ✓ No coherence issues detected`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

runAllTests().catch(console.error);
