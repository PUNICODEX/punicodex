# PuniCodex — Website Design System
## Enterprise-Grade Digital Experience Specification

---

## 1. OVERVIEW

This document defines the complete visual system for the PuniCodex website — a $50M-grade enterprise digital experience built around the Unicode Pantheon of 26 domains across 23 classical deities.

**Core principle:** The website is a dark, gold-accented gallery where the deity mascots are the art and PuniCodex is the frame. Every element exists to elevate the collection, not compete with it.

---

## 2. COLOR APPLICATION

### Primary Web Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | #0A0A0A | Page backgrounds, nav, footer |
| `--bg-secondary` | #1A1A1A | Cards, modals, elevated surfaces |
| `--bg-tertiary` | #2A2A2A | Hover states, active elements |
| `--text-primary` | #F5F5F5 | Headlines, body copy |
| `--text-secondary` | #A0A0A0 | Captions, metadata |
| `--accent-gold` | #D4AF37 | Primary accent — CTAs, accents, icons |
| `--accent-gold-hover` | #E8C547 | Hover state for gold elements |
| `--accent-blue` | #4169E1 | Electric glow, special highlights |
| `--border-subtle` | rgba(212,175,55,0.15) | Card borders, dividers |
| `--border-active` | rgba(212,175,55,0.4) | Active/focus borders |

### Deity Color Integration
Each deity page inherits its primary color from the identity system. These colors appear as:
- Hero section ambient glow
- Card border accents
- Button hover tints
- Progress indicators

---

## 3. TYPOGRAPHY SCALE

### Root: 16px (1rem)

| Token | Size | Line Height | Letter Spacing | Font | Weight | Usage |
|-------|------|-------------|----------------|------|--------|-------|
| `display-xl` | 96px | 1.0 | -0.02em | Cormorant Garamond | 600 | Hero headlines |
| `display-lg` | 64px | 1.05 | -0.01em | Cormorant Garamond | 600 | Section titles |
| `display-md` | 48px | 1.1 | 0 | Cormorant Garamond | 600 | Page headers |
| `heading-lg` | 32px | 1.2 | +0.02em | Cormorant Garamond | 600 | Subsection titles |
| `heading-md` | 24px | 1.3 | +0.02em | Cormorant Garamond | 400 | Card titles |
| `body-lg` | 18px | 1.6 | +0.01em | Montserrat | 400 | Lead paragraphs |
| `body-md` | 16px | 1.6 | +0.01em | Montserrat | 400 | Body copy |
| `body-sm` | 14px | 1.5 | +0.02em | Montserrat | 400 | Captions, meta |
| `label` | 12px | 1.4 | +0.1em | Montserrat | 600 | Tier badges, tags |
| `nav` | 14px | 1.0 | +0.05em | Montserrat | 400 | Navigation links |

### Responsive Scale (Mobile < 768px)
- `display-xl`: 96px → 48px
- `display-lg`: 64px → 36px
- `display-md`: 48px → 28px
- All other tokens reduce by 1-2px

---

## 4. SPACING SYSTEM

### Base Unit: 8px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 8px | Tight gaps, icon padding |
| `space-2` | 16px | Default element gap |
| `space-3` | 24px | Card internal padding |
| `space-4` | 32px | Section internal spacing |
| `space-5` | 48px | Between subsections |
| `space-6` | 64px | Section vertical padding |
| `space-7` | 96px | Major section breaks |
| `space-8` | 128px | Hero spacing |

### Container
- Max width: 1440px
- Side padding: 64px (desktop), 24px (mobile)
- Centered with auto margins

---

## 5. GRID SYSTEM

### Desktop (≥1024px)
- 12-column grid
- Column gap: 24px
- Deity grid: 6 columns (4 rows)

### Tablet (768px–1023px)
- 8-column grid
- Deity grid: 4 columns (6 rows)

### Mobile (<768px)
- 4-column grid
- Deity grid: 2 columns (12 rows)
- Single column for content sections

---

## 6. COMPONENT SPECIFICATIONS

### 6.1 Navigation Bar
**Files:** `nav_dark.png`, `nav_light.png`

| Property | Dark Variant | Light Variant |
|----------|-------------|---------------|
| Background | #0A0A0A | #FFFFFF |
| Height | 72px | 72px |
| Wordmark color | #F5F5F5 | #1A1A1A |
| Link color | #A0A0A0 | #666666 |
| Link hover | #D4AF37 | #D4AF37 |
| CTA button | Gold fill, dark text | Dark fill, gold text |
| Bottom border | 1px rgba(212,175,55,0.15) | 1px rgba(0,0,0,0.08) |
| Position | Fixed top | Fixed top |
| Z-index | 100 | 100 |

**Mobile (<768px):** Hamburger icon left, wordmark center. Menu slides from right as full-screen overlay.

### 6.2 Hero Section
**Files:** `hero_full.png`, `hero_split.png`

