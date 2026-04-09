/**
 * Quick test: Verify the refactored front-constraints work in real pipeline
 *
 * Run: npx tsx scripts/test-flux-front-constraints.ts
 */

import { fal } from "@fal-ai/client"
import * as fs from "fs"
import * as path from "path"

const FAL_KEY = process.env.FAL_KEY
if (!FAL_KEY) {
  console.error("FAL_KEY environment variable is required")
  process.exit(1)
}

fal.config({ credentials: FAL_KEY })

const MODEL = "fal-ai/flux-2"
const OUTPUT_DIR = path.join(__dirname, "../test-output/flux-front-constraints-verify")

// Simulate what the pipeline now does: strip trailing constraints, prepend them

function buildFluxPrompt(incomingPrompt: string): string {
  const strippedPrompt = incomingPrompt
    .replace(/=== CRITICAL CONSTRAINTS ===[\s\S]*$/i, '')
    .replace(/CRITICAL CONSTRAINTS:[\s\S]*$/i, '')
    .replace(/⚠️ ABSOLUTELY NO[\s\S]*$/i, '')
    .trim()

  const constraintsPrefix = `STRICT RULES — APPLY TO THE ENTIRE IMAGE:
1. ABSOLUTELY NO TEXT: No words, letters, numbers, signs, labels, logos, watermarks, brand names, captions, UI elements, keyboard characters, or any form of writing on any surface or screen.
2. ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, body parts, silhouettes, or shadows of humans.
3. NO UNRELATED OBJECTS: No earphones, AirPods, headphones, random electronics, or objects not explicitly described below.
4. All screens must show only abstract colors or gradients — NEVER text, dashboards, or UI.
5. All bottles, appliances, and products must have completely blank surfaces — NO labels, NO brand markings.

---

`

  return constraintsPrefix + strippedPrompt
}

