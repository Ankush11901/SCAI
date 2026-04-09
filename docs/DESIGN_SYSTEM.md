# SCAI Design System

> Brand identity, color palette, typography, and UI patterns for the SCAI Article Generator

---

## 1. Brand Identity

### 1.1 Brand Essence
- **Personality:** Technical, precise, modern, professional
- **Mood:** Dark, focused, high-contrast
- **Feel:** Like a premium developer tool (VS Code, Linear, Vercel Dashboard)

### 1.2 Design Principles
1. **Clarity** — Information hierarchy is always clear
2. **Focus** — Dark UI keeps attention on content
3. **Precision** — Exact spacing, consistent patterns
4. **Performance** — Fast, responsive, no unnecessary animation

---

## 2. Color Palette

### 2.1 Core Colors

#### Background Scale (Dark to Light)
```css
--scai-page:       #030303;  /* Deepest black - page background */
--scai-card:       #0A0A0A;  /* Card backgrounds */
--scai-surface:    #111111;  /* Elevated surfaces */
--scai-input:      #1A1A1A;  /* Input fields, interactive areas */
```

#### Border Scale
```css
--scai-border:     #222222;  /* Primary borders */
--scai-border-dim: #1A1A1A;  /* Subtle borders */
--scai-border-bright: #333333; /* Hover/focus borders */
```

#### Text Scale
```css
--scai-text:       #FFFFFF;  /* Primary text */
--scai-text-sec:   #A3A3A3;  /* Secondary text */
--scai-text-muted: #666666;  /* Muted/disabled text */
```

#### Brand Colors (Green Gradient)
```css
--scai-brand-1:    #40EDC3;  /* Primary mint/teal - CTAs, active states */
--scai-brand-2:    #7FFBA9;  /* Secondary green - highlights */
--scai-brand-3:    #D3F89A;  /* Accent lime - gradients, accents */
```

### 2.2 Gradients

#### Primary Gradient (Horizontal)
```css
background: linear-gradient(90.72deg, #40EDC3 0%, #7FFBA9 49.62%, #D3F89A 100%);
```
**Usage:** Primary buttons, active tabs, progress indicators, brand moments

#### Secondary Gradient (Diagonal)
```css
background: linear-gradient(125deg, #222222 81.95%, #D3F89A 100%);
```
**Usage:** Subtle card accents, hover states

#### Glow Radial
```css
background: radial-gradient(
  circle, 
  rgba(64,237,195,0.5) 0%, 
  rgba(127,251,169,0.3) 30%, 
  rgba(211,248,154,0.1) 60%, 
  transparent 80%
);
```
**Usage:** Ambient glows behind key elements, hero sections

### 2.3 Shadows

```css
--shadow-glow:  0 0 30px -10px rgba(64, 237, 195, 0.25);
--shadow-card:  0 20px 50px -10px rgba(0, 0, 0, 0.8);
--shadow-modal: 0 0 100px rgba(0, 0, 0, 1);
```

### 2.4 Semantic Colors

```css
--scai-success:  #059669;  /* Green for positive */
--scai-error:    #dc2626;  /* Red for errors */
--scai-warning:  #f59e0b;  /* Amber for warnings */
--scai-info:     #3b82f6;  /* Blue for info */
```

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `display` | 3rem (48px) | 700 | 1.1 | Hero headlines |
| `h1` | 2rem (32px) | 700 | 1.2 | Page titles |
| `h2` | 1.5rem (24px) | 600 | 1.3 | Section headers |
| `h3` | 1.25rem (20px) | 600 | 1.4 | Subsections |
| `body` | 1rem (16px) | 400 | 1.6 | Default text |
| `body-sm` | 0.875rem (14px) | 400 | 1.5 | Secondary text |
| `caption` | 0.75rem (12px) | 500 | 1.4 | Labels, metadata |
| `code` | 0.875rem (14px) | 400 | 1.5 | Code snippets |

### 3.3 Text Colors by Context

| Context | Color | Token |
|---------|-------|-------|
| Primary content | White | `--scai-text` |
| Secondary content | Light gray | `--scai-text-sec` |
| Disabled/muted | Dark gray | `--scai-text-muted` |
| Links/interactive | Brand mint | `--scai-brand-1` |
| Errors | Red | `--scai-error` |

---

## 4. Spacing System

### 4.1 Base Unit
Base unit: `4px`

### 4.2 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps (icon + text) |
| `space-2` | 8px | Compact spacing |
| `space-3` | 12px | Default inner padding |
| `space-4` | 16px | Standard padding |
| `space-5` | 20px | Medium spacing |
| `space-6` | 24px | Section padding |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Extra large |
| `space-12` | 48px | Section margins |
| `space-16` | 64px | Page-level spacing |

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Small elements (badges) |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards |
| `radius-xl` | 16px | Large cards |
| `radius-2xl` | 24px | Modals, panels |
| `radius-3xl` | 32px | Feature cards |
| `radius-full` | 9999px | Pills, avatars |

---

