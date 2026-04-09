import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function test() {
  const { orchestrateUnifiedGeneration } = await import('../lib/services/unified-orchestrator');
  const { JSDOM } = await import('jsdom');
  const { writeFileSync, mkdirSync } = await import('fs');

  const mock = async (_p: any) => ({ url: 'https://placehold.co/600x400?text=Placeholder' });

  let html = '', wc = 0;
  console.log('Starting review generation...');

  try {
    const gen = orchestrateUnifiedGeneration(
      'review',
      'MacBook Pro M4',
      'statement',
      1000,
      mock,
      'default',
      'openai',
      'Clean Studio',
      false,
      true,
      true,
    );

    for await (const ev of gen) {
      if (ev.type === 'phase') console.log(`[Phase] ${ev.phase}: ${ev.message}`);
      else if (ev.type === 'complete') { html = ev.html; wc = ev.wordCount; console.log('COMPLETE! Words:', wc); }
      else if (ev.type === 'error') { console.error('ERROR:', ev.error); return; }
    }
  } catch (e: any) {
    console.error('GENERATION FAILED:', e.message);
    console.error(e.stack);
    return;
  }

  if (!html) { console.error('No HTML generated'); return; }

  mkdirSync('./test-output', { recursive: true });
  writeFileSync('./test-output/review.html', html, 'utf-8');
  console.log('Saved to test-output/review.html');

  const doc = new JSDOM(html).window.document;
  console.log('\n--- ANALYSIS ---');
  console.log('H1:', doc.querySelector('h1')?.textContent?.trim());
  console.log('Title:', doc.querySelector('title')?.textContent?.trim());
  console.log('Closing H2:', doc.querySelector('[data-component="scai-closing"] h2')?.textContent?.trim());

  const sections = doc.querySelectorAll('section[data-component="scai-section"]');
  console.log('Sections:', sections.length);
  sections.forEach((s: any, i: number) => console.log(`  H2 ${i+1}: ${s.querySelector('h2')?.textContent?.trim()}`));
}

test().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); });
