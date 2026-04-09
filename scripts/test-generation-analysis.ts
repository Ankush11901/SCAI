import dotenv from 'dotenv';

// Load environment variables BEFORE any app imports
dotenv.config({ path: '.env.local' });
dotenv.config();

async function runTest() {
  // Dynamic imports so env vars are available at module init time
  const { JSDOM } = await import('jsdom');
  const { writeFileSync } = await import('fs');
  const { orchestrateUnifiedGeneration } = await import('../lib/services/unified-orchestrator');
  const { validateArticle } = await import('../lib/services/article-validator');
  const { extractCoreKeywords } = await import('../lib/ai/utils/keyword-extractor');

  const topic = 'Chocolate Chip Cookies';
  const articleType = 'recipe';
  const variation = 'question';

  console.log('='.repeat(70));
  console.log(`GENERATION TEST: "${topic}"`);
  console.log(`Type: ${articleType} | Variation: ${variation}`);
  console.log('='.repeat(70));

  // Mock image generator - returns placeholder immediately
  const mockImageGenerator = async (params: any) => {
    return { url: 'https://placehold.co/600x400?text=Skipped+Image' };
  };

  const NUM_ARTICLES = 1;
  const collectedH1s: string[] = [];

  for (let run = 1; run <= NUM_ARTICLES; run++) {
    console.log(`\n${'#'.repeat(70)}`);
    console.log(`ARTICLE ${run} of ${NUM_ARTICLES}`);
    console.log(`${'#'.repeat(70)}`);

    let finalHtml = '';
    let finalWordCount = 0;

    try {
      const generator = orchestrateUnifiedGeneration(
        articleType,
        topic,
        variation,
        1000, // target word count
        mockImageGenerator,
        'default',
        'openai', // provider
        'Clean Studio', // variation name
        false, // enableKeywordExpansion
        true, // enableAutoCorrection
        true, // skipAltTextValidation
        'scai-20', // affiliateTag
        undefined, // clusterContext
        undefined, // costTrackingInfo
        undefined, // localBusinessInfo
        collectedH1s.length > 0 ? [...collectedH1s] : undefined, // previousH1s
      );

      console.log('\n[Generation] Starting...\n');

      for await (const event of generator) {
        if (event.type === 'phase') {
          console.log(`  [Phase] ${event.phase}: ${event.message}`);
        } else if (event.type === 'component_complete') {
          // Skip verbose component logs
        } else if (event.type === 'complete') {
          finalHtml = event.html;
          finalWordCount = event.wordCount;
          console.log('\n[Generation] Complete!\n');
        } else if (event.type === 'error') {
          console.error('\n[Generation] ERROR:', event.error);
        }
      }

      if (!finalHtml) {
        console.error('No HTML generated for run ' + run);
        continue;
      }

      // Save HTML to file for inspection
      const outputPath = `./test-output/article-${run}.html`;
      writeFileSync(outputPath, finalHtml, 'utf-8');
      console.log(`HTML saved to: ${outputPath}`);

      // Extract H1
      const dom = new JSDOM(finalHtml);
      const doc = dom.window.document;
      const h1 = doc.querySelector('h1')?.textContent?.trim() || '(no H1 found)';
      collectedH1s.push(h1);
      console.log(`\n>>> H1 #${run}: "${h1}" (${h1.length} chars)`);

      // Extract H2s briefly
      const h2s = Array.from(doc.querySelectorAll('h2')).map((h: any) => h.textContent?.trim() || '');
      console.log(`H2s: ${h2s.length} total`);
      h2s.forEach((h2: string, i: number) => {
        console.log(`  ${i + 1}. "${h2}" (${h2.length} chars)`);
      });

      console.log(`Word Count: ${finalWordCount}`);

    } catch (error) {
      console.error(`Fatal error on run ${run}:`, error);
      collectedH1s.push(`(ERROR on run ${run})`);
    }
  }

  // Final H1 comparison
  console.log(`\n${'='.repeat(70)}`);
  console.log('H1 COMPARISON ACROSS ALL ARTICLES');
  console.log('='.repeat(70));
  collectedH1s.forEach((h1, i) => {
    console.log(`  Article ${i + 1}: "${h1}"`);
  });

  // Analyze common starting words/phrases
  console.log(`\n${'='.repeat(70)}`);
  console.log('H1 PATTERN ANALYSIS');
  console.log('='.repeat(70));

  const startingWords = collectedH1s.map(h1 => h1.split(' ').slice(0, 3).join(' '));
  const wordFreq: Record<string, number> = {};
  for (const h1 of collectedH1s) {
    const words = h1.toLowerCase().split(/\s+/);
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  console.log('\nStarting 3 words of each H1:');
  startingWords.forEach((sw, i) => {
    console.log(`  Article ${i + 1}: "${sw}..."`);
  });

  console.log('\nMost common words across all H1s:');
  const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [word, count] of sorted) {
    console.log(`  "${word}" — appeared ${count}/${NUM_ARTICLES} times`);
  }
}