// Simulated prompts from buildNarrativePrompt (with trailing constraints like current code)
const testPrompts = [
  {
    name: "laptop-office",
    prompt: `A professional editorial photograph in 16:9 (Wide banner hero) format.

A modern home office desk with a sleek laptop showing a vibrant analytics dashboard, surrounded by productivity tools including a smartphone, wireless mouse, and a leather notebook. The scene takes place in a contemporary home office setting during morning, creating a focused and productive atmosphere.

The main subject is a premium laptop with analytics on screen, captured using center-weighted composition. Notable details include subtle reflections on the glass desk surface, carefully arranged desk accessories, morning light creating depth.

The lighting is soft natural window light, coming from the left with medium intensity. The warm color temperature adds warmth and dimension to the scene.

Shot with a slightly elevated angle, the composition is rule of thirds with desk as hero. The focus draws attention to the laptop screen and immediate surroundings with medium-shallow depth of field.

Color palette: slate blue, warm grey, white, copper accents, soft green from a small plant with slate blue as the dominant tone. The overall rendering is photorealistic with ultra-high detail.

Additional details: Clean, aspirational workspace that suggests productivity and modern professional life.

Photo-realistic style. Natural textures, true-to-life colors, and physically accurate lighting.

=== CRITICAL CONSTRAINTS ===
⚠️ ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, arms, legs, body parts, silhouettes, or shadows of humans.

⚠️ ABSOLUTELY NO TEXT: No words, letters, numbers, signs, labels, logos, watermarks, captions, titles, brand names, or any form of writing anywhere in the image.

Professional quality suitable for a blog article. No watermarks, no text overlays, no date stamps.`
  },
  {
    name: "kitchen-baking",
    prompt: `A professional editorial photograph in 16:9 format.

A warm inviting kitchen scene featuring a premium stand mixer in cherry red on a marble countertop, with baking ingredients arranged around it including a bowl of flour, eggs in a ceramic holder, and a bottle of vanilla extract. Fresh herbs in small pots line the windowsill behind. Warm afternoon light streams through the window.

The main subject is the cherry red stand mixer, captured using center-weighted composition. Notable details include marble texture, warm light reflections, carefully arranged ingredients.

The lighting is warm afternoon sunlight, coming from window behind with medium-high intensity. The warm golden color temperature adds warmth and dimension to the scene.

Shot with an eye-level angle, the composition is rule of thirds. The focus draws attention to the stand mixer with medium-shallow depth of field.

Color palette: cherry red, white marble, golden light, terracotta, fresh green with cherry red as the dominant tone. The overall rendering is photorealistic with high detail.

Photo-realistic style. Natural textures, true-to-life colors, and physically accurate lighting.

=== CRITICAL CONSTRAINTS ===
⚠️ ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, arms, legs, body parts, silhouettes, or shadows of humans.

⚠️ ABSOLUTELY NO TEXT: No words, letters, numbers, signs, labels, logos, watermarks, captions, titles, brand names, or any form of writing anywhere in the image.

Professional quality suitable for a blog article. No watermarks, no text overlays, no date stamps.`
  },
  {
    name: "coffee-shop-exterior",
    prompt: `A professional architectural photograph in 16:9 format.

A charming European-style coffee shop exterior with warm inviting atmosphere. Large glass windows showing the interior with warm lighting, small outdoor seating area with bistro chairs, potted plants by the entrance. The facade is painted in soft sage green. Cobblestone street in front.

The scene takes place in a European city street during golden hour evening, creating a warm cozy atmosphere.

The main subject is the coffee shop storefront, captured using centered composition.

The lighting is golden hour sunlight, coming from the right with warm intensity. Natural warm color temperature.

Shot with a straight-on angle, the composition highlights the full storefront. Medium depth of field.

Color palette: sage green, warm amber, cobblestone grey, golden light. Photorealistic with high detail.

=== CRITICAL CONSTRAINTS ===
⚠️ ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, arms, legs, body parts, silhouettes, or shadows of humans.

⚠️ ABSOLUTELY NO TEXT: No words, letters, numbers, signs, labels, logos, watermarks, captions, titles, brand names, or any form of writing anywhere in the image.

Professional quality suitable for a blog article. No watermarks, no text overlays, no date stamps.`
  }
]

async function generateImage(prompt: string, name: string): Promise<string | null> {
  try {
    const result = await fal.subscribe(MODEL as string, {
      input: {
        prompt,
        image_size: { width: 1360, height: 768 },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        output_format: "png",
        enable_prompt_expansion: true,
      },
      logs: false,
    }) as { data: { images: { url: string; width: number; height: number }[] }; requestId: string }

    const imageUrl = result.data.images?.[0]?.url
    if (!imageUrl) {
      console.error(`  [${name}] No image in response`)
      return null
    }

    const response = await fetch(imageUrl)
    const buffer = Buffer.from(await response.arrayBuffer())
    const filePath = path.join(OUTPUT_DIR, `${name}.png`)
    fs.writeFileSync(filePath, buffer)
    console.log(`  [${name}] Saved (${(buffer.length / 1024).toFixed(0)}KB)`)
    return filePath
  } catch (error) {
    console.error(`  [${name}] Error:`, error instanceof Error ? error.message : error)
    return null
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log("=== Verify: Front-Constraints Pipeline Refactor ===")
  console.log(`Model: ${MODEL}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  for (const test of testPrompts) {
    console.log(`--- ${test.name} ---`)
    const finalPrompt = buildFluxPrompt(test.prompt)
    console.log(`  Prompt starts with: "${finalPrompt.substring(0, 60)}..."`)
    console.log(`  Prompt length: ${finalPrompt.length} chars`)
    const start = Date.now()
    await generateImage(finalPrompt, test.name)
    console.log(`  (${((Date.now() - start) / 1000).toFixed(1)}s)\n`)
  }

  console.log(`=== Done! Check: ${OUTPUT_DIR} ===`)
}

main().catch(console.error)
