# INTEGRA visual system

This is the visual source of truth for `apps/web`. The direction is **editorial precision**, adapted from the Genesis system (designmd.ai/chef/genesis): quietly confident, bold display typography, generous spacing, and gallery-frame surfaces. It should feel professional and modern without being sterile, with high information density balanced by breathing room.

INTEGRA keeps Genesis's gallery-frame idea but leads with borders: every surface has a 1px `hairline` border, and shadows are **small and low-opacity** (at most 8% black), only hinting at elevation.

## Colors

| Token          | Value     | Tailwind                            | Use                                                                                      |
| -------------- | --------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Primary        | `#00736B` | `primary`                           | Primary buttons, outline borders, active filter chips, controls, focus (5.73:1 on white) |
| Primary Hover  | `#005C56` | `primary-hover`                     | Hover on primary elements; text links (7.88:1 on white)                                  |
| Primary Wash   | `#E6F4F1` | `primary-wash`                      | Selected rows and controls, outline-button and active-nav surface                        |
| Background     | `#FAFAFA` | `canvas`, `background`              | Page background, table headers, inset boxes inside cards                                 |
| Surface        | `#FFFFFF` | `surface`, `card`, `popover`        | Cards, panels, navigation, dialogs, menus                                                |
| Subtle         | `#F4F4F5` | `subtle`                            | Neutral chips, hover rows, nav-link hover and active background                          |
| Border         | `#E8E8EC` | `hairline`, `border`                | Card borders, dividers, input borders                                                    |
| Text Primary   | `#0A0A0A` | `ink`                               | Headings, body text, key values                                                          |
| Text Secondary | `#6B6B6B` | `ink-secondary`                     | Descriptions, metadata, timestamps, labels                                               |
| Neutral        | `#9C9C9C` | `ink-muted`                         | Placeholders, disabled text, decorative icons only (fails AA text)                       |
| Chart Neutral  | `#D4D4D8` | `chart-neutral`                     | Baseline chart series (claims without flags, pending status)                             |
| Success        | `#10B981` | `success` (`success-ink` `#047857`) | Approved status, saved confirmations                                                     |
| Warning        | `#F59E0B` | `warning` (`warning-ink` `#B45309`) | "Perlu klarifikasi", findings, pending caution, identical text                           |
| Error          | `#EF4444` | `error` (`error-ink` `#B91C1C`)     | Escalation, high priority, validation errors, destructive actions                        |

INTEGRA green, taken from the logo wordmark, is reserved for interactive elements: never for decoration, static text, money, or status chips. Semantic colors appear as a 10% tint with a 30% border and their `*-ink` text tone, which keeps chip text above 4.5:1 contrast. The INTEGRA logo keeps its own colors and is never recolored. Light mode is the only theme for now. Color tokens live in a non-inline `@theme` block, so charts can reference them as `var(--color-warning)` and so on.

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
- Workspace content: `max-w-7xl` (1280px), 32px side padding from `md`, 16px on phones; 32px top padding on phones and 40px from `md`.
- Breakpoints: phones are below `md` (768px), tablets `md` to `lg`, desktops from `lg` (1024px). The sidebar is fixed only from `lg`, so tablets keep the full width. Layouts that need more room switch at `xl` (1280px): the Kartu Klaim side column, four stat tiles in a row, and the three-column Ikhtisar chart row. Verify every page at 320, 390, 768, 1024, and 1440px wide with no page-level horizontal scroll.
- Use `min-h-dvh` for full-height screens so mobile browser toolbars do not hide content.
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
- Focus: inputs turn their border `primary` (INTEGRA green) with a 3px `primary/15` ring; other controls use the global 2px `primary` outline.

## Components