**Full Hero:**
- Height: 100vh
- Background: #0A0A0A with subtle constellation SVG
- Psi icon: 120px, centered, gold with blue glow
- PuniCodex: display-xl, gold, centered
- Tagline: heading-lg, gold, below name
- CTA: Gold outlined button, below tagline
- Animation: Psi pulses, particles float, letters appear sequentially

**Split Hero:**
- Height: 90vh
- Left 50%: Wordmark + description + CTA
- Right 50%: 2×3 deity portrait grid in golden frames
- Divider: Thin gold vertical line at 50%

### 6.3 Deity Card
**File:** `deity_card.png`

| Property | Value |
|----------|-------|
| Background | #1A1A1A |
| Border radius | 12px |
| Border | 1px rgba(212,175,55,0.15) |
| Padding | 24px |
| Portrait | 120px circle, gold frame (2px) |
| Deity name | heading-md, gold |
| Domain | body-sm, #A0A0A0 |
| Tier badge | label, gold on #2A2A2A, 4px radius |
| Hover | Border glows gold, portrait scales 1.05 |

### 6.4 Deity Grid
**File:** `deity_grid.png`

- Background: #0A0A0A
- Grid: 6 columns desktop, 4 tablet, 2 mobile
- Gap: 24px
- Constellation lines: SVG overlay connecting related deities
- Section title: display-lg, gold, centered above grid

### 6.5 Tier Explainer
**File:** `tier_explainer.png`

- Three columns: Tier 1 | Tier 2 | Old Norse
- Column headers: heading-lg, respective colors (gold, silver, blue)
- Example names: body-md, with correct accents highlighted
- Connecting lines: Gold SVG showing relationships
- Legend: body-sm, explaining the accent system

### 6.6 CTA Section
**File:** `cta_section.png`

- Background: #0A0A0A with gold particles
- Headline: display-lg, gold, centered
- Subtext: body-lg, #A0A0A0, centered
- Button: Gold outlined, heading-md size, hover fills gold
- Top/bottom: 2px gold horizontal rules

### 6.7 Email Capture Modal
**File:** `email_capture.png`

- Overlay: rgba(0,0,0,0.7)
- Modal: 480px wide, #1A1A1A, 12px radius
- Border: 1px #D4AF37
- Psi icon: 48px, centered top
- Headline: heading-lg, gold
- Input: Bottom-border-only gold, #0A0A0A background
- Submit: Gold fill button
- Close: X icon, top-right, white

### 6.8 Footer
**File:** `footer.png`

- Background: #0A0A0A
- Top border: 1px rgba(212,175,55,0.15)
- 4 columns: Brand | Explore | Resources | Connect
- Padding: space-6 vertical
- Copyright: body-sm, #666666, centered bottom

### 6.9 Loading Screen
**File:** `loading_screen.png`

- Background: #0A0A0A
- Psi icon: Centered, pulsing gold glow
- PuniCodex: Letters appear sequentially (stagger 100ms)
- Accent on U: Appears last with a flash
- Progress: Thin gold line extends from center
- Constellation: Forms in background during load

### 6.10 404 Page
**File:`page_404.png`

- Background: #0A0A0A with broken constellation lines
- Psi icon: Tilted, fallen over, gold
- 404: display-xl, gold
- Message: heading-md, gold — "This deity is not in our pantheon"
- Subtext: body-md, #A0A0A0
- CTA: Gold outlined button — "Return to Pantheon"

### 6.11 Domain Hover State
**File:** `domain_hover.png`

- Trigger: Mouse enters deity card
- Effects:
  - Card border: rgba(212,175,55,0.15) → rgba(212,175,55,0.6)
  - Golden aura: 0 0 30px rgba(212,175,55,0.3)
  - Portrait: scale(1.05), 200ms ease
  - Domain text: Appears below name in gold
  - Copy icon: Appears next to domain
  - Tier badge: Background brightens
- Transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)

---

## 7. PAGE SPECIFICATIONS

### 7.1 Homepage
**File:** `homepage.png`

**Structure (top to bottom):**
1. Nav (dark, fixed)
2. Hero Full (100vh)
3. Spacer (space-7)
4. Deity Grid (auto height)
5. Spacer (space-7)
6. Tier Explainer (auto height)
7. Spacer (space-7)
8. CTA Section (50vh)
9. Footer

**Scroll behavior:** Smooth scroll with snap points at each major section.

### 7.2 About Page
**File:** `about.png`

**Structure:**
1. Nav (dark, fixed)
2. Page header: "ORIGINS" in display-lg, gold
3. Section: The Beginning ($600 story)
4. Section: The Philosophy (tier system explanation)
5. Section: The Collection (8 key deities mini-grid)
6. Section: The Vision (future roadmap)
7. Footer

### 7.3 Deity Landing Page (Template)
**File:** `deity_landing.png`

