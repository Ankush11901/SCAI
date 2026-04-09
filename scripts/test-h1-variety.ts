import dotenv from 'dotenv';

// Load environment variables BEFORE any app imports
dotenv.config({ path: '.env.local' });
dotenv.config();

async function runTest() {
  const { generateH1Only } = await import('../lib/ai/generate');
  const { extractCoreKeywords } = await import('../lib/ai/utils/keyword-extractor');

  // Test configs: [articleType, topic, variation]
  const testConfigs: [string, string, 'statement'][] = [
    ['affiliate', 'best wireless earbuds', 'statement'],
    ['comparison', 'iPhone vs Samsung Galaxy', 'statement'],
    ['review', 'Sony WH-1000XM5 headphones', 'statement'],
    ['local', 'best pizza restaurants in Brooklyn', 'statement'],
    ['commercial', 'premium yoga mat', 'statement'],
  ];

  const NUM_PER_TYPE = 3;

  for (const [articleType, topic, variation] of testConfigs) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TESTING: ${articleType.toUpperCase()} | "${topic}" | ${variation}`);
    console.log('='.repeat(70));

    const collectedH1s: string[] = [];
    const extraction = await extractCoreKeywords(topic);

    for (let i = 1; i <= NUM_PER_TYPE; i++) {
      try {
        const result = await generateH1Only({
          topic,
          primaryKeyword: topic,
          articleType,
          variation,
          h2Count: 4,
          tone: 'professional',
          provider: 'openai',
          coreKeywords: extraction.coreKeywords.length > 0 ? extraction.coreKeywords : undefined,
          previousH1s: collectedH1s.length > 0 ? [...collectedH1s] : undefined,
        });

        collectedH1s.push(result.normalizedH1);
        console.log(`  H1 #${i}: "${result.normalizedH1}"`);
      } catch (error) {
        console.error(`  H1 #${i}: ERROR -`, error instanceof Error ? error.stack : error);
        collectedH1s.push(`(ERROR)`);
      }
    }

    // Check variety
    const starters = collectedH1s.map(h1 => h1.split(' ').slice(0, 2).join(' '));
    const uniqueStarters = new Set(starters);
    const variety = uniqueStarters.size === NUM_PER_TYPE ? 'GOOD' : uniqueStarters.size > 1 ? 'PARTIAL' : 'BAD';
    console.log(`\n  Variety: [${variety}] ${uniqueStarters.size}/${NUM_PER_TYPE} unique opening patterns`);
    console.log(`  Starters: ${starters.map(s => `"${s}..."`).join(', ')}`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('DONE');
  console.log('='.repeat(70));
}

runTest();
