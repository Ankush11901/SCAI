# Requirements Specification

> Complete functional and technical requirements for SCAI Article Generator

---

## 1. Project Definition

### 1.1 Purpose
Build a demonstration and documentation platform that:
- Visualizes 9 article types and their component structures
- Generates production-quality HTML articles via AI
- Serves as reference for future Python/AWS implementation

### 1.2 Success Criteria
- [ ] All 9 article types viewable with component breakdowns
- [ ] 3 variations per component (WordPress-native styling)
- [ ] Real-time article generation with streaming UI
- [ ] Downloadable HTML output
- [ ] Password-protected access
- [ ] Daily generation quotas enforced
- [ ] Deployable on Vercel

---

## 2. Functional Requirements

### 2.1 Authentication & Access Control

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Password-protected entry page | Must |
| AUTH-02 | Session persistence (browser session) | Must |
| AUTH-03 | Daily generation quota per session | Must |
| AUTH-04 | Rate limiting on API endpoints | Must |
| AUTH-05 | Password configurable via environment variable | Must |

### 2.2 Article Type Visualization

| ID | Requirement | Priority |
|----|-------------|----------|
| VIS-01 | Display all 9 article types in overview | Must |
| VIS-02 | Show universal vs unique components per type | Must |
| VIS-03 | Interactive component matrix view | Must |
| VIS-04 | Required/optional component indicators | Must |
| VIS-05 | Component constraint documentation (char/word limits) | Should |

### 2.3 Component Variations

| ID | Requirement | Priority |
|----|-------------|----------|
| VAR-01 | 3 variations per component type | Must |
| VAR-02 | WordPress-native, blog-appropriate styling | Must |
| VAR-03 | Preview at desktop/tablet/mobile viewports | Should |
| VAR-04 | Full-screen variation modal | Should |
| VAR-05 | Clean HTML structure for SEO crawlers | Must |

### 2.4 Article Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| GEN-01 | Conversational input interface (ChatGPT-style) | Must |
| GEN-02 | Real-time streaming text generation | Must |
| GEN-03 | Live article preview during generation | Must |
| GEN-04 | Loading animations for images | Must |
| GEN-05 | Component enable/disable toggles | Must |
| GEN-06 | Article type selection | Must |
| GEN-07 | No component repositioning (fixed structure) | Must |
| GEN-08 | Auto-include required components | Must |

### 2.5 Image Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| IMG-01 | Google Imagen 3 primary integration | Must |
| IMG-02 | Flux API fallback | Should |
| IMG-03 | No humans in generated images | Must |
| IMG-04 | No text in generated images | Must |
| IMG-05 | Loading placeholder during generation | Must |
| IMG-06 | Appropriate alt text generation | Must |

### 2.6 HTML Export

| ID | Requirement | Priority |
|----|-------------|----------|
| EXP-01 | Download complete HTML file | Must |
| EXP-02 | Embedded CSS (no external dependencies) | Must |
| EXP-03 | `scai-` prefixed class names | Must |
| EXP-04 | `data-component` attributes for structure | Must |
| EXP-05 | Clean, documented HTML output | Must |

---

## 3. Technical Requirements

### 3.1 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 14.x |
| Language | TypeScript | 5.x |
| UI Components | Shadcn/ui | Latest |
| Styling | Tailwind CSS | 3.x |
| AI Content | Google Gemini | 2.0 Flash |
| AI Images | Google Imagen | 3 |
| AI Fallback | Flux | API |
| Hosting | Vercel | Latest |

### 3.2 Performance Requirements

| Metric | Target |
|--------|--------|
| Initial page load | < 2 seconds |
| Time to first content stream | < 1 second |
| Full article generation | < 60 seconds |
| Image generation | < 15 seconds per image |

### 3.3 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |

### 3.4 Security Requirements

| ID | Requirement |
|----|-------------|
| SEC-01 | API keys stored in Vercel secrets (never client-side) |
| SEC-02 | All API routes server-side only |
| SEC-03 | Rate limiting on generation endpoints |
| SEC-04 | Password hashed or environment-protected |

---

## 4. Non-Functional Requirements

### 4.1 Usability
- ChatGPT-familiar interface patterns
- Minimal learning curve
- Mobile-responsive (but desktop-primary)
- Clear visual feedback for all actions

### 4.2 Maintainability
- TypeScript for type safety
- Modular component architecture
- Clear separation of concerns
- Comprehensive inline documentation

### 4.3 Scalability
- Stateless design (no database required for MVP)
- Session-based quota (localStorage + server validation)
- Designed for future Python/AWS migration

---

## 5. Constraints

### 5.1 What We Are NOT Building
- User account system
- Persistent article history
- Database storage
- Component repositioning/reordering
- Custom article structures
- Direct Amazon API integration (demo workarounds only)

### 5.2 Fixed Behaviors
- Article structures follow predefined flows per type
- Components are on/off only (not movable)
- Required components cannot be disabled
- Styling follows WordPress-native aesthetic

---

## 6. Article Types Supported

| # | Article Type | Unique Components |
|---|--------------|-------------------|
| 1 | Affiliate | Product Card, CTA Button |
| 2 | Commercial | Feature List, Pricing Table |
| 3 | Comparison | Comparison Table, Winner Box |
| 4 | How-To | Step List, Materials List |
| 5 | Informational | Key Takeaways, Expert Quote |
| 6 | Listicle | Numbered Items, Quick Summary |
| 7 | Local | Map Embed, Contact Info |
| 8 | Recipe | Ingredients, Instructions, Nutrition |
| 9 | Review | Pros/Cons, Rating Box, Verdict |

---

## 7. Acceptance Criteria

### MVP Launch Checklist
- [ ] Password protection functional
- [ ] All 9 article types visualized
- [ ] At least 3 variations per unique component
- [ ] ChatGPT-style generation interface
- [ ] Real-time streaming works
- [ ] Images generate with loading states
- [ ] HTML download functional
- [ ] Deployed on Vercel
- [ ] Daily quota enforced

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | SCAI Team | Initial requirements |

