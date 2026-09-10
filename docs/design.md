# Coolzy — design plan

The reference for anyone touching the interface. It records what was chosen, what was
deliberately rejected, and where the built product differs from the original brief.

## The idea

**Dark room, lit cup.** The client menu is the café at night: a warm-black room where the
only thing that glows is the drink. Photography carries the colour; the interface is almost
monochrome and stays out of the way. Each category owns one accent drawn from the drinks, so
scrolling the menu feels like walking past the poster wall.

The staff surfaces flip to the other half of the brand — the printed house-rules board: oat
paper, generous air, readable at a glance under shop lighting across an eight-hour shift.
Same type, same spacing, inverted world. The inversion is the signature; both worlds are
built from one set of tokens, not one theme tinted twice.

## Palette in use

Every surface reads from a world variable, never a raw hex. `:root` is the oat world;
`[data-world="dark"]` swaps four values and inverts the product.

| Token | Light world (staff) | Dark world (client) |
|---|---|---|
| `--bg` | `#F2EBE1` oat | `#0E0C0B` warm room black |
| `--bg-raised` | `#FFFFFF` | `#191614` |
| `--fg` | `#0E0C0B` | `#F2EBE1` |
| `--fg-muted` | `#8A7F76` stone | `#8A7F76` stone |
| `--hairline` | `rgba(14,12,11,.10)` | `rgba(242,235,225,.12)` |

Category accents, assigned by the admin from this fixed set so the palette cannot drift:

| Accent | Hex | Drink family |
|---|---|---|
| rose | `#E4457E` | fruity, signature |
| melon | `#E5372F` | fresh and fizzy |
| curacao | `#1B93C4` | mojitos and sodas |
| colada | `#C79A4B` | tropical and creamy |
| bean | `#8B5E3C` | coffee |
| mint | `#4F8A5B` | tea and infusions |

Status colours are functional and never borrowed from the accents: `--ok #3F8F5F`,
`--warn #C98A19`, `--stop #C2452F`.

**Revision — accent text variants.** The six accents are correct as fills, but several fall
below 4.5:1 as text on one ground or the other. Curacao on room black is 3.1:1; rose on oat
is 3.4:1. Rather than drop the accents or weaken the contrast floor, each one carries two
text-safe variants: `--accent-text` for the light world and `--accent-text-dark` for the dark
one. The fill stays exactly as specified; only text and thin marks use the variant.

## Type

**Fraunces** for display, **Instrument Sans** for interface.

Fraunces over Newsreader because its italic is a genuinely different design rather than a
slant, and the tagline *your safe place* is set in it at 46px on the hero. Its optical-size
axis means the same family holds at 62px on a hero and 20px on a card without going thin.
Drink names are set large, tight (`-0.02em`), sentence case.

Instrument Sans for everything the interface says: humanist, wide language coverage, and
tabular figures, which matters because prices and elapsed minutes sit in columns and must not
jitter as they change.

Arabic is never the Latin face with fallback glyphs. **IBM Plex Sans Arabic** carries the UI
and **Noto Naskh Arabic** the display, switched under `html[lang="ar"]`. Arabic line-height
runs 1.72 against the Latin 1.5, about 15% looser, and every card was checked at that height.

Scale: 12 / 14 / 16 / 20 / 26 / 34 / 46 / 62. Body 16px, line length under 70 characters.

**Revision — how the faces ship.** Fraunces is served as a static 400 rather than the full
variable font, and its italic is a second face fetched only where it is used. The Arabic faces
are declared but not preloaded, so a French visitor on 3G never pays for them. This cut the
fonts on the menu from roughly 800 KB to 37 KB with no visible change.

## Client menu

Mobile first. The menu is the hero; there is no landing page and no splash.

```
┌───────────────────────────────────────┐
│ Coolzy ●          FR EN ع   ⟲    ☕   │  ● open/closed, live from Algiers time
├───────────────────────────────────────┤
│ your safe place                       │  Fraunces italic, 46px
│ Ouvert jusqu'à 23:00                  │  computed, never hardcoded
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │  16:00–20:00 only, dismissible
│ │ Les ordinateurs portables ne sont │ │
│ │ pas admis de 16 h à 20 h.      ✕  │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │                                   │ │
│ │         hero photograph           │ │  resolves from blur once, on first
│ │         edge to edge, 4:3         │ │  load only; blurhash placeholder
│ │                                   │ │
│ └───────────────────────────────────┘ │
│ Signature                             │  category name in its accent
│ Pink Lady                             │  Fraunces, 34px
│ Fruité, mousse légère, cerise         │
│ 650 DA        ( + Ajouter )           │  44px target
├───────────────────────────────────────┤
│ ⌕ Un produit, un ingrédient…          │
├───────────────────────────────────────┤
│ Signature   Café   Mojitos       →    │  sticky rail, accent underline,
│ ──────────                            │  scrolls the other way in Arabic
├───────────────────────────────────────┤
│ Signature                             │  section head in accent
│ ┌────┐ Pink Lady                      │
│ │ 96 │ Fruité, mousse légère…         │
│ │ px │ Fraise, lait, glace, cerise    │  ingredients: a student avoiding
│ └────┘ 650 DA                    (+)  │  milk sees it before ordering
│ ┌────┐ Watermelon Mojito              │
│ │    │ …                              │
│ └────┘ 550 DA        Épuisé aujourd'hui│  sold out stays visible, disabled,
└───────────────────────────────────────┘  with the reason
     [ 3 articles        1 950 DA ]        thumb bar, appears when non-empty,
                                           never a fixed nav stealing space
```

