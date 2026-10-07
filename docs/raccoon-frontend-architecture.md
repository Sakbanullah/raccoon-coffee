# Raccoon Coffee — Frontend Architecture

**Status:** Source of Truth  
**Scope:** Frontend website architecture, UX direction, visual system, and implementation boundaries  
**Database source of truth:** `docs/raccoon-database-architecture.md`

## 1. Product Vision

Raccoon Coffee is a modern coffee-shop website designed to communicate more than a menu. The website should communicate coffee, atmosphere, place, community, stories, events, and everyday moments.

The website is **not an e-commerce application**.

Do not introduce cart, checkout, payment, online ordering, wishlist, customer accounts, reviews, or comments unless explicitly requested later.

## 2. Core Experience

Primary homepage hierarchy:

1. Navigation
2. Hero
3. Brand Introduction
4. Featured Menu
5. Story
6. Atmosphere
7. Events
8. Raccoon Wall
9. Location
10. Footer

## 3. Visual Direction

The visual language should be premium, warm, modern, cozy, editorial, contemporary, slightly artistic, grounded, and photographic.

Target balance:
- 70% premium modern website
- 20% coffee/community identity
- 10% editorial/luxury character

Avoid generic AI-generated SaaS UI.

### Color Direction

- deep navy
- warm off-white / cream
- muted green
- coffee brown
- restrained warm/gold accent

Use colors with restraint.

### Typography

Use strong editorial hierarchy:
- expressive display typography for important headings
- readable body typography
- restrained metadata typography

Avoid excessive font combinations.

## 4. Design Principles

### Photography First

Raccoon is a physical place. Real photography should eventually carry much of the visual identity: coffee, people, interior, exterior, food, events, and community moments.

Do not compensate for missing photography with excessive gradients, glassmorphism, or decorative UI.

### Editorial Rhythm

Alternate between large visual moments, concise text, structured content, immersive sections, and whitespace. Avoid stacking identical cards throughout the page.

### Human Atmosphere

The site should feel lived-in and communicate people gathering, conversations, coffee breaks, events, and shared moments.

## 5. Responsive Design

Support mobile, tablet, desktop, and large desktop intentionally. Do not simply scale down desktop.

Priorities:
1. readable typography
2. usable navigation
3. clear CTAs
4. controlled image cropping
5. comfortable spacing
6. mobile performance

## 6. Homepage Sections

### Navigation

Support Raccoon Coffee wordmark/logo, primary navigation, mobile navigation, hero overlay state when appropriate, and readable sticky/solid state after scrolling.

### Hero

Immediately communicate Raccoon identity. Support a strong headline, short supporting statement, primary CTA, secondary CTA, and large visual/media area. Architecture must allow real photography/video later.

### Brand Introduction

Explain what Raccoon is and establish emotional context. Keep copy concise and editorial.

### Featured Menu

Show a curated selection rather than the entire menu. Support name, description, price, image, and category. Eventually consume `Product` and `ProductCategory`.

### Story

Editorial storytelling section with image, title, content, and CTA. Eventually consumes `Story`.

### Atmosphere

Immersive visual section showing the physical Raccoon experience. Combine large photography, secondary imagery, concise copy, and location/context. Avoid generic card grids.

### Events

Preview events with title, date, time, description, image, and CTA. Eventually consumes `Event`.

### Raccoon Wall

Community photo gallery. Visitors can share photos without creating an account. Submissions are moderated before becoming public. Public gallery exposes approved content. Uploads should be optimized and image binaries are not stored in MariaDB.

Initial implementation may use mock data.

### Location

Communicate branch location, address, opening hours, map/location context, and directions CTA. Current architecture supports future multiple branches through `Branch`.

### Footer

Include brand, short description, navigation, social links, address, opening hours, and copyright.

## 7. Component Architecture

Expected high-level structure:

```text
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── navigation/
│   ├── home/
│   └── ui/
├── lib/
├── types/
├── public/
└── ...
```

Suggested homepage components:

```text
components/
├── navigation/
│   ├── Navbar
│   └── MobileNav
├── home/
│   ├── Hero
│   ├── BrandIntro
│   ├── FeaturedMenu
│   ├── StorySection
│   ├── Atmosphere
│   ├── EventsPreview
│   ├── RaccoonWallPreview
│   ├── LocationSection
│   └── Footer
└── ui/
```