## 6. Component Patterns

### 6.1 Buttons

#### Primary Button
```css
background: linear-gradient(90.72deg, #40EDC3 0%, #7FFBA9 49.62%, #D3F89A 100%);
color: #030303;
font-weight: 600;
padding: 12px 24px;
border-radius: 8px;
border: none;
```

#### Secondary Button
```css
background: #1A1A1A;
color: #FFFFFF;
border: 1px solid #222222;
padding: 12px 24px;
border-radius: 8px;
```
Hover: `border-color: #40EDC3;`

#### Ghost Button
```css
background: transparent;
color: #A3A3A3;
border: none;
padding: 8px 16px;
```
Hover: `color: #FFFFFF; background: #1A1A1A;`

### 6.2 Inputs

```css
background: #1A1A1A;
border: 1px solid #222222;
border-radius: 8px;
padding: 12px 16px;
color: #FFFFFF;
font-size: 14px;
```

Focus state:
```css
border-color: #40EDC3;
box-shadow: 0 0 0 2px rgba(64, 237, 195, 0.1);
outline: none;
```

### 6.3 Cards

```css
background: #0A0A0A;
border: 1px solid #222222;
border-radius: 12px;
padding: 24px;
```

Hover (interactive cards):
```css
border-color: #333333;
box-shadow: 0 0 30px -10px rgba(64, 237, 195, 0.15);
```

### 6.4 Sidebar

```css
width: 256px;
background: #0A0A0A;
border-right: 1px solid #222222;
padding: 24px 16px;
```

#### Sidebar Nav Item (Default)
```css
padding: 10px 16px;
border-radius: 8px;
color: #A3A3A3;
font-size: 14px;
font-weight: 500;
```

#### Sidebar Nav Item (Active)
```css
background: #1A1A1A;
color: #40EDC3;
border: 1px solid #222222;
```

### 6.5 Top Bar

```css
height: 64px;
background: #0A0A0A;
border-bottom: 1px solid #222222;
padding: 0 24px;
display: flex;
align-items: center;
justify-content: space-between;
```

### 6.6 Modal

```css
background: #0A0A0A;
border: 1px solid #222222;
border-radius: 24px;
box-shadow: 0 0 100px rgba(0, 0, 0, 1);
max-width: 600px;
padding: 32px;
```

Overlay:
```css
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(4px);
```

### 6.7 Chat Interface

#### Message Container (User)
```css
background: #1A1A1A;
border-radius: 16px 16px 4px 16px;
padding: 16px 20px;
margin-left: auto;
max-width: 80%;
```

#### Message Container (AI)
```css
background: transparent;
border-left: 2px solid #40EDC3;
padding: 16px 20px;
margin-right: auto;
max-width: 90%;
```

#### Chat Input Area
```css
background: #111111;
border-top: 1px solid #222222;
padding: 16px 24px;
```

#### Chat Input Field
```css
background: #1A1A1A;
border: 1px solid #222222;
border-radius: 12px;
padding: 16px 20px;
resize: none;
min-height: 56px;
```

### 6.8 Loading States

#### Skeleton
```css
background: linear-gradient(
  90deg,
  #1A1A1A 0%,
  #222222 50%,
  #1A1A1A 100%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
border-radius: 4px;
```

#### Typing Indicator
Three dots with staggered `animation-delay`:
```css
.dot {
  width: 8px;
  height: 8px;
  background: #40EDC3;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}
```

#### Image Loading Placeholder
```css
background: #1A1A1A;
display: flex;
align-items: center;
justify-content: center;
aspect-ratio: 16/9;
border-radius: 4px;
```
Shows pulsing camera icon.

---

## 7. Icons

Use Lucide React icons for consistency.

| Context | Icon | Color |
|---------|------|-------|
| Navigation active | Filled variant | `#40EDC3` |
| Navigation default | Outline variant | `#A3A3A3` |
| Actions | Outline | `#FFFFFF` |
| Success | Check | `#059669` |
| Error | X | `#dc2626` |
| Loading | Loader2 (spinning) | `#40EDC3` |

---

## 8. Animation

### 8.1 Timing

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `fast` | 150ms | ease-out | Hovers, micro-interactions |
| `normal` | 200ms | ease-in-out | State changes |
| `slow` | 300ms | ease-in-out | Panel slides, modals |
| `slower` | 500ms | ease-in-out | Page transitions |

### 8.2 Transitions

Default transition for interactive elements:
```css
transition: all 200ms ease-in-out;
```

### 8.3 Keyframes

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 9. Responsive Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

Primary target: Desktop (`lg` and above)
Sidebar collapses on `md` and below.

---

## 10. Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `base` | 0 | Default |
| `dropdown` | 10 | Dropdowns, popovers |
| `sticky` | 20 | Sticky headers |
| `sidebar` | 30 | Sidebar overlay |
| `modal` | 40 | Modal dialogs |
| `tooltip` | 50 | Tooltips |
| `toast` | 60 | Toast notifications |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | SCAI Team | Initial design system |