Product photography is edge to edge inside its frame. One radius for cards (14px), one for
pills (999px), nothing else.

## Worker board

Three columns from 768px, single scroll on a phone. Cards sized to read at arm's length.

```
┌─ Nouvelles ────┬─ En préparation ┬─ Prêtes ────────┐
│    6 commandes │      3 commandes│      1 commande │
├────────────────┼─────────────────┼─────────────────┤
│ #0163  ⌸ T8    │ #0139  ⌸ T2     │ #0138  ⛟ Livr.  │
│          17 min│           4 min │          11 min │  the only number that
│ 2× Pink Lady   │ 1× Frappuccino  │ 3 articles      │  changes colour:
│ "sans sucre"   │                 │ Livrer à Yacine │  neutral → warn 8 min
│                │ Par Nadia       │ 06 61 23 45 67  │  → stop 15 min
│ ┌────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │
│ │  Accepter  │ │ │    Prête    │ │ │   Livrée    │ │  56px, always at the
│ └────────────┘ │ └─────────────┘ │ └─────────────┘ │  bottom of the card:
│ Annuler        │ Annuler         │ Annuler         │  never scroll to find it
└────────────────┴─────────────────┴─────────────────┘
  Terminées récemment (30 min)
  #0004 Servie   #0006 Annulée   #0008 Livrée
```

Each column scrolls on its own under a pinned header, so a barista working through nineteen
new orders can always see which queue they are in and how deep it is. The next order to act
on is at the top of its column, and its action button is in view without scrolling at every
tablet size tested.

A new order flashes once and chimes; the chime is mutable and the mute persists. Every
transition records which worker made it and when.

## Motion

One orchestrated moment: on first load the hero drink resolves from a soft blur while the
category rail settles. Once per session, never again. Everything else is a response to an
action — the cart badge counts up, the status chip cross-fades, the receipt slides in as a
sheet, a new board card flashes once. Under `prefers-reduced-motion` each becomes an instant
state change, never nothing.

**Revision — the hero reveal.** It originally animated opacity from 0 alongside the blur.
That made the browser treat the photo as unpainted until the animation finished, which pushed
Largest Contentful Paint out by roughly half a second. It now animates blur and scale only,
so the image counts as painted on its first frame and the reveal reads the same.

## Checked against the banned defaults

| Banned | Status |
|---|---|
| Cream + terracotta, purple-to-blue gradients, acid green on black | Not used. |
| Gradient text, glassmorphism, neon glow | Not used. Depth is light and layering only. |
| 3D, WebGL, isometric illustration, fake perspective | None. Flat, typographic, photographic. |
| Tracked-out ALL-CAPS eyebrow labels | None. Category labels are sentence case in the accent. |
| One word coloured inside a headline | None. |
| Meta strings joined with middle dots | Removed. The cart bar is two elements, "3 articles" and "1 950 DA", not one dotted string. The page-title template and the category/accent label were switched from `·` to an em dash. |
| `→` glued onto button text | None. Buttons are verbs. |
| Monospace for small labels | None. Small labels are Instrument Sans with tabular figures. |
| `01 / 02 / 03` markers on non-sequences | Only the setup card is numbered, and it is an actual sequence. |

## Quality floor

Responsive from 320px. Visible keyboard focus everywhere, outlined in the opposite world's
ground. WCAG AA in both worlds. Touch targets at least 44px, and 56px for the board's primary
action. Photography served as AVIF/WebP with blurhash placeholders and fixed aspect boxes, so
layout shift measures 0.001. Arabic is built as a first-class layout with logical properties
throughout, not a mirrored afterthought.

**Revision — specificity.** The component classes (`.btn`, `.input`, `.photo` and the rest)
are declared inside `:where()`, which gives them zero specificity. Without it a plain
`.btn` rule beat any Tailwind utility placed on the same element, so spacing and colour
overrides silently did nothing. Utilities now always win.
