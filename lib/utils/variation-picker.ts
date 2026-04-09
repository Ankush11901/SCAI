/**
 * Variation Picker Utility
 * 
 * This utility selects component variations from variations.ts and provides
 * the HTML template + CSS for the component generators to use.
 * 
 * KEY CHANGE (Jan 2026): Now supports NAMED variation selection to match mockups.
 * When a variationName is provided (e.g., "Clean Studio"), that exact variation
 * is used. Random selection is only a fallback for backwards compatibility.
 * 
 * Instead of LLMs generating their own HTML structure, they should:
 * 1. Get a variation template from this utility (using pickVariation or pickVariationByName)
 * 2. Fill in the content (text, items) while keeping the structure
 * 3. The CSS from the selected variation is collected and added to the final article
 */

import { COMPONENT_VARIATIONS, ComponentVariation } from '@/data/variations'
import type { BaseVariationName } from '@/lib/services/template-hydrator'

export interface SelectedVariation {
  variationIndex: number  // 0-based index of selected variation
  variationLetter: string  // 'a', 'b', 'c', ... (derived from index)
  name: string
  html: string
  css: string
}

// Store selected variations during article generation to collect all CSS
const selectedVariations: Map<string, SelectedVariation> = new Map()

/**
 * Pick a variation by name (preferred method - matches mockup behavior)
 * 
 * @param componentType - Key from COMPONENT_VARIATIONS (e.g., 'instructions', 'toc')
 * @param variationName - Name of the design variation (e.g., 'Clean Studio', 'Dark Elegance')
 * @returns SelectedVariation with template HTML and CSS, or null if not found
 */
export function pickVariationByName(
  componentType: string,
  variationName: BaseVariationName
): SelectedVariation | null {
  const variations = COMPONENT_VARIATIONS[componentType]

  if (!variations || variations.length === 0) {
    console.warn(`No variations found for component type: ${componentType}`)
    return null
  }

  // Find the variation by name
  const index = variations.findIndex(v => v.name === variationName)

  if (index === -1) {
    console.warn(`Variation "${variationName}" not found for component "${componentType}", using first available`)
    // Fallback to first variation if named one not found
    return pickSpecificVariation(componentType, 0)
  }

  const variation = variations[index]
  const letter = index < 26
    ? String.fromCharCode(97 + index)
    : String.fromCharCode(97 + Math.floor(index / 26) - 1) + String.fromCharCode(97 + (index % 26))

  const selected: SelectedVariation = {
    variationIndex: index,
    variationLetter: letter,
    name: variation.name,
    html: variation.html,
    css: variation.css || ''
  }

  // Store for CSS collection
  selectedVariations.set(componentType, selected)

  return selected
}

/**
 * Pick a variation - uses name if provided, otherwise random (for backwards compatibility)
 * 
 * @param componentType - Key from COMPONENT_VARIATIONS
 * @param variationName - Optional: specific variation name to use
 * @returns SelectedVariation with template HTML and CSS
 */
export function pickVariation(
  componentType: string,
  variationName?: BaseVariationName | string
): SelectedVariation | null {
  // If a name is provided, use it
  if (variationName) {
    return pickVariationByName(componentType, variationName as BaseVariationName)
  }

  // Otherwise fall back to random selection
  return pickRandomVariation(componentType)
}

/**
 * Get a random variation for a component type (legacy method)
 * If a variation was already selected for this component type in the current article,
 * return the same variation to ensure consistency throughout the article.
 * @param componentType - Key from COMPONENT_VARIATIONS (e.g., 'instructions', 'toc')
 * @returns SelectedVariation with template HTML and CSS
 */
export function pickRandomVariation(componentType: string): SelectedVariation | null {
  // Check if we already selected a variation for this component type
  // This ensures consistency - same variation used throughout the article
  const existing = selectedVariations.get(componentType)
  if (existing) {
    return existing
  }

  const variations = COMPONENT_VARIATIONS[componentType]

  if (!variations || variations.length === 0) {
    console.warn(`No variations found for component type: ${componentType}`)
    return null
  }

  // Pick random variation from all available options
  const index = Math.floor(Math.random() * variations.length)
  const variation = variations[index]
  // Generate letter: 0='a', 1='b', 2='c', ... 25='z', 26='aa', etc.
  const letter = index < 26
    ? String.fromCharCode(97 + index)  // a-z
    : String.fromCharCode(97 + Math.floor(index / 26) - 1) + String.fromCharCode(97 + (index % 26))  // aa, ab, etc.

  const selected: SelectedVariation = {
    variationIndex: index,
    variationLetter: letter,
    name: variation.name,
    html: variation.html,
    css: variation.css || ''
  }

  // Store for CSS collection and consistency
  selectedVariations.set(componentType, selected)

  return selected
}

