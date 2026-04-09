# Rules Documentation Index

**Purpose**: Single reference document listing all rule files with their definitions and purposes.

---

## Rule Files Overview

| # | File | Layer | One-Line Definition |
|---|------|-------|---------------------|
| 1 | `component_rules.md` | STRUCTURE | Component taxonomy defining what components exist, their classifications, relationships, data types, and AI content permissions. |
| 2 | `content_rules.md` | LOGIC | Rules governing the generation logic, content flow, quality standards, and safety requirements for all generated text content. |
| 3 | `general_rules.md` | PRESENTATION | Visual layout rules defining where elements appear, structural diagrams, design philosophy, and cross-system alignment requirements. |
| 4 | `programmatic_rules.md` | SYSTEM CONSTRAINTS | System-enforced constraints including fixed values, limits, validation rules, token management, and retry logic that users cannot change. |
| 5 | `user_options.md` | USER CHOICES | All user-configurable settings including article type, toggles, tone/style selections, and input fields available during content generation. |
| 6 | `prompt_rules.md` | AI BEHAVIOR | Instructions and constraints that guide AI model behavior to ensure relevant, consistent, and high-quality content generation. |
| 7 | `image_rules.md` | VISUAL GENERATION | Specifications and constraints for AI-generated images including quality thresholds, aspect ratios, regeneration logic, and content restrictions. |

---

## Layer Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    RULES DOCUMENTATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  USER CHOICES          user_options.md              │
│  (What users control)  - Article type, toggles, settings     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SYSTEM CONSTRAINTS    programmatic_rules.md               │
│  (What system enforces) - Limits, validation, fixed values   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STRUCTURE             component_rules.md                    │
│  (What exists)         - Components, taxonomy, relationships │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LOGIC                 content_rules.md                      │
│  (How content flows)   - Generation, sequencing, quality     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRESENTATION          general_rules.md                      │
│  (Where things appear) - Layout, design, visual hierarchy    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AI BEHAVIOR           prompt_rules.md                       │
│  (How AI behaves)      - Prompting, SEO, context, tokens     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  VISUAL GENERATION     image_rules.md                        │
│  (How images work)     - Quality, ratios, regeneration       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## What Each File Contains

### 1. component_rules.md (STRUCTURE Layer)

| Contains | Does NOT Contain |
|----------|------------------|
| Component names and classifications | Character/word limits |
| Component data types | Colors |
| Parent-child relationships | Generation logic |
| Heading hierarchy rules | User toggles |
| Looping vs non-looping patterns | Validation rules |
| List and table format types | |
| Badge rules | |
| AI content permissions | |
| Component data source matrix | |
| Component validation rules | |

---

### 2. content_rules.md (LOGIC Layer)

| Contains | Does NOT Contain |
|----------|------------------|
| Article generation workflow | Character/word limits |
| Content source rules (LLM vs external) | Colors |
| Header consistency and adaptation | Validation rules |
| Content sequencing per article type | Forbidden phrases |
| Tone and style definitions | User toggles |
| Quality standards | |
| Internal linking guidelines | |
| Content safety rules | |

---

### 3. general_rules.md (PRESENTATION Layer)

| Contains | Does NOT Contain |
|----------|------------------|
| Layout structure diagrams | Color hex codes |
| Image placement positions | Typography values |
| Box component visual treatment | Character limits |
| Table visual layouts | Validation rules |
| Special component layouts | User toggles |
| Design philosophy | |
| System alignment rules | |
| Contradiction test documentation | |

---

### 4. programmatic_rules.md (SYSTEM CONSTRAINTS Layer)

| Contains | Does NOT Contain |
|----------|------------------|
| All character and word limits | Component definitions |
| Character count ranges | Generation logic |
| Color palette (fixed hex codes) | Visual layouts |
| Typography rules | User toggles |
| Approved symbols and emoji restrictions | |
| Forbidden phrases and content rules | |
| SEO validation rules | |
| Token management | |
| AI response validation | |
| Scale processing rules | |
| Retry and fallback logic | |

---

### 5. user_options.md (USER CHOICES Layer)

| Contains | Does NOT Contain |
|----------|------------------|
| Article type selection | Actual constraint values |
| Header type selection | Validation rules |
| Word count input settings | Component definitions |
| Tone and style selection | Visual layouts |
| All ON/OFF toggle settings | |
| Image settings | |
| Interlinking toggle settings | |
| Business information input fields | |
| Export and storage options | |

---

### 6. prompt_rules.md (AI BEHAVIOR Layer)

| Contains | Does NOT Contain |
|----------|------------------|
| SEO-driven prompt rules | Component definitions |
| System/scale-driven prompt rules | Visual layouts |
| Context preservation logic | Character limits |
| Token management rules | User toggles |
| AI response validation criteria | |
| Rule ownership split (SEO vs Engineering) | |

---

### 7. image_rules.md (VISUAL GENERATION Layer)

| Contains | Does NOT Contain |
|----------|------------------|
| Image aspect ratio requirements | Text content rules |
| Image quality thresholds | Component definitions |
| Image regeneration logic | User toggles |
| Multi-step image handling | Character limits |
| Prompt-level image rules | |
| Image style consistency | |
| Image content restrictions | |

---

## Cross-Reference Guide

| If You Need | Go To |
|-------------|-------|
| Character/word limits | `programmatic_rules.md` |
| Component definitions | `component_rules.md` |
| Generation logic | `content_rules.md` |
| Visual layout | `general_rules.md` |
| User settings/toggles | `user_options.md` |
| AI prompting rules | `prompt_rules.md` |
| Image specifications | `image_rules.md` |

---

*Document Type: INDEX - Rules Documentation Overview*
*Last Updated: January 2026*
*Version: 1.0*