- **Buttons:** Primary is INTEGRA green fill, white text, 6px radius, medium weight, hover `primary-hover`. Outline (secondary) is `surface` with a green `primary` border and green text, hover `primary-wash`. Ghost has no border or fill; on hover it gets a subtle background and green text. Destructive stays red text with a red border, because red marks risky actions. All shift up 1px on hover when motion is allowed. Sizes: sm 32px, default 38px, lg 44px. Use one primary button per view section.
- **Where green appears:** primary, outline, and ghost-hover buttons; text links; the active sidebar item; active filter chips; checked checkboxes, radios, and switches; pagination and active tabs; progress bars and spinners (the AI loading bar, tour steps); focus rings; the 2px tour spotlight border; and selected table rows (`primary-wash`). Status chips, chart colors, destructive buttons, and the logo are excluded.
- **Cards and panels:** `rounded-xl border border-hairline bg-surface`, 16px padding for compact side panels and 24px for content panels. Panel headers are separated by a `hairline` bottom border.
- **Inset boxes:** `rounded-lg border border-hairline bg-canvas` for supporting explanations, evidence that was not found, and money breakdowns.
- **Inputs:** 1px `hairline` border, `surface` background, 6px radius, 10×14px padding, 14px text, `ink-muted` placeholder. Error state turns the border red.
- **Chips (`Pill` in `components/claim-pills.tsx`):** pill shape, 12px text, medium weight. Tones: `outline`, `neutral` (gray), `success`, `warning`, `error`, and `inverse` (ink, for the INTEGRA AI mark). Filter chips are the only green chips: `surface` with a `hairline` border, and green fill with white text when active. Status chips and badges keep their semantic tones and never turn green.
- **Tables and lists:** stacked rows with 1px dividers, 12px×16px cell padding, `canvas` header row with uppercase overline labels, `hover:bg-subtle` on rows. Tables live inside a 12px bordered frame and may scroll horizontally inside that frame on narrow desktops; let long text cells wrap (`whitespace-normal` with a min width) before relying on scroll. The eight-column claim queue uses 12px side padding so it fits from 1280px. Below `lg`, each table renders as a card list instead (`divide-y` rows with 16px padding, the same pills and actions, and a `TableSortSelect` "Urutkan" select in the toolbar replacing the sortable headers); any `data-tour` target on a row is repeated on its card. Every data table uses `components/data-table`: a toolbar row above the header (`hairline` bottom border) holding a 36px search input group and 36px filter selects labelled "Label: value" with the value left-aligned right after the label, stacked full width on phones; sortable column headers that cycle ascending and descending with an arrow icon and `aria-sort`; a "no matching rows" message with a reset button; and pagination at 10 rows with outline Sebelumnya/Berikutnya buttons in a bordered footer. Tables backed by the API (Antrean Klaim, Eskalasi, Ringkasan Faskes) page on the server with `useServerTableControls`: the API filters, searches (debounced 300ms), sorts, and returns one page, and the previous page stays visible at 60% opacity while the next loads. Only the in-memory import preview uses `useTableControls` on the client.
- **Queue status chips:** pill toggles above the claim queue, one per status plus Semua, each with its claim count from `GET /claims/statistics` in a small inner pill (`subtle`, or white at 20% on the active green chip), and one `ink-secondary` line under the chips describing which claims the active view holds.
- **Navigation:** the shadcn Sidebar (`components/app-sidebar.tsx`) on `surface` with a right `hairline` border: logo and wordmark on top, role-based groups with overline labels, and a footer with the signed-in user card, Panduan, Ciutkan menu, and Keluar. Menu buttons are 36px, 14px medium; the active item uses `primary-wash` with green `primary-hover` text and a 2px green bar on its left edge. From `lg` the sidebar collapses to a 48px icon rail (footer button, the edge rail, or Ctrl/⌘+B); collapsed items show their label in a tooltip, and the state persists in the `sidebar_state` cookie. Width and slide transitions last 300ms `ease-out` and stop under `prefers-reduced-motion`. Below `lg` the sidebar becomes a vaul drawer (`components/ui/drawer.tsx`) opened from a solid sticky 56px header (no backdrop blur, which stutters during the slide on phones). vaul slides it with a compositor-only transform on the `ease-drawer` curve (fast start, long gentle stop) over an `ink/55` overlay, it can be swiped closed, and it closes once a page is chosen; `globals.css` cuts its motion under `prefers-reduced-motion`.
- **Dashboards (`components/dashboard-panels.tsx`):** charts live only on the supervisor Ikhtisar page (`/overview`, `components/overview`); work pages such as Antrean Klaim and Ringkasan Faskes show tables only. `StatTile` (overline label, subhead value, caption hint) inside `StatTileGrid`: one column on phones, two from `sm`, and four from `xl`, so rupiah figures never overflow their tile; `ChartPanel` cards (24px padding, body-weight heading, small description) holding shadcn charts. Chart series use tokens only: `chart-neutral` for the baseline and claims not yet analyzed by AI, `success` for analyzed claims without flags, `warning` for flagged claims, semantic colors for statuses, `warning`, `error`, and `ink-secondary` for the three tests, `warning-ink` for rupiah gaps. Gridlines are `hairline`, axes have no lines, bars have a 4px end radius, and every chart has a text legend (`ChartLegendList`) with values so color is never the only cue. INTEGRA green is not used in charts; their semantic colors stay unchanged.
- **Icons:** Lucide outline icons imported from `react-icons/lu` (`LuSearch`, `LuArrowUpDown`, and so on); type icon props as `IconType` from `react-icons`. Do not add `lucide-react` or another icon set. Icons are 16px in buttons and menus, 14px in chips and sortable headers, and inherit text color. When adding a shadcn component, replace its `lucide-react` imports with the `Lu*` equivalent.
- **Quotes and highlights:** document quotes have a 2px `ink-muted` left rule; identical text across claims is a `warning/20` `mark`.
- **Dialogs:** shadcn AlertDialog on `surface` with a 12px radius, `hairline` border, and `shadow-lg`; a 40px `subtle` icon tile, a body-weight General Sans title, and `ink-secondary` description. Ask for confirmation (`components/confirm-dialog.tsx`, "Tidak" outline plus a "Ya, …" primary button) before paid AI analysis and before Keluar; state the consequence, including how many unread documents the AI will read. Errors and outcomes the user must read before continuing, such as a failed login or sign-up, use the one-button `components/notice-dialog.tsx`. After an AI run, `components/analysis/analysis-result-dialog.tsx` shows a one-sentence summary and a 2×2 grid of counts in a `canvas` inset.
- **AI analysis:** paid analysis only runs on claims the verifier chose, at most one page (10 claims) per run: a checkbox on each row or card, a header checkbox ("Pilih semua" on the card list) that selects every claim on the current page, and a selection bar (`claim-queue/claim-selection-bar.tsx`) between the toolbar and the rows: always `canvas` (it never turns green, only the selected rows do), with no hint text and, once claims are chosen, "n dipilih · m dokumen belum dibaca", a solid red "Batal pilih" (`error-ink` fill, white text, 6.5:1), and the primary "Analisis AI (n)" button on its right (full width on phones); plus an outline "Analisis" button on each unanalyzed row, and "Analisis dengan AI" on the Kartu Klaim. Selected rows and cards use `primary-wash`. There is no control that selects claims beyond the visible page. `useClaimAnalysisRunner` (`components/analysis`) owns confirm, run, and result for every entry point.
- **Full-screen loading:** while the AI runs, `AnalysisLoadingOverlay` covers the whole viewport: the page behind stays visible through a `canvas` 75% overlay with a medium backdrop blur, and a centered column holds the Lottie animation from `public/animations/loading.json` (fetched only when a run starts; 96px on mobile, 112px from `sm`; `globals.css` declares `@layer lottie-react` first so its default 100% size never beats the size utilities), a 15px title, live progress text, a 6px `primary` progress bar on `subtle`, and an outline "Hentikan analisis" button that is full width on mobile. The column scrolls on very short screens. It cannot be dismissed with Escape, and the animation holds still under `prefers-reduced-motion`. Use Lottie only for this kind of long-running state, never as decoration.
- **Analysis time:** once analyzed, a claim shows when: the queue's Aksi column shows "Dianalisis AI" above the date and time, and the Kartu Klaim AI card shows a neutral clock chip "Dianalisis <date, time>" next to the INTEGRA AI chip (an outline "Belum dianalisis AI" chip before that). Use `formatDateTime` (Asia/Jakarta) inside a `<time dateTime>` element.
- **Status pages:** `app/not-found.tsx` (404), `app/error.tsx`, and `app/global-error.tsx` use `components/status-page.tsx`: full screen (`min-h-dvh`, `canvas`), no card, the INTEGRA mark top left linking home, then a centered column with a 56px `surface` icon tile, an overline code, a section heading that grows to `text-headline` from `sm`, an `ink-secondary` description, and lg buttons (one primary, one outline) that stack full width on phones. The error page offers "Coba lagi" and shows the error digest in mono when there is one.
- **Loading, errors, empty states:** shadcn Skeleton on `subtle` with the final geometry; plain-language Alerts with a recovery action; concise Empty states in a bordered `surface` card.

