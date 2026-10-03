# INTEGRA visual system

This is the visual source of truth for `apps/web`. The direction is **editorial precision**, adapted from the Genesis system (designmd.ai/chef/genesis): quietly confident, bold display typography, generous spacing, and gallery-frame surfaces. It should feel professional and modern without being sterile, with high information density balanced by breathing room.

INTEGRA keeps Genesis's gallery-frame idea but leads with borders: every surface has a 1px `hairline` border, and shadows are **small and low-opacity** (at most 8% black), only hinting at elevation.

## Colors

| Token          | Value     | Tailwind                            | Use                                                                |
| -------------- | --------- | ----------------------------------- | ------------------------------------------------------------------ |
| Primary        | `#6366F1` | `primary`                           | Primary buttons, active filter chips, selected controls, focus     |
| Primary Hover  | `#4F46E5` | `primary-hover`                     | Hover on primary elements; text links (meets AA on white)          |
| Primary Wash   | `#EEF2FF` | `primary-wash`                      | Selected surface of an interactive control (e.g. chosen decision)  |
| Background     | `#FAFAFA` | `canvas`, `background`              | Page background, table headers, inset boxes inside cards           |
| Surface        | `#FFFFFF` | `surface`, `card`, `popover`        | Cards, panels, navigation, dialogs, menus                          |
| Subtle         | `#F4F4F5` | `subtle`                            | Neutral chips, hover rows, nav-link hover and active background    |
| Border         | `#E8E8EC` | `hairline`, `border`                | Card borders, dividers, input borders                              |
| Text Primary   | `#0A0A0A` | `ink`                               | Headings, body text, key values                                    |
| Text Secondary | `#6B6B6B` | `ink-secondary`                     | Descriptions, metadata, timestamps, labels                         |
| Neutral        | `#9C9C9C` | `ink-muted`                         | Placeholders, disabled text, decorative icons only (fails AA text) |
| Chart Neutral  | `#D4D4D8` | `chart-neutral`                     | Baseline chart series (claims without flags, pending status)       |
| Success        | `#10B981` | `success` (`success-ink` `#047857`) | Approved status, saved confirmations                               |
| Warning        | `#F59E0B` | `warning` (`warning-ink` `#B45309`) | "Perlu klarifikasi", findings, pending caution, identical text     |
| Error          | `#EF4444` | `error` (`error-ink` `#B91C1C`)     | Escalation, high priority, validation errors, destructive actions  |

Indigo is reserved for interactive elements: never for decoration, static text, money, or status chips. Semantic colors appear as a 10% tint with a 30% border and their `*-ink` text tone, which keeps chip text above 4.5:1 contrast. The INTEGRA logo keeps its own colors and is never recolored. Light mode is the only theme for now. Color tokens live in a non-inline `@theme` block, so charts can reference them as `var(--color-warning)` and so on.

## Typography

- **Display:** General Sans (Fontshare stylesheet in `app/layout.tsx`), weight 600, tracking `-0.03em` (`font-display tracking-display`). `h1`–`h3` use it by default.
- **Body and UI:** DM Sans (`next/font`), weights 400 and 500 only.
- **Code and IDs:** JetBrains Mono (`font-mono`) for claim numbers, ICD-10 and INA-CBG codes, facility codes.

Never swap the display and body faces, and use no more than two body weights on a screen.

| Role            | Size | Tailwind        | Use                                                     |
| --------------- | ---- | --------------- | ------------------------------------------------------- |
| Headline        | 60px | `text-headline` | Login brand statement (wide screens only)               |
| Section heading | 32px | `text-section`  | Page titles, claim title                                |
| Subhead         | 24px | `text-subhead`  | Login title, headline money figures                     |
| Body            | 15px | `text-body`     | Body copy, table cells, panel headings                  |
| UI              | 14px | `text-sm`       | Buttons, inputs, navigation links                       |
| Small           | 13px | `text-small`    | Secondary rows, list content, filter chips              |
| Caption         | 12px | `text-caption`  | Metadata, chips, helper text                            |
| Overline        | 11px | `text-overline` | Uppercase table headers and eyebrows (`tracking-wider`) |

These size tokens are registered with tailwind-merge in `src/lib/utils.ts`; add any new one there too, or `cn()` will drop it next to a text color.

## Spacing and layout

- 4px base grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px.
- Component padding: small 8×12, medium 10×16, large 12×24.
- Workspace content: `max-w-7xl` (1280px), 32px side padding on desktop, 16px on mobile; 32px top padding on mobile and 40px on desktop.
- Grid and stack gaps between cards: 16–24px.

## Radius

| Radius | Use                                             |
| ------ | ----------------------------------------------- |
| 4px    | Inline code, `mark` highlights                  |
| 6px    | Buttons, inputs, selects, nav links, icon tiles |
| 8px    | Inset boxes, dropdowns, menus, list frames      |
| 12px   | Cards, panels, tables, dialogs, empty states    |
| 9999px | Chips and badges, avatars, status dots          |

Keep cards at 12px and controls at 6px; do not mix them.

## Elevation: border first, small shadows

The shadow scale in `globals.css` is capped: `shadow-xs` (1px, 4%) for resting surfaces, `shadow-sm` for chart tooltips, `shadow-md` for menus and popovers, and `shadow-lg` and above share one 8px, 8% value for sheets, dialogs, and the tour card. Do not add arbitrary `shadow-[...]` values.

- Cards, panels, stat tiles, tables, buttons (primary and outline), and inputs rest on a 1px `hairline` border with `shadow-xs`.
- Interactive rows and cards change background (`hover:bg-subtle`) instead of lifting further.
- Overlays dim with a solid `bg-ink/55` layer (the tour spotlight uses four such panels around its target and a 2px `primary` border).
- Focus: inputs turn their border `primary` with a 3px `primary/15` ring; other controls use the global 2px `primary` outline.

