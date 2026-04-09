/**
 * Test: Real-world text avoidance on Flux 2 Dev
 *
 * Uses prompts that simulate what the actual pipeline produces —
 * long, AI-style natural language with constraints buried at the end.
 * Tests whether moving constraints to the FRONT or using JSON helps.
 *
 * Run: npx tsx scripts/test-flux-real-prompts.ts
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
const OUTPUT_DIR = path.join(__dirname, "../test-output/flux-real-prompt-test")

// ─── Simulate a real pipeline prompt (constraints at the END, like our current code) ───

const realPipelinePrompt_ConstraintsAtEnd = `A professional editorial photograph in 16:9 (Wide banner hero) format.

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

Professional quality suitable for a blog article. No watermarks, no text overlays, no date stamps.

CRITICAL CONSTRAINTS:
- Do NOT include any text, words, letters, numbers, signs, labels, logos, watermarks, captions, titles, or any form of writing anywhere in the image.
- Do NOT include unrelated accessories or objects.
- Only include objects that are directly relevant to the prompt subject.`

// ─── Same scene but constraints at the FRONT ───

const realPipelinePrompt_ConstraintsFront = `CRITICAL RULES — THESE OVERRIDE EVERYTHING BELOW:
1. ABSOLUTELY NO TEXT of any kind anywhere in the image: no words, letters, numbers, signs, labels, logos, watermarks, brand names, dashboard text, screen UI, keyboard letters. ALL screens must show only abstract colors or gradients.
2. ABSOLUTELY NO HUMANS: no people, hands, faces, body parts, silhouettes.
3. Only include objects explicitly described below.

---

A professional editorial photograph in 16:9 (Wide banner hero) format.

A modern home office desk with a sleek laptop showing a vibrant colorful abstract gradient on screen (NO text, NO UI, NO dashboard), surrounded by productivity tools including a smartphone with blank screen, wireless mouse, and a leather notebook. The scene takes place in a contemporary home office setting during morning, creating a focused and productive atmosphere.

The main subject is a premium laptop with abstract gradient on screen, captured using center-weighted composition. Notable details include subtle reflections on the glass desk surface, carefully arranged desk accessories, morning light creating depth.

The lighting is soft natural window light, coming from the left with medium intensity. The warm color temperature adds warmth and dimension to the scene.

Shot with a slightly elevated angle, the composition is rule of thirds with desk as hero. The focus draws attention to the laptop and immediate surroundings with medium-shallow depth of field.

Color palette: slate blue, warm grey, white, copper accents, soft green from a small plant with slate blue as the dominant tone. Photorealistic with ultra-high detail.`

// ─── Same scene as JSON ───

const realPipelinePrompt_JSON = JSON.stringify({
  constraints: {
    text: "ABSOLUTELY NO TEXT of any kind anywhere. No words, letters, numbers, signs, labels, logos, watermarks, brand names, dashboard UI, screen text, keyboard letters. ALL screens show ONLY abstract color gradients, NEVER text or UI elements.",
    humans: "ABSOLUTELY NO HUMANS. No people, hands, faces, body parts, silhouettes.",
    objects: "Only objects explicitly listed in subjects array."
  },
  scene: "Modern home office desk with laptop and productivity tools, morning light",
  subjects: [
    {
      description: "Sleek premium laptop, open, screen showing ONLY a smooth abstract colorful gradient with NO text, NO UI, NO dashboard, NO interface elements",
      position: "Center of desk, angled slightly toward viewer"
    },
    {
      description: "Smartphone lying flat with completely blank dark screen",
      position: "Right of laptop"
    },
    {
      description: "Wireless mouse, modern minimalist design, no branding",
      position: "Right side of desk"
    },
    {
      description: "Leather notebook, closed, plain cover with no text or branding",
      position: "Left of laptop"
    },
    {
      description: "Small potted green plant in white ceramic pot",
      position: "Back left corner of desk"
    }
  ],
  style: "Professional editorial photography, photorealistic, ultra-high detail",
  lighting: "Soft natural window light from the left, warm color temperature, medium intensity",
  mood: "Focused, productive, aspirational",
  background: "Contemporary home office, soft focus, clean wall",
  composition: "Slightly elevated angle, rule of thirds, desk as hero",
  camera: {
    angle: "Slightly elevated, 30 degrees",
    lens: "50mm",
    depth_of_field: "Medium-shallow, laptop sharp, edges soft"
  },
  color_palette: ["slate blue", "warm grey", "white", "copper accents", "soft green"]
}, null, 2)

// ─── Second scene: Kitchen with appliances (another text-prone subject) ───

const kitchenPrompt_ConstraintsEnd = `A warm inviting kitchen scene featuring a premium stand mixer in cherry red on a marble countertop, with baking ingredients arranged around it including a bowl of flour, eggs in a ceramic holder, and a bottle of vanilla extract. Fresh herbs in small pots line the windowsill behind. Warm afternoon light streams through the window. Professional food photography, shot on 85mm lens, shallow depth of field.

The overall rendering is photorealistic with high detail. Warm, homey, and aspirational.

=== CRITICAL CONSTRAINTS ===
⚠️ ABSOLUTELY NO HUMANS: No people, hands, faces, fingers, arms, legs, body parts, silhouettes, or shadows of humans.

⚠️ ABSOLUTELY NO TEXT: No words, letters, numbers, signs, labels, logos, watermarks, captions, titles, brand names, or any form of writing anywhere in the image.

Professional quality suitable for a blog article. No watermarks, no text overlays, no date stamps.

CRITICAL CONSTRAINTS:
- Do NOT include any text, words, letters, numbers, signs, labels, logos, watermarks, captions, titles, or any form of writing anywhere in the image.
- Do NOT include unrelated accessories or objects.
- Only include objects that are directly relevant to the prompt subject.`

const kitchenPrompt_ConstraintsFront = `CRITICAL RULES — THESE OVERRIDE EVERYTHING BELOW:
1. ABSOLUTELY NO TEXT anywhere: no words, letters, numbers, brand names, labels on bottles, labels on appliances, measurement markings, logos, writing of any kind on any surface or object.
2. ABSOLUTELY NO HUMANS: no people, hands, body parts.
3. All bottles and appliances must have completely blank, clean surfaces with no labels or markings.

---

A warm inviting kitchen scene featuring a premium stand mixer in cherry red (no brand markings, completely clean surface) on a marble countertop, with baking ingredients arranged around it including a bowl of flour, eggs in a ceramic holder, and a plain glass bottle of vanilla extract (no label). Fresh herbs in small pots line the windowsill behind. Warm afternoon light streams through the window. Professional food photography, shot on 85mm lens, shallow depth of field. Photorealistic with high detail.`

const kitchenPrompt_JSON = JSON.stringify({
  constraints: {
    text: "ABSOLUTELY NO TEXT anywhere. No words, letters, numbers, brand names, labels on bottles or appliances, measurement markings, logos, writing of any kind on any surface or object. All appliances and bottles must have completely blank clean surfaces.",
    humans: "No humans, no hands, no body parts",
    objects: "Only objects listed in subjects"
  },
  scene: "Warm inviting kitchen with baking setup on marble countertop, afternoon light",
  subjects: [
    {
      description: "Premium stand mixer in cherry red, completely clean surface with NO brand name, NO logo, NO markings",
      position: "Center-left of countertop"
    },
    {
      description: "White ceramic bowl filled with flour",
      position: "Right of mixer"
    },
    {
      description: "Eggs in a ceramic egg holder",
      position: "Front right"
    },
    {
      description: "Plain clear glass bottle with amber liquid (vanilla extract), absolutely NO label, NO text on bottle",
      position: "Behind the eggs"
    },
    {
      description: "Small potted fresh herbs (basil, rosemary) in terracotta pots",
      position: "Windowsill in background"
    }
  ],
  style: "Professional food photography, photorealistic, warm and inviting",
  lighting: "Warm afternoon sunlight streaming through window, golden highlights, soft shadows",
  mood: "Homey, warm, aspirational baking scene",
  background: "Kitchen window with soft natural light, slightly blurred",
  camera: {
    angle: "Eye level, slight angle",
    lens: "85mm",
    depth_of_field: "Shallow, mixer sharp, background soft"
  },
  color_palette: ["cherry red", "white marble", "warm golden light", "terracotta", "fresh green herbs"]
}, null, 2)

interface TestVariant {
  name: string
  prompt: string
}

interface TestCase {
  name: string
  variants: TestVariant[]
}

const testCases: TestCase[] = [
  {
    name: "01-office-desk-laptop",
    variants: [
      { name: "A-constraints-at-end", prompt: realPipelinePrompt_ConstraintsAtEnd },
      { name: "B-constraints-at-front", prompt: realPipelinePrompt_ConstraintsFront },
      { name: "C-json", prompt: realPipelinePrompt_JSON },
    ]
  },
  {
    name: "02-kitchen-baking",
    variants: [
      { name: "A-constraints-at-end", prompt: kitchenPrompt_ConstraintsEnd },
      { name: "B-constraints-at-front", prompt: kitchenPrompt_ConstraintsFront },
      { name: "C-json", prompt: kitchenPrompt_JSON },
    ]
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

  console.log("=== Flux 2 Dev: Real Pipeline Prompt Test ===")
  console.log("Testing 3 approaches per scene:")
  console.log("  A) Constraints at END (current pipeline)")
  console.log("  B) Constraints at FRONT")
  console.log("  C) JSON structured prompt")
  console.log(`\nModel: ${MODEL}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`)
    for (const variant of testCase.variants) {
      const fullName = `${testCase.name}-${variant.name}`
      console.log(`  ${variant.name}...`)
      const start = Date.now()
      await generateImage(variant.prompt, fullName)
      console.log(`  (${((Date.now() - start) / 1000).toFixed(1)}s)`)
    }
  }

  console.log(`\n=== Done! Compare images in: ${OUTPUT_DIR} ===`)
  console.log("For each scene, compare A (current) vs B (front) vs C (json)")
  console.log("Look for: text on screens, labels on bottles, brand logos, keyboard letters")
}

main().catch(console.error)