/**
 * Get a specific variation (for when you want consistency, e.g., all "A" variations)
 * @param componentType - Key from COMPONENT_VARIATIONS
 * @param variationIndex - 0 for A, 1 for B, 2 for C
 */
export function pickSpecificVariation(componentType: string, variationIndex: number): SelectedVariation | null {
  const variations = COMPONENT_VARIATIONS[componentType]

  if (!variations || variations.length === 0) {
    console.warn(`No variations found for component type: ${componentType}`)
    return null
  }

  const index = Math.min(variationIndex, variations.length - 1)
  const variation = variations[index]
  // Generate letter: 0='a', 1='b', 2='c', ... 25='z', 26='aa', etc.
  const letter = index < 26
    ? String.fromCharCode(97 + index)  // a-z
    : String.fromCharCode(97 + Math.floor(index / 26) - 1) + String.fromCharCode(97 + (index % 26))  // aa, ab, etc.

  const selected: SelectedVariation = {
    variationIndex: index,
    variationLetter: letter,
    name: variation.name,
    html: variation.html,
    css: variation.css || ''
  }

  // Store for CSS collection
  selectedVariations.set(componentType, selected)

  return selected
}

/**
 * Clear stored variations (call at start of new article generation)
 */
export function clearSelectedVariations(): void {
  selectedVariations.clear()
}

/**
 * Get all CSS from selected variations (call after all components are generated)
 * @returns Combined CSS string for all selected variations
 */
export function getSelectedVariationsCSS(): string {
  const cssBlocks: string[] = []

  selectedVariations.forEach((variation, componentType) => {
    if (variation.css) {
      cssBlocks.push(`/* ${componentType} - ${variation.name} */`)
      cssBlocks.push(variation.css)
      cssBlocks.push('')
    }
  })

  return cssBlocks.join('\n')
}

/**
 * Get all selected variations (for debugging/logging)
 */
export function getSelectedVariations(): Map<string, SelectedVariation> {
  return new Map(selectedVariations)
}

/**
 * Check if a component type has variations available
 */
export function hasVariations(componentType: string): boolean {
  return componentType in COMPONENT_VARIATIONS && COMPONENT_VARIATIONS[componentType].length > 0
}

/**
 * Get list of all available component types
 */
export function getAvailableComponentTypes(): string[] {
  return Object.keys(COMPONENT_VARIATIONS)
}

/**
 * Get variation count for a component type
 */
export function getVariationCount(componentType: string): number {
  return COMPONENT_VARIATIONS[componentType]?.length || 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON PARSING UTILITIES FOR LLM RESPONSES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse JSON array from LLM response with fallback
 * Handles responses that may have markdown code blocks or extra text
 * 
 * @param response - Raw LLM response string
 * @param fallbackParser - Function to extract items if JSON parsing fails (can return null)
 * @returns Parsed array of items (always returns array, empty if all parsing fails)
 */
export function parseJsonArrayFromLlm<T = string>(
  response: string,
  fallbackParser?: (text: string) => T[] | null
): T[] {
  try {
    // Try to extract JSON array from response (may have markdown or extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0]
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (e) {
    // JSON parsing failed, try fallback
  }

  // Use fallback parser if provided
  if (fallbackParser) {
    const result = fallbackParser(response)
    if (result && result.length > 0) {
      return result
    }
  }

  // Default fallback: split by newlines, filter short lines
  return response
    .split('\n')
    .map(s => s.replace(/^[\d\.\-\*]+\s*/, '').trim()) // Remove numbering/bullets
    .filter(s => s.length > 5) as T[]
}

/**
 * Parse JSON object from LLM response with fallback
 * Handles responses that may have markdown code blocks or extra text
 * 
 * @param response - Raw LLM response string
 * @param fallbackParser - Function to extract object if JSON parsing fails
 * @returns Parsed object or null
 */
export function parseJsonObjectFromLlm<T extends object>(
  response: string,
  fallbackParser?: (text: string) => T | null
): T | null {
  try {
    // Try to extract JSON object from response (may have markdown or extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/)?.[0]
    if (jsonMatch) {
      return JSON.parse(jsonMatch) as T
    }
  } catch (e) {
    // JSON parsing failed, try fallback
  }

  // Use fallback parser if provided
  if (fallbackParser) {
    return fallbackParser(response)
  }

  return null
}

/**
 * Get selected variations as a serializable array for API response
 * @returns Array of variation info objects for UI display
 */
export function getSelectedVariationsForApi(): Array<{
  component: string
  letter: 'a' | 'b' | 'c'
  name: string
  index: number
}> {
  return Array.from(selectedVariations.entries()).map(([component, variation]) => ({
    component,
    letter: variation.variationLetter as 'a' | 'b' | 'c',
    name: variation.name,
    index: variation.variationIndex
  }))
}
