---
name: InduTrack KE Design System
colors:
  surface: '#FFFFFF'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4943'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6f7a73'
  outline-variant: '#bec9c1'
  surface-tint: '#046c4d'
  primary: '#00543b'
  on-primary: '#ffffff'
  primary-container: '#0a6e4f'
  on-primary-container: '#98edc6'
  inverse-primary: '#83d7b1'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#10533c'
  on-tertiary: '#ffffff'
  tertiary-container: '#2e6b53'
  on-tertiary-container: '#a9e9cb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ef4cc'
  primary-fixed-dim: '#83d7b1'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#005139'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#b0f0d2'
  tertiary-fixed-dim: '#95d4b6'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#0d513a'
  background: '#F8FAFC'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  primary-hover: '#12A37A'
  primary-subtle: '#ECFDF5'
  accent-hover: '#FCD34D'
  accent-dark: '#B45309'
  border: '#E2E8F0'
  text-main: '#0F172A'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  sidebar-width: 256px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
This design system establishes a high-trust, data-forward environment tailored for the intersection of Kenyan academia and industrial sectors. The aesthetic is defined as **Institutional SaaS**, merging the authoritative clarity of a governmental portal with the high-velocity efficiency of a modern workforce management platform. 

The visual narrative focuses on precision and reliability. It employs a structured layout, disciplined use of whitespace, and a sophisticated "Forest Green" palette that evokes both the Kenyan flag and a sense of professional growth. The style is primarily **Corporate / Modern**, characterized by crisp borders, subtle tonal depth, and a relentless focus on information density without clutter.

## Colors
The palette is rooted in a deep "Forest Green" that serves as the foundation for institutional trust. 

- **Primary & Tertiary:** The darker emerald shades are reserved for structural elements like sidebars and primary navigation, ensuring the content area remains light and focused.
- **Accent:** Amber is used sparingly for high-impact calls to action and critical status indicators, providing a warm contrast to the cool greens.
- **Neutrals:** A slate-based neutral scale ensures that data-heavy interfaces remain legible. Surfaces are strictly white to maintain a clean, "paper-like" professional feel against the off-white background.

## Typography
The system uses **Plus Jakarta Sans** for its modern, approachable yet professional geometric forms. It balances the "SaaS" feel with excellent legibility in complex forms. 

For technical data, such as Student IDs, Reference Codes, and Tracking Numbers, **JetBrains Mono** is utilized to provide a distinct visual anchor for variable data strings. 

Hierarchy is established through weight and color (using the secondary text color for metadata) rather than excessive size changes. All headings should use a tighter letter-spacing to maintain a "premium" feel.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid model**. A permanent 256px sidebar persists on the left, housing the primary navigation and high-level institutional branding.

- **Grid:** Content uses a 12-column fluid grid system within a max-width container of 1280px to prevent line lengths from becoming too long on ultra-wide monitors.
- **Rhythm:** A strict 4px base unit (8, 12, 16, 24, 32...) governs all padding and margins. 
- **Adaptation:** On mobile, the sidebar collapses into a bottom navigation bar or a hamburger drawer, and horizontal margins shrink to 16px to maximize screen real estate for data tables.

## Elevation & Depth
This design system uses a **Low-Contrast Outline** approach combined with **Tonal Layering** to create hierarchy. 

- **Level 0 (Background):** #F8FAFC - The base canvas.
- **Level 1 (Cards/Surface):** White background with a 1px solid #E2E8F0 border and a very subtle shadow (0 1px 3px rgba(0,0,0,0.07)).
- **Level 2 (Modals/Dropdowns):** White background with a more pronounced shadow (0 10px 15px -3px rgba(0,0,0,0.1)) to indicate focus.

Depth is primarily signaled through color shifts in the sidebar (Primary Dark) versus the content area (Surface White), rather than aggressive shadows.

## Shapes
The shape language is refined and varied based on the component's scale:

- **Standard (8px):** Applied to buttons, input fields, and small UI controls. This ensures a modern, "clickable" feel.
- **Large (12px):** Applied to content cards and dashboard widgets, providing a distinct container for information groups.
- **Extra Large (16px):** Reserved for modals and large overlays to soften the "interruption" of the user flow.
- **Pill:** Specifically reserved for Status Badges and Chips to differentiate them from interactive buttons.

## Components

- **Buttons:** Primary buttons use #0A6E4F with white text. Hover states utilize #12A37A with a subtle 2% scale-up micro-animation. Secondary buttons use a transparent background with #E2E8F0 borders.
- **Input Fields:** 8px radius, white surface, #E2E8F0 border. On focus, the border transitions to #0A6E4F with a 2px outer glow of #ECFDF5.
- **Status Pill Badges:** These use the "tint and dot" pattern. For example, "Active" uses #ECFDF5 background, #0A6E4F text, and a small 6px circular dot of #0A6E4F to the left of the label.
- **Cards:** 12px radius, #FFFFFF background, 1px #E2E8F0 border. Headers within cards should have a subtle bottom border to separate the title from content.
- **Data Tables:** High-density, no outer border, only horizontal separators in #E2E8F0. Row hover state uses #F8FAFC.
- **Sidebar Nav:** Uses #064D37 background. Active items use #0A6E4F with a vertical 4px Amber (#F59E0B) indicator on the far left edge.