**Structure:**
1. Nav (dark, fixed)
2. Hero split: Mascot left (50%), Name + domain + tier right (50%)
3. Lore section: Greek mythology + domain significance
4. Brand assets: Logomark + Lockup displayed
5. Color palette: Deity's 3-color system
6. Related deities: 3-4 linked deity cards
7. CTA: "Explore More Deities"
8. Footer

**Dynamic content:** All content changes based on which deity's domain is accessed. The template is the same; only the data changes.

### 7.4 Contact Page
**File:** `contact.png`

**Structure:**
1. Nav (dark, fixed)
2. Psi icon + PuniCodex centered
3. Gold horizontal rule
4. Two-column: Form (left) | Contact info (right)
5. Footer

**Form fields:** Name, Email, Message (textarea)
**Submit:** Gold button, "Send Message"

---

## 8. MOBILE SPECIFICATIONS

### 8.1 Mobile Home
**File:** `mobile_home.png`

- Single column layout
- Nav: Hamburger + wordmark
- Hero: Stacked (icon above, text below)
- Deity grid: 2 columns, scrollable
- Tier explainer: Stacked blocks
- CTA: Full-width button
- Footer: Collapsed to 2 columns

### 8.2 Mobile Nav Overlay
**File:** `mobile_nav.png`

- Full-screen overlay from right
- Dark semi-transparent background
- Menu items: Large gold uppercase, centered
- Social icons at bottom
- Close: X button top-right

### 8.3 Mobile Deity Page
**File:** `mobile_deity.png`

- Single column, vertical scroll
- Hero: Full-width mascot image
- Name: display-md, centered
- Domain + tier: Below name
- Lore: Full-width text block
- Palette: 3 horizontal swatches
- CTA: Full-width button

---

## 9. ANIMATION SPECIFICATIONS

### Easing
| Name | Value | Usage |
|------|-------|-------|
| `ease-smooth` | cubic-bezier(0.4, 0, 0.2, 1) | All transitions |
| `ease-enter` | cubic-bezier(0, 0, 0.2, 1) | Elements entering view |
| `ease-exit` | cubic-bezier(0.4, 0, 1, 1) | Elements leaving view |
| `ease-bounce` | cubic-bezier(0.34, 1.56, 0.64, 1) | Playful micro-interactions |

### Timing
| Token | Duration | Usage |
|-------|----------|-------|
| `duration-fast` | 150ms | Hover states, button feedback |
| `duration-normal` | 300ms | Page transitions, reveals |
| `duration-slow` | 500ms | Hero animations, major transitions |
| `duration-dramatic` | 800ms | Loading screen, entrance sequences |

### Key Animations
1. **Page load:** Psi pulse → letters appear → constellation forms
2. **Scroll reveal:** Elements fade up 20px as they enter viewport
3. **Deity card hover:** Glow + scale as specified above
4. **Nav scroll:** Background becomes solid after 100px scroll
5. **Button hover:** Border fills gold left-to-right

---

## 10. ASSET INVENTORY

### Components (13 files)
| File | Description |
|------|-------------|
| `nav_dark.png` | Dark navigation bar |
| `nav_light.png` | Light navigation bar |
| `hero_full.png` | Full-screen hero section |
| `hero_split.png` | Split-layout hero section |
| `deity_card.png` | Individual deity card component |
| `deity_grid.png` | Full pantheon grid (24 deities) |
| `tier_explainer.png` | Tier classification diagram |
| `cta_section.png` | Call-to-action section |
| `email_capture.png` | Email subscription modal |
| `footer.png` | Website footer |
| `loading_screen.png` | App loading/splash screen |
| `page_404.png` | 404 error page |
| `domain_hover.png` | Deity card hover interaction |

### Pages (4 files)
| File | Description |
|------|-------------|
| `homepage.png` | Complete homepage mockup |
| `about.png` | About/Origins page |
| `deity_landing.png` | Individual deity page template |
| `contact.png` | Contact page |

### Mobile (3 files)
| File | Description |
|------|-------------|
| `mobile_home.png` | Mobile homepage |
| `mobile_nav.png` | Mobile navigation overlay |
| `mobile_deity.png` | Mobile deity page |

**Total: 20 visual assets**

---

## 11. TECHNICAL NOTES

### Performance
- All images: WebP format with PNG fallback
- Lazy loading: Deity portraits below the fold
- Preload: Hero assets, nav, first 6 deity images
- Constellation lines: SVG (lightweight, scalable)
- Particles: CSS-only where possible, Canvas for hero

### Accessibility
- All deity names include proper Unicode accents in alt text
- Color contrast: Gold on black passes WCAG AA
- Focus states: Gold outline on all interactive elements
- Reduced motion: Disable particles and complex animations

### SEO
- Each deity page: Unique title, meta description, OG image
- Structured data: Organization + CreativeWork for each deity
- Canonical URLs: Accent-preserving forms as canonical

---

*PuniCodex Website Design System v1.0*
*Last updated: 2026-05-27*