Check the official shadcn/ui registry before building a primitive. Primitives in `src/components/ui` import `cn` from `@/lib/utils` and have been aligned with these tokens; keep further overrides inside the same palette.

## Decoration and motion

The only decorative element is the static dot grid (`lib/dot-grid.ts`, `hairline` dots on a 20px grid) on the login brand panel and behind the status pages, where it fades out toward the edges with a radial mask. No gradients, illustrations, or glass effects elsewhere. Transitions last 200ms and run only under `motion-safe`; the desktop sidebar's width uses 300ms `ease-out` and the mobile sheet uses `ease-drawer`, so each reads as one smooth motion.

## Accessibility

Use semantic HTML, explicit labels, visible focus, and keyboard-operable controls. Body and metadata text use `ink` or `ink-secondary` (never `ink-muted`). Do not rely on color alone: chips pair color with an icon or label. Do not use pure black (`#000`) for text.

## Do and don't

**Do:** use `canvas` for the page and `surface` for cards, separate everything with `hairline` borders, use INTEGRA green only for what can be clicked or is selected, keep General Sans for headings and DM Sans for everything else, and keep the 4px grid.

**Don't:** add shadows larger than the capped scale or without a border, use INTEGRA green for static text, money, or status chips, put more than one primary button in a section, use `ink-muted` for readable text, mix 12px and 6px radii on the same kind of element, or add decorative gradients and illustrations.
