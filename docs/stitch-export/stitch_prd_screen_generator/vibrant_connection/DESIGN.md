---
name: Vibrant Connection
colors:
  surface: '#f9f9f9'
  surface-dim: '#F1F1F1'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5b403d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#8f6f6c'
  outline-variant: '#e4beba'
  surface-tint: '#ba1a20'
  primary: '#af101a'
  on-primary: '#ffffff'
  primary-container: '#d32f2f'
  on-primary-container: '#fff2f0'
  inverse-primary: '#ffb3ac'
  secondary: '#5d5e61'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e5'
  on-secondary-container: '#636467'
  tertiary: '#565858'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e7070'
  on-tertiary-container: '#f4f4f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb3ac'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#930010'
  secondary-fixed: '#e2e2e5'
  secondary-fixed-dim: '#c6c6c9'
  on-secondary-fixed: '#1a1c1e'
  on-secondary-fixed-variant: '#454749'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  border-subtle: '#E0E0E0'
  error-vibrant: '#B71C1C'
  text-main: '#1A1C1E'
  text-muted: '#616161'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  stack-sm: 12px
  stack-md: 24px
  card-gap: 16px
  gutter-md: 16px
---

## Brand & Style

This design system is built for a campus networking application that prioritizes clarity, energy, and immediate action. The brand personality is **vibrant, decisive, and trustworthy**, moving away from passive social browsing toward active, intentional connection. 

The chosen style is **Modern Minimalism with High-Contrast Accents**. By utilizing a bold red and clean white palette, the UI creates a high-energy environment that feels both professional and urgent.

- **Minimalism:** Emphasis on whitespace and structural clarity to lower the cognitive cost of finding peers.
- **High-Contrast / Bold:** The primary red is used as a beacon for navigation and key actions, ensuring the interface remains legible and focused.
- **Modern:** Leveraging clean typography and a systematic approach to layout that mirrors modern productivity tools rather than social media feeds.
- **Tone:** Energetic, confident, and functional.

## Colors

The palette is redefined to be a high-impact **Red and White** theme. The primary red is aggressive yet professional, used to drive user intent and highlight active states.

- **Primary (#D32F2F):** The "Action Red." Used for primary buttons, active indicators, and branding elements.
- **Neutral/Surface (#FFFFFF):** A pure white base to maximize contrast and provide a "blank canvas" feel that reduces visual clutter.
- **Secondary (#1A1C1E):** A deep charcoal used for text and high-contrast icons to ensure maximum readability against white and red.
- **Tertiary (#F5F5F5):** A soft light-gray used for secondary containers and background layering to prevent screen fatigue.
- **Semantic Mapping:** All background tokens are remapped to white or near-white, while all primary action tokens now utilize the vibrant red.

## Typography

The typography system maintains a strict hierarchy to differentiate between instructional UI and user-generated data.

1.  **Hanken Grotesk (Headlines & Actions):** Sharp and modern. This is the voice of the brand, appearing in all headers and primary navigation.
2.  **Inter (Body):** The workhorse for long-form text and card descriptions, ensuring legibility at any size.
3.  **JetBrains Mono (System Data):** Used for metadata, status updates, and timestamps. This monospaced font provides a "data-heavy" look that feels reliable and technical.

**Scaling:** For mobile devices, `headline-lg` transitions to `headline-lg-mobile` to ensure titles do not wrap awkwardly on narrow viewport widths.

## Layout & Spacing

This design system employs a **fluid 8px baseline grid** focused on mobile-first interaction.

- **Grid Model:** A fluid grid with 20px side margins on mobile. On larger screens, content is constrained to a max-width of 600px to maintain the "handheld" utility feel.
- **Vertical Rhythm:** Elements are grouped using a "Stack" model. `stack-sm` (12px) is used for internally related content (e.g., a profile name and its university year), while `stack-md` (24px) separates distinct blocks or cards.
- **Reflow Rules:** On tablet and desktop, the single-column intent feed can expand into a 2-column masonry grid to utilize the additional horizontal space without losing the focus of individual cards.

## Elevation & Depth

To match the high-contrast aesthetic, depth is used to create **functional separation** rather than skeuomorphic realism.

- **Tonal Layers:** The primary background is white. Secondary containers (like muted chips or background sections) use a light gray (`tertiary`).
- **Low-Contrast Outlines:** Instead of heavy shadows, components use 1px borders in `border-subtle` (#E0E0E0).
- **Functional Shadows:** Only high-priority interactive elements (Primary Buttons, Active Match Cards) receive a shadow. This is a sharp, low-opacity shadow: `0px 2px 8px rgba(211, 47, 47, 0.15)` for red elements or `0px 4px 12px rgba(0, 0, 0, 0.05)` for white cards.
- **Pressed States:** When a button or card is tapped, it loses its shadow and shifts 1px downward to simulate a physical press.

## Shapes

The design uses a **Rounded (0.5rem base)** shape language. This creates a balance between the precision of a professional tool and the approachability of a social platform.

- **Standard Elements (8px):** Buttons, inputs, and small containers.
- **Large Containers (16px):** Match cards and large modal surfaces use `rounded-lg` to feel softer and more distinct from the screen edge.
- **Utility Elements (Pill):** All tags, chips, and status indicators are fully rounded (pill-shaped) to clearly distinguish them from actionable buttons.

## Components

### Buttons
- **Primary:** Vibrant Red (#D32F2F) background with white Hanken Grotesk text. 
- **Secondary:** White background with a 1px Red border and Red text.
- **Ghost:** No background, Red text. Used for less frequent actions like "Report" or "Archive."

### Cards & Lists
- **Match Cards:** Pure white surface with a 1px `border-subtle`. On hover/active state, the border shifts to the primary red.
- **Lists:** Clean rows separated by 1px `border-subtle`, with 16px vertical padding to ensure large tap targets.

### Inputs & Selection
- **Text Fields:** 48px minimum height. Uses a 1px gray border that turns Red on focus.
- **Selection Toggles:** Circular "Day of the Week" toggles. Unselected: gray outline; Selected: Solid Red background with white text.

### Chips & Tags
- **Data Chips:** `tertiary` light-gray background with `text-muted` text. Pill-shaped.
- **Status Indicators:** Use the primary red for positive/active states (e.g., "Online Now").

### Navigation
- **Bottom Bar:** Pure white background with a subtle top border. Active icons are rendered in primary red with a small 4px red dot indicator below them.