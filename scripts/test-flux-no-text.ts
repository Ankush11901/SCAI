/**
 * Test: Natural Language vs JSON — Text Avoidance on Flux 2 Dev
 *
 * Generates scenes that naturally contain text (storefronts, packaging, etc.)
 * to test which prompt style better prevents unwanted text in images.
 * Run: npx tsx scripts/test-flux-no-text.ts
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
const OUTPUT_DIR = path.join(__dirname, "../test-output/flux-no-text-test")

interface TestCase {
  name: string
  naturalLanguage: string
  json: object
}

const testCases: TestCase[] = [
  {
    name: "01-coffee-shop-storefront",
    naturalLanguage: `A charming European-style coffee shop exterior with a warm inviting atmosphere. Large glass windows showing the interior, a small outdoor seating area with bistro chairs and a round table, potted plants by the entrance, warm lighting glowing from inside. The facade is painted in a soft sage green color. Evening golden hour lighting. Professional architectural photography, 85mm lens.

CRITICAL CONSTRAINTS:
- ABSOLUTELY NO TEXT of any kind: no shop names, no signs, no menu boards, no writing on windows, no street numbers, no brand names, no letters, no words anywhere in the image.
- No humans, no people, no body parts.
- Only include objects directly relevant to the scene.`,

    json: {
      scene: "Charming European-style coffee shop exterior at golden hour evening",
      subjects: [
        {
          description: "Coffee shop facade painted in soft sage green, large glass windows showing warm interior",
          position: "Center of frame, full storefront visible"
        },
        {
          description: "Small outdoor seating area with two bistro chairs and round metal table",
          position: "Front left of the shop entrance"
        },
        {
          description: "Potted plants and flowers flanking the entrance doorway",
          position: "Both sides of the entrance"
        }
      ],
      style: "Professional architectural photography, editorial quality",
      lighting: "Golden hour evening light, warm glow from interior through windows",
      mood: "Warm, inviting, charming",
      background: "European cobblestone street, soft bokeh",
      camera: {
        angle: "Straight on, slight low angle",
        lens: "85mm",
        depth_of_field: "Medium, shop in sharp focus"
      },
      color_palette: ["sage green", "warm amber", "cobblestone grey", "golden light"],
      constraints: {
        text: "ABSOLUTELY NO TEXT ANYWHERE. No shop names, no signs, no menu boards, no writing on windows, no street numbers, no brand names, no letters, no words, no symbols that resemble text. All signage areas must be blank or purely decorative with no characters.",
        humans: "No humans, no people, no body parts",
        objects: "Only objects directly relevant to the coffee shop exterior"
      }
    }
  },
  {
    name: "02-supplement-bottles",
    naturalLanguage: `Three vitamin supplement bottles arranged on a clean white marble surface. The bottles are amber-colored glass with simple white caps. Around them are scattered fresh oranges, lemons, and green leaves. Clean studio lighting from above, professional product photography. Minimalist composition with soft shadows.

CRITICAL CONSTRAINTS:
- ABSOLUTELY NO TEXT of any kind: no labels on bottles, no brand names, no ingredient lists, no dosage information, no letters, no numbers, no words anywhere in the image. All bottles must have completely blank, clean labels or no labels at all.
- No humans, no people, no body parts.
- Only include objects directly relevant to the scene.`,

    json: {
      scene: "Three vitamin supplement bottles on clean white marble surface with fresh citrus fruits",
      subjects: [
        {
          description: "Three amber glass bottles with simple plain white caps, completely blank with NO labels, NO text, NO writing of any kind on the bottles",
          position: "Center, arranged in a triangle formation"
        },
        {
          description: "Fresh whole oranges and lemons, vibrant colors",
          position: "Scattered around the bottles"
        },
        {
          description: "Fresh green leaves and herb sprigs",
          position: "Interspersed between bottles and fruits"
        }
      ],
      style: "Professional product photography, clean studio shot, commercial quality",
      lighting: "Clean overhead studio softbox lighting, soft even shadows on marble",
      mood: "Fresh, clean, health-oriented, premium",
      background: "White marble surface, clean and minimal",
      composition: "Centered, top-down slight angle",
      camera: {
        angle: "45 degrees from above",
        lens: "50mm macro",
        depth_of_field: "Medium, all bottles in focus"
      },
      color_palette: ["amber glass", "white marble", "orange citrus", "yellow lemon", "fresh green"],
      constraints: {
        text: "ABSOLUTELY NO TEXT ANYWHERE. No labels, no brand names, no ingredient lists, no numbers, no letters, no words, no writing of any kind on bottles or anywhere in the image. Bottles must be completely blank and clean.",
        humans: "No humans, no people, no hands, no body parts",
        objects: "Only objects directly relevant to the supplement/wellness scene"
      }
    }
  },
  {
    name: "03-bookshelf-cozy",
    naturalLanguage: `A cozy reading nook with a rustic wooden bookshelf filled with old leather-bound books. A comfortable armchair with a knitted throw blanket sits beside it. A warm reading lamp casts golden light. A cup of tea on a small side table. The books have plain colored spines with no visible titles or text. Warm, intimate atmosphere with rich earth tones. Professional interior photography.

CRITICAL CONSTRAINTS:
- ABSOLUTELY NO TEXT of any kind: no book titles, no author names, no spine text, no writing anywhere visible on any book cover or spine. All books must have plain, solid-colored spines and covers with zero text.
- No humans, no people, no body parts.
- Only include objects directly relevant to the scene.`,

    json: {
      scene: "Cozy reading nook with rustic wooden bookshelf and comfortable armchair",
      subjects: [
        {
          description: "Rustic wooden bookshelf filled with old leather-bound books. CRITICAL: Every single book must have a completely plain, solid-colored spine with absolutely NO titles, NO author names, NO text of any kind",
          position: "Background, filling upper portion of frame"
        },
        {
          description: "Comfortable upholstered armchair in warm brown leather with knitted cream throw blanket draped over one arm",
          position: "Right side foreground"
        },
        {
          description: "Warm brass reading lamp, turned on, casting golden glow",
          position: "Next to the armchair, upper right"
        },
        {
          description: "Cup of tea on small round wooden side table",
          position: "Beside the armchair, lower right"
        }
      ],
      style: "Professional interior photography, editorial, warm and intimate",
      lighting: "Warm golden reading lamp light mixed with soft ambient light, rich shadows",
      mood: "Cozy, intimate, peaceful, inviting",
      background: "Warm-toned wall, possibly exposed brick or warm plaster",
      camera: {
        angle: "Eye level, slight angle to show depth",
        lens: "35mm",
        depth_of_field: "Medium, armchair sharp, bookshelf slightly soft"
      },
      color_palette: ["rich brown leather", "warm amber", "cream", "deep burgundy", "golden light"],
      constraints: {
        text: "ABSOLUTELY NO TEXT ANYWHERE. No book titles, no author names, no spine text, no writing on any surface, no letters, no numbers, no words visible on any book, sign, or object in the entire image. All book spines must be plain solid colors only.",
        humans: "No humans, no people, no body parts",
        objects: "Only objects directly relevant to the reading nook scene"
      }
    }
  },
  {
    name: "04-street-food-market",
    naturalLanguage: `A vibrant Asian night market food stall with colorful hanging lanterns above. The stall displays various grilled skewers and steaming dumplings in bamboo steamers. Warm lighting from the lanterns creates an inviting glow. The stall has a wooden counter and traditional decorative elements. Evening atmosphere with bokeh lights in the background. Professional food photography.

CRITICAL CONSTRAINTS:
- ABSOLUTELY NO TEXT of any kind: no menu signs, no price tags, no stall names, no writing in any language, no characters, no numbers, no symbols that look like text anywhere in the image.
- No humans, no people, no hands, no body parts.
- Only include objects directly relevant to the scene.`,

    json: {
      scene: "Vibrant Asian night market food stall with hanging lanterns and steaming food displays",
      subjects: [
        {
          description: "Food stall with wooden counter displaying grilled skewers on metal racks",
          position: "Center of frame, counter at lower third"
        },
        {
          description: "Bamboo steamers stacked with steaming dumplings, visible steam rising",
          position: "Left side of the counter"
        },
        {
          description: "Colorful hanging paper lanterns in red, orange, and gold",
          position: "Above the stall, upper portion of frame"
        },
        {
          description: "Traditional decorative elements: wooden carvings, fabric draping",
          position: "Stall frame and backdrop"
        }
      ],
      style: "Professional food and travel photography, editorial quality, vibrant colors",
      lighting: "Warm lantern glow mixed with ambient evening light, warm highlights on food",
      mood: "Vibrant, inviting, atmospheric, cultural",
      background: "Night market atmosphere with bokeh lights from distant stalls",
      camera: {
        angle: "Eye level, looking at the stall straight on",
        lens: "35mm",
        depth_of_field: "Shallow, food in sharp focus, background bokeh"
      },
      color_palette: ["warm red lanterns", "golden amber light", "bamboo natural", "rich food colors"],
      constraints: {
        text: "ABSOLUTELY NO TEXT ANYWHERE. No menu signs, no price tags, no stall names, no writing in any language including Chinese/Japanese/Korean characters, no numbers, no symbols resembling text. All sign areas must be blank or purely decorative with no characters whatsoever.",
        humans: "No humans, no people, no hands, no body parts, no silhouettes",
        objects: "Only objects directly relevant to the food stall scene"
      }
    }
  },
  {
    name: "05-laptop-desk-setup",
    naturalLanguage: `A modern minimalist workspace with an open laptop on a clean white desk. The laptop screen shows a colorful abstract gradient wallpaper with no text or icons. A small potted plant, a ceramic coffee mug, and wireless earbuds sit on the desk. Natural light from a window. Clean Scandinavian interior style. Professional lifestyle photography.

CRITICAL CONSTRAINTS:
- ABSOLUTELY NO TEXT of any kind: no text on laptop screen, no keyboard letters visible, no brand logos, no icons, no UI elements, no words anywhere. The laptop screen must show only an abstract colorful gradient with zero text or interface elements.
- No humans, no people, no body parts.
- Only include objects directly relevant to the scene.`,

    json: {
      scene: "Modern minimalist workspace with open laptop on clean white desk",
      subjects: [
        {
          description: "Slim modern laptop, open, screen showing ONLY a smooth colorful abstract gradient wallpaper with absolutely NO text, NO icons, NO UI elements, NO interface, NO letters, NO brand logo on the device",
          position: "Center of desk, angled slightly"
        },
        {
          description: "Small potted succulent in white ceramic pot",
          position: "Left side of desk"
        },
        {
          description: "Ceramic coffee mug, matte white, no branding",
          position: "Right side, near laptop"
        },
        {
          description: "White wireless earbuds in open case",
          position: "Front right of desk"
        }
      ],
      style: "Professional lifestyle photography, clean Scandinavian minimalist aesthetic",
      lighting: "Natural window light from the left, soft and even, gentle shadows",
      mood: "Clean, focused, calm, productive",
      background: "White wall, minimal Scandinavian interior, perhaps a small shelf",
      camera: {
        angle: "Slightly elevated, looking down at desk at 30 degrees",
        lens: "50mm",
        depth_of_field: "Medium, entire desk in focus"
      },
      color_palette: ["white", "light wood", "soft green from plant", "matte ceramics"],
      constraints: {
        text: "ABSOLUTELY NO TEXT ANYWHERE. No text on laptop screen, no visible keyboard letters, no brand logos, no icons, no UI elements, no words on any object. Laptop screen must show ONLY a smooth abstract gradient. Mug must be plain with no writing.",
        humans: "No humans, no people, no hands, no body parts, no reflections of people",
        objects: "Only objects directly relevant to the minimal desk setup"
      }
    }
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

  console.log("=== Flux 2 Dev: Text Avoidance Test — Natural Language vs JSON ===\n")
  console.log(`Model: ${MODEL}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`)

    console.log(`  Natural language...`)
    const nlStart = Date.now()
    await generateImage(testCase.naturalLanguage, `${testCase.name}-natural`)
    console.log(`  (${((Date.now() - nlStart) / 1000).toFixed(1)}s)`)

    console.log(`  JSON...`)
    const jsonStart = Date.now()
    await generateImage(JSON.stringify(testCase.json, null, 2), `${testCase.name}-json`)
    console.log(`  (${((Date.now() - jsonStart) / 1000).toFixed(1)}s)`)
  }

  console.log(`\n=== Done! Compare images in: ${OUTPUT_DIR} ===`)
  console.log("Look for any text, letters, numbers, signs, labels in each image.")
}

main().catch(console.error)
