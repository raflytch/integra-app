# Resik visual system

This is the visual source of truth for `apps/web`. The reference direction is a Heptabase-inspired **sunlit research desk**: calm, compact, document-oriented, and professional. Product interfaces should feel like organized paper and workspace surfaces. Use warm neutrals, Graphite copy, and the INTEGRA teal family taken from the logo (`public/integra-logo.png`). Avoid the look of a generic SaaS dashboard.

## Visual hierarchy and surfaces

The light theme is the default. Eggshell Canvas is the page and primary card surface. Cloud Surface is for muted panels and segmented tracks. Paper Beige is for explanatory insets. Whiteboard Gray is a workspace canvas. Linen Border separates content gently. Standard cards are flat; use borders, spacing, and surface changes before shadows. Keep application density compact.

| Token           | Value     | Use                                         |
| --------------- | --------- | ------------------------------------------- |
| Eggshell Canvas | `#fdfcfb` | Page, navigation, cards, light controls     |
| Cloud Surface   | `#f7f7f7` | Secondary panels and tracks                 |
| Paper Beige     | `#f0f0ea` | Warm inset and feature boxes                |
| Whiteboard Gray | `#eeeded` | Workspace canvas                            |
| Linen Border    | `#e4ded3` | Borders, dividers, outlined badges          |
| Graphite        | `#2e2e2e` | Primary copy, buttons, important icons      |
| Charcoal Copy   | `#454545` | Secondary copy and icons                    |
| Quiet Gray      | `#6a6972` | Metadata and helper text                    |
| Disabled Ash    | `#a8a8a8` | Disabled controls                           |
| Integra Deep    | `#075c59` | Primary buttons, brand wordmark, active nav |
| Integra Teal    | `#048173` | Links, focus ring, references               |
| Integra Mint    | `#39c097` | Small decorative highlights, never text     |
| Integra Wash    | `#e8f5f0` | Selected and active surfaces, icon tiles    |

Primary application actions use Integra Deep; body copy stays Graphite. Use the teal family with restraint: one primary action per area, not a wall of teal buttons, badges, tabs, and icons. The logo gradient lives only in the logo asset; UI surfaces stay flat.

## Typography

Use Plus Jakarta Sans for headings and interface text. Prefer weight 500 for major headings and weights 400, 500, and 600 for body copy and controls. Technical IDs and code use `ui-monospace`. The Next.js font loader provides Plus Jakarta Sans with a system sans-serif fallback. Avoid extra font families and overly heavy headings.

| Role              | Size | Font / weight         | Line height and tracking |
| ----------------- | ---- | --------------------- | ------------------------ |
| Utility           | 12px | Plus Jakarta Sans 400 | 1.5                      |
| Segmented control | 13px | Plus Jakarta Sans 500 | Default                  |
| Caption           | 14px | Plus Jakarta Sans 400 | 1.5                      |
| Body              | 16px | Plus Jakarta Sans 400 | 1.5                      |
| Body strong       | 16px | Plus Jakarta Sans 600 | 1.5                      |
| Card heading      | 20px | Plus Jakarta Sans 500 | Default                  |
| Section heading   | 36px | Plus Jakarta Sans 500 | 1.3, -0.54px             |
| Hero              | 48px | Plus Jakarta Sans 500 | 1.3, -1.584px            |

## Spacing, radius, and elevation

Use a 4px base scale: `4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 52, 60, 64, 80, 128px`. The usual element gap is 8px; compact cards use 16px padding; standard content cards use 24px. Reserve 128px for large public sections, not workspace UI.

| Element                                          | Radius |
| ------------------------------------------------ | ------ |
| Standard cards and images                        | 12px   |
| Feature boxes                                    | 8px    |
| Compact workspace cards, buttons, inputs, badges | 6px    |
| Pills and segmented tracks                       | 9999px |
| Links                                            | 0      |

Standard cards have no shadow. A floating preview may use `0 0 4px rgba(0,0,0,.03), 0 4px 8px rgba(0,0,0,.04), 0 16px 26px rgba(0,0,0,.05)`. A large overlay may use `0 0 0 1px rgba(0,0,0,.04), 0 14px 32px rgba(0,0,0,.10), 0 28px 70px rgba(0,0,0,.14)`. A selected segmented control may use `0 1px 2px rgba(0,0,0,.05)`. Avoid colored or heavy shadows.