Do not create excessive micro-components. Component boundaries should follow meaningful UI responsibilities.

## 8. Backend Boundary

Frontend must not access Prisma directly.

```text
Frontend
   ↓
HTTP API
   ↓
NestJS Backend
   ↓
Prisma
   ↓
MariaDB
```

Frontend must never contain Prisma Client, `DATABASE_URL`, database credentials, or direct database queries.

## 9. Data Mapping

| Frontend | Backend |
|---|---|
| Menu categories | ProductCategory |
| Menu items | Product |
| Brand stories | Story |
| Events | Event |
| Location | Branch |
| Raccoon Wall | PhotoUpload |
| Admin functionality | Admin |

Do not create frontend entities that contradict the backend architecture.

## 10. Mock Data

During prototype development, mock data is allowed. Keep it centralized, preferably in `frontend/lib/mock-data.ts` or an equivalent dedicated module. Mock shapes should resemble eventual backend data where practical.

## 11. Animation Principles

Animation should enhance atmosphere, not become the product.

Preferred:
- subtle entrance transitions
- image reveals
- hover transitions
- justified scroll-based movement
- smooth navigation transitions

Avoid excessive motion, heavy animation libraries without need, and animation that harms readability or mobile performance.

## 12. Images and Assets

Do not download random copyrighted stock imagery.

Until official Raccoon assets are available, use placeholders, local temporary assets, or neutral image blocks.

Production image strategy:
- optimized images
- WebP/AVIF where appropriate
- responsive image sizes
- lazy loading for non-critical images
- thumbnails for gallery content

Never store image binaries in MariaDB.

## 13. Performance Principles

Keep the frontend lightweight:
- minimize unnecessary JavaScript
- prefer server rendering where appropriate
- lazy-load non-critical images
- avoid unnecessary dependencies
- avoid unbounded lists
- paginate galleries
- avoid loading full-resolution images when thumbnails are sufficient

Do not introduce caching infrastructure prematurely.

## 14. Accessibility

Use semantic HTML, keyboard navigation, visible focus states, sufficient contrast, meaningful alt text, accessible buttons/links, and mobile-friendly touch targets.

## 15. SEO

Support meaningful page titles, metadata, semantic headings, descriptive URLs, and Open Graph metadata where appropriate.

## 16. Current Scope

### Phase 1
Frontend foundation.

### Phase 2
Homepage structure and responsive composition.

### Phase 3
Visual identity, photography treatment, typography, and animation.

### Phase 4
Backend API integration.

### Phase 5
Raccoon Wall upload and moderation flow.

### Phase 6
Admin functionality.

### Phase 7
Production optimization and deployment.

Do not skip ahead unnecessarily.

## 17. Explicitly Out of Scope

Unless explicitly requested later, do not implement:
- customer authentication
- customer accounts
- e-commerce
- shopping cart
- checkout
- payment
- online ordering
- reviews
- comments
- wishlist
- unnecessary CMS infrastructure
- unnecessary analytics infrastructure
- unnecessary state-management frameworks
- unnecessary monorepo tooling

## 18. Temporary Files Rule

Any one-off development artifact, debugging script, manual verification script, temporary experiment, or temporary generated artifact must be placed under:

```text
temporary/
```

Do not leave temporary files scattered across the project root, `frontend/`, or `backend/`.

Permanent automated tests remain in their proper test directories.

## 19. Source-of-Truth Rule

This document is the frontend source of truth.

When implementing frontend features:
1. Read this document first.
2. Preserve its architectural decisions.
3. Do not introduce conflicting patterns without a clear reason.
4. If a future requirement conflicts with this document, update the source of truth deliberately before implementing the change.

Database decisions remain governed by:

```text
docs/raccoon-database-architecture.md
```

## 20. Definition of Done for Frontend Work

A frontend task is complete only when:
- TypeScript has no errors
- ESLint has no errors/warnings unless explicitly justified
- responsive behavior is considered
- accessibility basics are respected
- no unnecessary dependencies were introduced
- no temporary artifacts are left outside `temporary/`
- backend/database architecture remains untouched unless integration explicitly requires it
- implementation follows this source of truth