## Components

- **Buttons:** Primary is indigo fill, white text, 6px radius, medium weight, hover `primary-hover`. Outline (secondary) is `surface` with a `hairline` border. Ghost has no border or fill, only a subtle hover background. Destructive is red text with a red border. All shift up 1px on hover when motion is allowed. Sizes: sm 32px, default 38px, lg 44px. Use one primary button per view section.
- **Cards and panels:** `rounded-xl border border-hairline bg-surface`, 16px padding for compact side panels and 24px for content panels. Panel headers are separated by a `hairline` bottom border.
- **Inset boxes:** `rounded-lg border border-hairline bg-canvas` for supporting explanations, evidence that was not found, and money breakdowns.
- **Inputs:** 1px `hairline` border, `surface` background, 6px radius, 10×14px padding, 14px text, `ink-muted` placeholder. Error state turns the border red.
- **Chips (`Pill` in `components/claim-pills.tsx`):** pill shape, 12px text, medium weight. Tones: `outline`, `neutral` (gray), `success`, `warning`, `error`, and `inverse` (ink, for the INTEGRA AI mark). Filter chips are the only indigo chips: `surface` with a `hairline` border, and indigo fill with white text when active.
- **Tables and lists:** stacked rows with 1px dividers, 12px×16px cell padding, `canvas` header row with uppercase overline labels, `hover:bg-subtle` on rows. Tables live inside a 12px bordered frame and may scroll horizontally on narrow screens. Every data table uses `components/data-table` with `useTableControls`: a toolbar row above the header (`hairline` bottom border) holding a 36px search input group and 36px filter selects labelled "Label: value"; sortable column headers that cycle ascending and descending with an arrow icon and `aria-sort`; a "no matching rows" message with a reset button; and pagination at 20 rows with outline Sebelumnya/Berikutnya buttons in a bordered footer.
- **Navigation:** the shadcn Sidebar (`components/app-sidebar.tsx`) on `surface` with a right `hairline` border: logo and wordmark on top, role-based groups with overline labels, and a footer with the signed-in user card, Panduan, and Keluar. Menu buttons are 36px, 14px medium; the active item uses `primary-wash` with `primary-hover` text. Below `md` the sidebar becomes a sheet opened from a sticky 56px header.
- **Dashboards (`components/dashboard-panels.tsx`):** charts live only on the supervisor Ikhtisar page (`/overview`, `components/overview`); work pages such as Antrean Klaim and Ringkasan Faskes show tables only. `StatTile` (overline label, subhead value, caption hint) in a 2-column grid on mobile and 4 on desktop; `ChartPanel` cards (24px padding, body-weight heading, small description) holding shadcn charts. Chart series use tokens only: `chart-neutral` for the baseline and claims not yet analyzed by AI, `success` for analyzed claims without flags, `warning` for flagged claims, semantic colors for statuses, `warning`, `error`, and `ink-secondary` for the three tests, `warning-ink` for rupiah gaps. Gridlines are `hairline`, axes have no lines, bars have a 4px end radius, and every chart has a text legend (`ChartLegendList`) with values so color is never the only cue. Indigo is not used in charts.
- **Icons:** Lucide outline icons imported from `react-icons/lu` (`LuSearch`, `LuArrowUpDown`, and so on); type icon props as `IconType` from `react-icons`. Do not add `lucide-react` or another icon set. Icons are 16px in buttons and menus, 14px in chips and sortable headers, and inherit text color. When adding a shadcn component, replace its `lucide-react` imports with the `Lu*` equivalent.
- **Quotes and highlights:** document quotes have a 2px `ink-muted` left rule; identical text across claims is a `warning/20` `mark`.
- **Dialogs:** shadcn AlertDialog on `surface` with a 12px radius, `hairline` border, and `shadow-lg`; a 40px `subtle` icon tile, a body-weight General Sans title, and `ink-secondary` description. Ask for confirmation (`components/confirm-dialog.tsx`, "Tidak" outline plus a "Ya, …" primary button) before paid AI analysis and before Keluar; state the consequence, including how many claims are still unanalyzed. After an AI run, `components/analysis-result-dialog.tsx` shows a one-sentence summary and a 2×2 grid of counts in a `canvas` inset, with "Lanjutkan analisis" only when claims remain, which returns to the confirmation.
- **Loading, errors, empty states:** shadcn Skeleton on `subtle` with the final geometry; plain-language Alerts with a recovery action; concise Empty states in a bordered `surface` card.

Check the official shadcn/ui registry before building a primitive. Primitives in `src/components/ui` import `cn` from `@/lib/utils` and have been aligned with these tokens; keep further overrides inside the same palette.

## Decoration and motion

The only decorative element is the static dot grid on the login brand panel (`hairline` dots on a 20px grid). No gradients, illustrations, or glass effects elsewhere. Transitions last 200ms and run only under `motion-safe`.

## Accessibility

Use semantic HTML, explicit labels, visible focus, and keyboard-operable controls. Body and metadata text use `ink` or `ink-secondary` (never `ink-muted`). Do not rely on color alone: chips pair color with an icon or label. Do not use pure black (`#000`) for text.

## Do and don't

**Do:** use `canvas` for the page and `surface` for cards, separate everything with `hairline` borders, use indigo only for what can be clicked or is selected, keep General Sans for headings and DM Sans for everything else, and keep the 4px grid.

**Don't:** add shadows larger than the capped scale or without a border, use indigo for static text or money, put more than one primary button in a section, use `ink-muted` for readable text, mix 12px and 6px radii on the same kind of element, or add decorative gradients and illustrations.
