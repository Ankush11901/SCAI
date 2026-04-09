import dotenv from 'dotenv';

// Load environment variables BEFORE any app imports
dotenv.config({ path: '.env.local' });
dotenv.config();

async function runTest() {
  const { JSDOM } = await import('jsdom');
  const { writeFileSync, mkdirSync } = await import('fs');
  const { orchestrateUnifiedGeneration } = await import('../lib/services/unified-orchestrator');

  const topic = 'Marvel Heroes';
  const articleType = 'informational';
  const variation = 'statement';

  console.log('='.repeat(70));
  console.log(`SINGLE ARTICLE TEST: "${topic}"`);
  console.log(`Type: ${articleType} | Variation: ${variation}`);
  console.log('='.repeat(70));

  const mockImageGenerator = async (params: any) => {
    return { url: 'https://placehold.co/600x400?text=Placeholder' };
  };

  let finalHtml = '';
  let finalWordCount = 0;

  try {
    const generator = orchestrateUnifiedGeneration(
      articleType,
      topic,
      variation,
      1000,
      mockImageGenerator,
      'default',
      'openai',
      'Clean Studio',
      false,
      true,
      true,
    );

    console.log('\n[Generation] Starting...\n');

    for await (const event of generator) {
      if (event.type === 'phase') {
        console.log(`  [Phase] ${event.phase}: ${event.message}`);
      } else if (event.type === 'complete') {
        finalHtml = event.html;
        finalWordCount = event.wordCount;
        console.log('\n[Generation] Complete!\n');
      } else if (event.type === 'error') {
        console.error('\n[Generation] ERROR:', event.error);
      }
    }

    if (!finalHtml) {
      console.error('No HTML generated');
      return;
    }

    // Save HTML
    mkdirSync('./test-output', { recursive: true });
    writeFileSync('./test-output/marvel-heroes.html', finalHtml, 'utf-8');
    console.log('HTML saved to: ./test-output/marvel-heroes.html');

    // Parse and analyze
    const dom = new JSDOM(finalHtml);
    const doc = dom.window.document;

    const h1 = doc.querySelector('h1')?.textContent?.trim() || '(no H1)';
    console.log(`\n${'='.repeat(70)}`);
    console.log(`H1: "${h1}"`);
    console.log('='.repeat(70));

    // Overview
    const overview = doc.querySelector('[data-component="scai-overview"]');
    if (overview) {
      const overviewText = overview.textContent?.trim() || '';
      console.log(`\n--- OVERVIEW ---`);
      console.log(overviewText);
    }

    // Each section
    const sections = doc.querySelectorAll('section[data-component="scai-section"], section[id^="section-"]');
    sections.forEach((section: any, i: number) => {
      const h2 = section.querySelector('h2')?.textContent?.trim() || '(no H2)';
      const paragraphs = Array.from(section.querySelectorAll('p.scai-paragraph'));
      const sectionText = paragraphs.map((p: any) => p.textContent?.trim() || '').join('\n\n');
      const wordCount = sectionText.split(/\s+/).filter(Boolean).length;

      console.log(`\n--- SECTION ${i + 1}: "${h2}" (${wordCount} words) ---`);
      console.log(sectionText);
    });

    // Closing section
    const closing = doc.querySelector('[data-component="scai-closing"]');
    if (closing) {
      const closingH2 = closing.querySelector('h2')?.textContent?.trim() || '(no closing H2)';
      const closingText = Array.from(closing.querySelectorAll('p')).map((p: any) => p.textContent?.trim()).join('\n\n');
      console.log(`\n--- CLOSING H2: "${closingH2}" ---`);
      console.log(closingText);
    }

    // TOC analysis
    const toc = doc.querySelector('[data-component="scai-toc"]');
    if (toc) {
      const tocItems = Array.from(toc.querySelectorAll('a')).map((a: any) => a.textContent?.trim());
      const actualH2s = Array.from(doc.querySelectorAll('h2.scai-h2')).map((h: any) => h.textContent?.trim());
      console.log(`\n--- TOC vs ACTUAL H2s ---`);
      console.log('TOC entries:');
      tocItems.forEach((t: any, i: number) => console.log(`  ${i+1}. ${t}`));
      console.log('Actual H2s:');
      actualH2s.forEach((h: any, i: number) => console.log(`  ${i+1}. ${h}`));
      const match = JSON.stringify(tocItems) === JSON.stringify(actualH2s);
      console.log(`TOC matches H2s: ${match ? 'YES ✓' : 'NO ✗'}`);
    }

    // FAQ
    const faq = doc.querySelector('[data-component="scai-faq"]');
    if (faq) {
      const questions = faq.querySelectorAll('h3');
      const answers = faq.querySelectorAll('p');
      console.log(`\n--- FAQ (${questions.length} questions) ---`);
      questions.forEach((q: any, i: number) => {
        const answer = answers[i]?.textContent?.trim() || '';
        console.log(`Q${i + 1}: ${q.textContent?.trim()}`);
        console.log(`A${i + 1}: ${answer}\n`);
      });
    }

    // Meta
    const metaTitle = doc.querySelector('meta[name="title"]')?.getAttribute('content') || '';
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    console.log(`\n--- META ---`);
    console.log(`Title: "${metaTitle}" (${metaTitle.length} chars)`);
    console.log(`Description: "${metaDesc}" (${metaDesc.length} chars)`);
    console.log(`Total Word Count: ${finalWordCount}`);

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

runTest();