## Component recipes

- **Standard content card:** Eggshell background, 12px radius, 24px padding, no shadow, optional `1px rgba(0,0,0,.08)` border. It should read as paper, not a floating tile.
- **Compact workspace card:** `rgba(252,252,252,.5)` background, 6px radius, 16px padding, no shadow, subtle dividers as needed.
- **Paper feature box:** Paper Beige background, 8px radius, `16px 17px` padding for supporting explanation.
- **Primary button:** Integra Deep background, white Plus Jakarta Sans 16px medium or semibold text, 6px radius. Public campaign CTAs may use a pill radius where justified.
- **Outlined button:** Transparent, `1px solid rgba(0,0,0,.13)`, Graphite text, 6px radius, compact padding.
- **Segmented control:** Cloud track and pill radius; Plus Jakarta Sans 13px medium. Selected segment is Eggshell with Integra Deep text and optional tiny shadow; inactive text is Quiet Gray.
- **Editorial link:** Integra Teal text without a pill, gradient, or button treatment. Underline only when needed for affordance.
- **Table:** Semantic table with restrained row separators, warm surfaces, compact rows, Graphite key values, Quiet Gray metadata. Avoid boxing every cell. Allow horizontal scrolling or compact representations on narrow screens.
- **Form:** Prefer shadcn form primitives. Use 6px radius, subtle borders, explicit labels, accessible concise errors adjacent to fields, and no heavy field shadows.
- **Loading:** Use shadcn Skeleton for known cards, rows, lists, and panels to preserve geometry. Avoid replacing structured pages with a single spinner.
- **Error and empty states:** Explain the issue in plain language and offer a useful recovery or next action when one exists. Use Alert, AlertDialog, or Sonner as appropriate; never expose stack traces, SQL, credentials, or internal service details. Empty states are concise and avoid giant illustrations.

Before building a new primitive, check the official shadcn/ui registry. Compose application components from its primitives in `src/components/ui` and keep overrides aligned with these tokens.

## Layout, responsiveness, and imagery

Use readable content widths, compact vertical rhythm, and clear document hierarchy. Desktop, tablet, and mobile layouts should preserve reading order and keyboard use. Tables can scroll horizontally without losing semantic markup. Avoid oversized cards, excessive blank space, and decorative animation. Imagery, when a real content need exists, should support a research or document context and use 12px corners. Do not add generic dashboard illustrations or fake content to fill space.

## Accessibility and motion

Use semantic HTML, explicit labels, visible focus rings, keyboard-operable controls, and sufficient text contrast. Add ARIA only when semantics need it. Respect reduced-motion preferences for future transitions. Disabled appearance must remain understandable; do not rely on color alone for meaning.

## CSS and Tailwind v4 contract

`src/app/globals.css` defines both semantic shadcn variables (`--background`, `--primary`, `--border`, etc.) and Tailwind v4 `@theme inline` utilities. The named palette is exposed as `--color-eggshell-canvas`, `--color-cloud-surface`, `--color-paper-beige`, `--color-whiteboard-gray`, `--color-linen-border`, `--color-graphite`, `--color-charcoal-copy`, `--color-quiet-gray`, `--color-disabled-ash`, `--color-integra-deep`, `--color-integra-teal`, `--color-integra-mint`, and `--color-integra-wash`. Font tokens are `--font-jakarta-sans`, `--font-sans`, and `--font-ui-monospace`; radius tokens include `--radius-md`, `--radius-xl`, and `--radius-full`. Reuse these utilities and the 4px spacing scale instead of scattering hex values or arbitrary spacing in components.

## Do and don't

**Do:** use Eggshell as the page base, Integra Deep for primary actions, restrained borders, flat cards, compact spacing, Plus Jakarta Sans throughout the interface, existing shadcn components, visible focus, selective Integra Teal links, and the logo mark (`public/integra-mark.png`) for brand placement.

**Don't:** make every control teal, recolor or stretch the logo, use gradients or glassmorphism, overuse shadows, use pure white everywhere, make every shape a pill, add arbitrary colors or spacing, create oversized dashboard cards, or add decorative motion without purpose.