function printValidationReport(result: any) {
  const scoreEmoji = result.score >= 95 ? '[PASS]' : result.score >= 80 ? '[WARN]' : '[FAIL]';
  console.log(`\n${scoreEmoji} COMPLIANCE SCORE: ${result.score}% (${result.totalPassed}/${result.totalRules} passed)\n`);

  console.log('Category Breakdown:');
  console.log('-'.repeat(50));

  for (const category of result.categories) {
    const catScore = category.total > 0 ? Math.round((category.passed / category.total) * 100) : 100;
    const catLabel = catScore === 100 ? 'OK' : catScore >= 80 ? 'WARN' : 'FAIL';
    console.log(`[${catLabel}] ${category.label}: ${category.passed}/${category.total} (${catScore}%)`);

    const issues = category.rules.filter((r: any) => r.status !== 'pass');
    for (const rule of issues) {
      const statusIcon = rule.status === 'fail' ? 'FAIL' : 'WARN';
      console.log(`   [${statusIcon}] ${rule.name}: ${rule.actual} (expected: ${rule.expected})`);
      if (rule.message && rule.message !== rule.name) {
        console.log(`      -> ${rule.message}`);
      }
    }
  }

  if (result.criticalIssues.length > 0) {
    console.log('\nCRITICAL ISSUES:');
    console.log('-'.repeat(50));
    for (const issue of result.criticalIssues) {
      console.log(`  [FAIL] ${issue.name}: ${issue.message}`);
    }
  }

  console.log('\n' + '-'.repeat(50));
  const passCount = result.categories.reduce((sum: number, c: any) => sum + c.rules.filter((r: any) => r.status === 'pass').length, 0);
  const warnCount = result.categories.reduce((sum: number, c: any) => sum + c.rules.filter((r: any) => r.status === 'warn').length, 0);
  const failCount = result.categories.reduce((sum: number, c: any) => sum + c.rules.filter((r: any) => r.status === 'fail').length, 0);

  console.log(`Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  console.log(`Target: 95-100% | Current: ${result.score}% | ${result.score >= 95 ? 'TARGET MET' : 'NEEDS IMPROVEMENT'}`);
}

function analyzeArticle(html: string, wordCount: number, JSDOM: any) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const h1 = doc.querySelector('h1')?.textContent?.trim() || '';
  console.log(`\nH1: "${h1}" (${h1.length} chars)`);

  const h2s = Array.from(doc.querySelectorAll('h2')).map((h: any) => {
    const text = h.textContent?.trim() || '';
    return { text, length: text.length };
  });

  console.log(`\nH2s (${h2s.length} total):`);
  h2s.forEach((h2: any, i: number) => {
    const lengthStatus = h2.length >= 50 && h2.length <= 60 ? 'OK' : 'WARN';
    console.log(`  ${i + 1}. [${lengthStatus}] "${h2.text}" (${h2.length} chars)`);
  });

  const overview = doc.querySelector('[data-component="scai-overview"]');
  if (overview) {
    const paragraphs = overview.querySelectorAll('p');
    const totalText = Array.from(paragraphs).map((p: any) => p.textContent?.trim() || '').join(' ');
    const owc = totalText.split(/\s+/).filter(Boolean).length;
    console.log(`\nOverview: ${paragraphs.length} paragraph(s), ${owc} words`);
    Array.from(paragraphs).forEach((p: any, i: number) => {
      const text = p.textContent?.trim() || '';
      const charStatus = text.length >= 250 && text.length <= 350 ? 'OK' : 'WARN';
      console.log(`  Paragraph ${i + 1}: [${charStatus}] ${text.length} chars`);
    });
  }

  console.log('\nSection Paragraphs:');
  doc.querySelectorAll('section[data-component="scai-section"], section[id^="section-"]').forEach((section: any, i: number) => {
    const paragraphs = section.querySelectorAll('p.scai-paragraph');
    const charCounts = Array.from(paragraphs).map((p: any) => (p.textContent?.trim() || '').length);
    const totalWords = Array.from(paragraphs).map((p: any) => p.textContent?.trim() || '').join(' ').split(/\s+/).filter(Boolean).length;

    const paraStatus = paragraphs.length === 3 ? 'OK' : 'WARN';
    const wordStatus = totalWords >= 135 && totalWords <= 165 ? 'OK' : 'WARN';

    console.log(`  Section ${i + 1}: [${paraStatus}] ${paragraphs.length} para(s), [${wordStatus}] ${totalWords} words`);
    if (paragraphs.length !== 3 || charCounts.some((c: number) => c < 200 || c > 360)) {
      charCounts.forEach((c: number, j: number) => {
        const status = c >= 200 && c <= 360 ? 'OK' : 'WARN';
        console.log(`    Para ${j + 1}: [${status}] ${c} chars`);
      });
    }
  });

  const metaTitle = doc.querySelector('meta[name="title"]')?.getAttribute('content') ||
                   doc.querySelector('title')?.textContent || '';
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  if (metaTitle) {
    const status = metaTitle.length >= 50 && metaTitle.length <= 60 ? 'OK' : 'WARN';
    console.log(`\nMeta Title: [${status}] "${metaTitle}" (${metaTitle.length} chars)`);
  }
  if (metaDesc) {
    const status = metaDesc.length >= 150 && metaDesc.length <= 160 ? 'OK' : 'WARN';
    console.log(`Meta Desc: [${status}] ${metaDesc.length} chars`);
  }

  console.log(`\nTotal Word Count: ${wordCount}`);
}

runTest();
