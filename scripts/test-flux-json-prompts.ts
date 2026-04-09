/**
 * Test: Natural Language vs JSON Structured Prompts on Flux 2 Dev
 *
 * Generates the same concepts using both prompt styles to compare quality.
 * Run: npx tsx scripts/test-flux-json-prompts.ts
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
const OUTPUT_DIR = path.join(__dirname, "../test-output/flux-prompt-comparison")

interface TestCase {
  name: string
  naturalLanguage: string
  json: object
}

const testCases: TestCase[] = [
  {
    name: "air-fryer-kitchen",
    naturalLanguage: `A professional product photography shot of a modern stainless steel air fryer on a clean marble kitchen countertop. Warm natural lighting from a window on the left side, creating soft shadows. Fresh vegetables and herbs are arranged nearby. The background shows a blurred modern kitchen with wooden cabinets. Shot with a 85mm lens, f/2.8, shallow depth of field focused on the air fryer. Professional quality, high detail, warm color tones.

CRITICAL CONSTRAINTS:
- Do NOT include any text, words, letters, numbers, signs, labels, logos, watermarks, captions, titles, or any form of writing anywhere in the image.
- Do NOT include any humans, hands, faces, fingers, or body parts.
- Only include objects that are directly relevant to the prompt subject.`,

    json: {
      scene: "Modern stainless steel air fryer on clean marble kitchen countertop with fresh vegetables and herbs arranged nearby",
      subjects: [
        {
          description: "Modern stainless steel air fryer, sleek design, chrome finish",
          position: "Center foreground on marble countertop",
          action: "Stationary, lid closed"
        },
        {
          description: "Fresh vegetables and herbs - cherry tomatoes, basil, rosemary",
          position: "Arranged to the right side of the air fryer"
        }
      ],
      style: "Professional product photography, commercial quality",
      lighting: "Warm natural window light from the left, soft diffused shadows, golden hour warmth",
      mood: "Clean, inviting, professional",
      background: "Blurred modern kitchen with wooden cabinets, soft bokeh",
      composition: "Rule of thirds, air fryer as primary subject",
      camera: {
        angle: "Slightly elevated, 30 degrees",
        lens: "85mm prime",
        depth_of_field: "Shallow, f/2.8, sharp focus on air fryer",
      },
      color_palette: ["warm whites", "stainless steel silver", "natural greens", "marble grey"],
      constraints: "ABSOLUTELY NO TEXT, NO HUMANS, NO LOGOS, NO WATERMARKS. Only objects directly relevant to the scene."
    }
  },
  {
    name: "coffee-morning-scene",
    naturalLanguage: `A cozy morning coffee scene with a ceramic pour-over coffee dripper and a freshly brewed cup of coffee on a rustic wooden table. Steam rises from the cup. Soft morning sunlight streams through sheer curtains, creating warm highlights and gentle shadows. A small potted succulent sits in the background. Shot on a 50mm lens, natural lighting, warm color tones, professional food photography style.

CRITICAL CONSTRAINTS:
- Do NOT include any text, words, letters, numbers, signs, labels, logos, watermarks, captions, titles, or any form of writing anywhere in the image.
- Do NOT include any humans, hands, faces, fingers, or body parts.
- Only include objects that are directly relevant to the prompt subject.`,

    json: {
      scene: "Cozy morning coffee setup on rustic wooden table with pour-over dripper and fresh cup of coffee",
      subjects: [
        {
          description: "Ceramic pour-over coffee dripper, minimalist white design",
          position: "Left of center on wooden table"
        },
        {
          description: "Fresh cup of coffee with visible steam rising",
          position: "Right of center, slightly forward"
        },
        {
          description: "Small potted succulent in terracotta pot",
          position: "Background right, slightly blurred"
        }
      ],
      style: "Professional food photography, editorial quality, warm and inviting",
      lighting: "Soft morning sunlight through sheer curtains, warm highlights, gentle diffused shadows",
      mood: "Cozy, peaceful, intimate morning moment",
      background: "Soft focus interior, sheer curtains with sunlight",
      composition: "Centered, tabletop perspective",
      camera: {
        angle: "Slightly above, 20 degrees",
        lens: "50mm prime",
        depth_of_field: "Medium shallow, focus on coffee cup and steam"
      },
      color_palette: ["warm browns", "cream whites", "soft greens", "golden sunlight"],
      constraints: "ABSOLUTELY NO TEXT, NO HUMANS, NO LOGOS, NO WATERMARKS. Only objects directly relevant to the scene."
    }
  },
  {
    name: "yoga-mat-wellness",
    naturalLanguage: `A serene wellness scene featuring a rolled-up yoga mat in lavender color placed on a light hardwood floor. Around it are wellness accessories: a small stack of smooth river stones, a lit aromatherapy candle, and a sprig of eucalyptus. Soft diffused natural lighting from above. Clean, minimalist composition with plenty of negative space. Professional lifestyle photography, calming pastel color palette.

CRITICAL CONSTRAINTS:
- Do NOT include any text, words, letters, numbers, signs, labels, logos, watermarks, captions, titles, or any form of writing anywhere in the image.
- Do NOT include any humans, hands, faces, fingers, or body parts.
- Only include objects that are directly relevant to the prompt subject.`,

    json: {
      scene: "Serene wellness flat lay on light hardwood floor with yoga mat and accessories",
      subjects: [
        {
          description: "Rolled-up yoga mat in lavender/soft purple color",
          position: "Center left of frame",
          color_palette: ["#B19CD9"]
        },
        {
          description: "Small stack of 3 smooth river stones, grey tones",
          position: "Lower right"
        },
        {
          description: "Lit aromatherapy candle in glass vessel",
          position: "Upper right"
        },
        {
          description: "Fresh sprig of eucalyptus",
          position: "Lower left, partially extending out of frame"
        }
      ],
      style: "Professional lifestyle photography, minimalist, editorial",
      lighting: "Soft diffused natural light from above, even illumination, minimal shadows",
      mood: "Calm, serene, peaceful, zen",
      background: "Light hardwood floor, clean with negative space",
      composition: "Overhead flat lay, balanced with negative space",
      camera: {
        angle: "Directly overhead (flat lay)",
        lens: "35mm",
        depth_of_field: "Deep, everything in focus"
      },
      color_palette: ["lavender #B19CD9", "sage green", "warm grey", "light wood", "cream white"],
      constraints: "ABSOLUTELY NO TEXT, NO HUMANS, NO LOGOS, NO WATERMARKS. Only objects directly relevant to the scene."
    }
  }
]

async function generateImage(prompt: string, name: string): Promise<string | null> {
  try {
    const result = await fal.subscribe(MODEL as string, {
      input: {
        prompt,
        image_size: { width: 1360, height: 768 }, // 16:9 ~1MP
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

    // Download image
    const response = await fetch(imageUrl)
    const buffer = Buffer.from(await response.arrayBuffer())
    const filePath = path.join(OUTPUT_DIR, `${name}.png`)
    fs.writeFileSync(filePath, buffer)
    console.log(`  [${name}] Saved: ${filePath} (${(buffer.length / 1024).toFixed(0)}KB)`)
    return filePath
  } catch (error) {
    console.error(`  [${name}] Error:`, error instanceof Error ? error.message : error)
    return null
  }
}

async function main() {
  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log("=== Flux 2 Dev: Natural Language vs JSON Prompt Comparison ===\n")
  console.log(`Model: ${MODEL}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  for (const testCase of testCases) {
    console.log(`\n--- Test: ${testCase.name} ---`)

    // Natural language
    console.log(`\n  Generating natural language version...`)
    const nlStart = Date.now()
    await generateImage(testCase.naturalLanguage, `${testCase.name}-natural`)
    const nlTime = Date.now() - nlStart
    console.log(`  Natural language took ${(nlTime / 1000).toFixed(1)}s`)

    // JSON
    console.log(`\n  Generating JSON version...`)
    const jsonPrompt = JSON.stringify(testCase.json, null, 2)
    const jsonStart = Date.now()
    await generateImage(jsonPrompt, `${testCase.name}-json`)
    const jsonTime = Date.now() - jsonStart
    console.log(`  JSON took ${(jsonTime / 1000).toFixed(1)}s`)
  }

  console.log(`\n=== Done! Compare images in: ${OUTPUT_DIR} ===`)
  console.log("Each test has two files: *-natural.png and *-json.png")
}

main().catch(console.error)
