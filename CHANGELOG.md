# Changelog

All notable changes to the SCAI Article Generator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-XX

### Added

#### Core Features
- Real-time article generation with live streaming preview
- Support for 9 article types (Informational, How-To, Affiliate, Product, etc.)
- 3 title variations per article type (Statement, Question, Listicle)
- Component toggle system (required/optional components)
- AI-powered content generation using Google Gemini 2.0 Flash
- AI-powered image generation using Google Imagen 3 with Flux fallback

#### Authentication & Authorization
- Better Auth integration with session-based authentication
- Turso database for user management and quota tracking
- Daily usage quota system (configurable limit)

#### Content Validation
- Comprehensive article validation against SEO standards
- Character limit validation for H1, H2, meta titles
- Word count validation per component type
- Forbidden word detection (content and headings)
- Keyword presence verification
- Validation score with pass/warn/fail indicators
- Fix suggestions for validation issues
- Export blocking for critical issues

#### User Interface
- Modern, responsive design with SCAI brand colors
- Sidebar navigation with collapsible sections
- Real-time generation progress indicators
- View mode toggle (Preview/Code/Validate)
- Dark/Light theme support (system default)
- Mobile-responsive layout

#### Pages
- **Generate**: Main article generation interface
- **Visualize**: Component variation browser
- **Matrix**: Component/article type relationship matrix
- **Guidelines**: Writing guidelines reference
- **Bulk**: CSV-based batch article generation
- **Settings**: User preferences and defaults

#### Performance
- Bundle optimization with `optimizePackageImports`
- Lazy loading for heavy components
- In-memory and localStorage caching utilities
- Performance hooks (debounce, throttle, intersection observer)
- API response caching with Cache-Control headers
- Standalone output for smaller deployments

#### Developer Experience
- TypeScript with strict mode
- Vitest testing framework with coverage
- Unit tests for validation and utility functions
- ESLint configuration
- Comprehensive documentation

### Technical Stack
- Next.js 16 with App Router
- React 19
- Tailwind CSS 3.4
- Radix UI components
- Motion (Framer Motion) for animations
- Drizzle ORM with Turso (LibSQL)
- Better Auth for authentication

---

## [0.9.0] - Pre-release

### Added
- Initial project setup
- Basic article generation
- Component system implementation
- Authentication prototype

---

## Roadmap

### [1.1.0] - Planned
- [ ] History page with generation archive
- [ ] Article templates/presets
- [ ] Advanced SEO analysis
- [ ] Export to multiple formats (Markdown, JSON)

### [1.2.0] - Planned
- [ ] Team collaboration features
- [ ] Custom AI prompt templates
- [ ] A/B title testing
- [ ] Analytics dashboard
