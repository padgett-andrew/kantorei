# Singer Portal Visual Design Brief

## Goal

Refresh the Kantorei singer portal so it feels like a natural extension of the public Kantorei website—not a generic SaaS dashboard—while preserving the portal’s functionality, information, and mobile usability.

## Design direction

Treat the portal as a private, practical part of the same arts organization. Carry over the public site’s warm, editorial character: ivory surfaces, deep navy typography, burnished-copper accents, Cormorant Garamond headings, and restrained Inter body text. Keep the interface clear and efficient for singers checking rehearsals, reporting conflicts, finding music, and handling choir duties.

The target should feel closer to a thoughtfully designed concert-program or ensemble member area than a CRM or admin template.

## Existing visual language

The public site’s shared design tokens are in `src/styles/global.css`:

- Editorial serif: `--font-serif` (Cormorant Garamond, with fallbacks)
- Sans-serif: `--font-sans` (Inter, with fallbacks)
- Deep navy: `--color-navy-950`, `--color-navy-900`, `--color-navy-800`
- Burnished copper: `--color-copper-*` and `--color-gold-*`
- Warm ivory: `--color-ivory-50`, `--color-ivory-100`

The public shell is `src/layouts/PublicLayout.astro`. The portal shell and navigation are `src/layouts/PortalLayout.astro` and `src/components/portal/PortalNav.astro`. The portal overview is `src/pages/portal/index.astro`.

## What currently feels generic

- The portal has a dark, app-style header with compact tab buttons.
- The overview relies on many separate white cards, rounded corners, shadows, badges, and action tiles.
- The page uses a dense dashboard hierarchy, with many small labels and status treatments competing for attention.
- Its overall interaction language feels more like a SaaS tool than the public site’s editorial, warm presentation.

## Recommended changes

### 1. Bring the portal shell into the public-site family

- Use a warm ivory page background and navy text, with copper for selected states and important actions.
- Restyle the header as a quieter, lighter site header with a subtle border. Keep the logo and portal identity, but reduce the dark application-chrome feel.
- Make navigation feel editorial and integrated: clear text links, restrained active indicators, and accessible focus states rather than a row of pill-like buttons.
- Keep the portal identity and private-member context obvious; the portal should not be mistaken for a public page.

### 2. Establish calmer page hierarchy

- Use serif typography for page titles and major section headings; retain sans-serif for utility text, controls, and dense data.
- Create more breathing room between major sections and reduce nested containers.
- Favor subtle borders and warm surface tones over repeated bright-white cards and prominent shadows.
- Use small uppercase, letter-spaced copper labels sparingly as section eyebrows, echoing the public site.

### 3. Make the overview feel like a member home, not a dashboard

- Give the next rehearsal the clearest visual priority, in a more editorial feature block.
- Keep quick links to attendance, hospitality, music, and seating, but present them as a compact, coherent set of member resources rather than several competing status cards.
- Keep the schedule easy to scan. Use a restrained date treatment, clear event titles, and understated event-type labels.
- Preserve useful at-a-glance information, but reduce decorative badges and repeated action prompts.

### 4. Use semantic color intentionally

- Use navy and copper as the default brand colors.
- Reserve amber and rose for actionable time-sensitive or warning/error states; do not make routine attendance or normal portal states feel alarming.
- Maintain clear text/background contrast and visible focus indicators.

### 5. Preserve practical usability

- Keep the singer’s key tasks easy to find on desktop and mobile.
- Preserve the existing mobile navigation and safe-area behavior.
- Keep controls comfortably tappable, layouts responsive, and important schedule details readable without horizontal scrolling.
- Respect the existing accessibility affordances, including the skip link and semantic headings.

## Scope and guardrails

- This is a visual and interaction-presentation refresh, not a feature rewrite.
- Preserve routes, data fetching, permissions, role-based controls, calendar and absence actions, admin functions, and all existing portal behavior.
- Do not change authentication, Google Workspace integrations, or business logic.
- Reuse the existing design tokens and components where practical; avoid adding a new UI framework or unnecessary dependencies.
- Keep the public website’s existing appearance unchanged.
- Prefer shared, maintainable styles over one-off styling where the portal has repeated patterns.

## Suggested implementation order

1. Update `src/layouts/PortalLayout.astro` and `src/components/portal/PortalNav.astro` to establish the shared visual frame.
2. Refresh the overview in `src/pages/portal/index.astro`, starting with the next-call section, quick links, and schedule.
3. Apply the same heading, surface, border, spacing, and status conventions to the other `/portal/*` pages for consistency.
4. Check the portal at narrow mobile, tablet, and desktop widths; verify keyboard focus and contrast.
5. Run the project’s existing checks and confirm that all existing portal actions still work.

## Acceptance criteria

- The portal clearly belongs to the same Kantorei brand as the public site while remaining recognizable as a private singer area.
- The first impression is warm and editorial rather than dark, card-heavy, or template-like.
- The next rehearsal and the most common singer tasks are easy to identify quickly.
- Schedule and status information remain scannable, with warning colors reserved for meaningful alerts.
- Navigation and content work well on mobile and desktop, including keyboard use.
- Existing routes, data, permissions, and interactions remain intact; no public-site redesign or new dependency is introduced.

## Useful reference files

- Public design tokens: `src/styles/global.css`
- Public shell: `src/layouts/PublicLayout.astro`
- Public homepage: `src/pages/index.astro`
- Portal shell: `src/layouts/PortalLayout.astro`
- Portal navigation: `src/components/portal/PortalNav.astro`
- Portal overview: `src/pages/portal/index.astro`

## Instructions for the implementing agent

Please inspect the current versions of the reference files before editing. Implement the refresh directly in the existing Astro/Tailwind patterns, preserve all functional behavior, and summarize the files changed plus checks performed when finished.
