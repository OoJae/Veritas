# Veritas theme — how to drop into `apps/web`

Three files. Copy each to the path below, then restart `pnpm dev`.

| File here | Copy to |
|---|---|
| `globals.css` | `apps/web/app/globals.css` (replace) |
| `seal.tsx` | `apps/web/components/seal.tsx` (new) |
| `navbar.tsx` | `apps/web/components/navbar.tsx` (replace) |

## What changes immediately (zero component edits)
`globals.css` re-themes the shadcn CSS variables, so every `Card`, `Button`,
`Badge`, `Input`, and `Tabs` instantly adopts the Veritas palette:
void-black surfaces, marble text, and **verum-gold** as the primary action
colour. Fonts switch to Archivo (display), JetBrains Mono (data), Newsreader
(serif accents).

## Two manual follow-ups (optional but recommended)
The market/policy pages use hardcoded Tailwind colours that token-theming
can't reach. To finish the rebrand, swap them for the brand semantics:

1. **YES/NO + outcome colours.** Replace `text-green-400` / `bg-green-500`
   with `text-[var(--verum)]` / `bg-[var(--verum)]` (TRUE = gold) and
   `text-red-400` / `variant="destructive"` with the muted `verdict-false`
   treatment (FALSE = outlined marble, not loud red). Files:
   `app/markets/page.tsx`, `app/markets/[id]/page.tsx`,
   `app/disputes/page.tsx`.

2. **Page headers.** The `text-3xl font-bold` H1s read better as
   `className="font-display text-4xl"` with an `<p className="eyebrow">` kicker
   above — matches the marketing site rhythm.

## Reference
See `Veritas App.html` at the project root for the fully-designed in-app
screens (Markets list + detail with the live verdict tracker, Insurance,
Disputes, Status) in this language — use it as the visual spec when wiring
the real components.
