# UX/UI Replication Brief — Lusano (lusano.com) → Studio Based Upon

Status legend: ✅ Confirmed from source · ⚠️ Needs verification (see "How to verify" at bottom) · 💭 Assumption to validate

---

## Studio Based Upon divergences (confirmed)

- **No page builder** — fixed Nuxt routes with Sanity singleton page documents (`homePage`, `aboutPage`, `preCraftedPage`, `panelPlusPage`, `finishesPage`).
- **Filter categories** — All / Surfaces / Furniture / Materials / Finishes / Shapes (not Lusano's Sleep/Live/Eat/Work).
- **Bucket (heart) cart** — slide-in drawer opens when items are saved; enquiry + moodboard CTAs at bottom.
- **Moodboard** — fullscreen canvas; items scale 150%; drag to compose; click brings to front; download screenshot / save / send enquiry.
- **Grid item types** — products, materials, finishes, colours, shapes share one `gridItem` schema.
- **Sanity project** — `k8gpyc57` / `production`.

---

## 1. Purpose of this document

This is the reference doc Cursor should be given alongside every prompt when building a component. It exists so the AI isn't re-guessing the interaction model each time. Update it as you verify the ⚠️ items, and treat it as living documentation, not a one-shot spec.

**Tech context:** Nuxt 3 + Sanity (per your bootstrap). Source site is also Nuxt + Sanity (confirmed via `cdn.sanity.io` asset URLs and Nuxt meta tags in page source) — so the schema patterns below should map fairly directly to your Sanity studio.

---

## 2. Site map (as discovered)

✅ Confirmed pages:
- `/` — Homepage (product grid + filters + zoom)
- `/products/[slug]` — Product Detail Page (PDP)

✅ Confirmed product slugs (16, in homepage order):
```
grant-bedside-table, grant-armless-chaise, lulu-lounge-chair, grant-lounge-chair,
pierpont-bed, grant-bench, marmont-dining-table, marmont-dining-chair,
grant-counter-stool, grant-desk, grant-mirror, harlow-coffee-table,
rumi-cocktail-tables, grant-bookshelf, grant-bed
```
(Note: `grant-bedside-table` repeats — likely because the raw markup contains the list rendered 3× for a marquee/loop effect at the DOM level, see Section 4.)

⚠️ Not yet confirmed — likely exist but couldn't be reached without a live nav crawl (static fetch only resolves URLs already seen in a search or link):
- About / Our Story
- Contact
- Journal / Editorial (many DTC furniture brands run one)
- Stockists / Trade
- Cart / checkout (or is this a lead-gen site with no cart?)
- Search
- Legal (privacy, terms, shipping/returns)

**Action for you:** open the site, open the hamburger/nav menu (mobile and desktop may differ), and click every link. Paste me the full list of URLs and I'll fold them into this doc.

---

## 3. Global layout

### Header / Nav
✅ Confirmed elements (desktop, from rendered markup):
- Filter/category tabs, horizontally laid out, separated by `/`: **All / Sleep / Live / Eat / Work** — reads as a room/use-case taxonomy, not a traditional category nav
- Zoom control: `+` and `-` buttons with a live percentage readout (`00%` in static markup, i.e. renders dynamically client-side)

⚠️ Needs verification:
- Is there a logo/wordmark and where does it sit?
- Is there a hamburger menu, cart icon, or account/search icon anywhere?
- Does the nav bar stay fixed/sticky on scroll, or scroll away?
- Mobile nav pattern (full-screen overlay vs. slide-in vs. bottom bar)?

### Footer
⚠️ Not visible in fetched markup at all — likely rendered client-side or below a very long scroll. Needs a live check: social links, newsletter signup, copyright, secondary nav links.

---

## 4. Homepage — Product Gallery

This is the signature interaction of the site and the part most worth getting right.

✅ Confirmed from raw markup:
- A grid of large square product photos (all images are ~1:1 aspect ratio, 2960–2964px source), each a direct link to its PDP
- The same set of ~16 products appears **three times in sequence** in the server-rendered HTML
- Filter tabs (All/Sleep/Live/Eat/Work) sit near a zoom control (+/-, percentage display)

💭 What this likely means (needs your confirmation via recording):
- The 3x repeat is a common trick for **seamless looping marquees** — you duplicate the track 2-3x so when it scrolls/loops there's no visible seam or jump. This suggests the grid may **auto-scroll horizontally or vertically in a loop**, OR it's simply a very tall single grid with no loop and the repeat is a CMS/build quirk. **You confirmed it's not an "infinite grid" — so please tell me: does it loop at all, or is it a fixed-length grid that just ends?**
- The zoom control most likely resizes the grid's tile/column size (fewer, bigger tiles at high zoom; more, smaller tiles at low zoom) rather than a true optical/canvas zoom — but this needs confirming.
- Filter tabs likely filter the same grid in place (swap/fade items) rather than navigating to a new URL, since there's no `/sleep`, `/live` etc. in the markup — but confirm whether the URL changes (e.g. `?category=sleep`) when you click one.

**Action for you (this is the highest-value thing to verify):** screen-record ~20–30 seconds of:
1. Scrolling the homepage top to bottom (does it reveal more content, loop, or end?)
2. Clicking `+` and `-` a few times
3. Clicking through Sleep → Live → Eat → Work → All

Send me the clip or describe frame-by-frame what changes, and I'll turn it into a precise interaction spec (easing, direction, whether it's scroll-jacked or native scroll, whether zoom is CSS transform vs. re-layout).

---

## 5. Product Detail Page (PDP)

⚠️ Entirely unconfirmed — the page is client-rendered and returned empty markup (just the site-wide lorem ipsum meta description, no product content) to a static fetch. This means Cursor/you will need to inspect this live rather than rely on anything from me.

Things to capture when you look at a live PDP (e.g. `/products/grant-bed`):
- Image gallery pattern (carousel? stacked scroll? thumbnail strip?)
- Where price, dimensions, materials, description sit
- Any configurator (fabric/finish swatches, size options)?
- Add-to-cart / enquire CTA — and what it does (cart drawer, redirect, contact form?)
- Related/"you may also like" products at the bottom?
- Any zoom-on-hover or lightbox for images?

---

## 6. Content & interaction model → Sanity schema implications

Based on what's confirmed, your Sanity schema likely needs at minimum:

```
product {
  title
  slug
  category[] // reference or string array: sleep | live | eat | work
  heroImage (square, ~1:1 — shoot/crop accordingly)
  gallery[] (for PDP, unconfirmed layout)
  description
  price (unconfirmed if shown)
  materials / dimensions (unconfirmed fields)
}
```

Recommend checking the Sanity Studio schema itself if you have/can get access, or reverse-engineer from the GROQ queries visible in the Network tab (see verification steps below) — this will save guessing at field names/structure.

---

## 7. Build sequencing recommendation (for Cursor)

Don't prompt "build the whole site." Sequence it as:

1. **Design tokens & layout shell** — colors, type scale, spacing, grid breakpoints (needs your visual audit — see below)
2. **Header/nav** (static, no interaction yet)
3. **Homepage grid** — static layout first, real images, correct aspect ratios and spacing
4. **Homepage interactions** — zoom control, filter tabs (once Section 4 is verified)
5. **PDP layout** — static, once Section 5 is verified
6. **PDP interactions** (gallery, configurator if any)
7. **Footer + remaining pages** (About/Contact/etc. once Section 2 is confirmed)
8. **Polish pass** — transitions between pages, hover states, loading states

Feed this brief file into Cursor's context (e.g. `/docs/ux-brief.md` in your repo) for every step, and update the ⚠️ sections to ✅ as you verify — that running document is what keeps the AI's output converging on the real thing instead of drifting.

---

## 8. How to verify the ⚠️ items (quick guide)

- **Full site map:** open lusano.com, click every nav link, footer link, and any hamburger menu items. Also try `view-source:` or devtools Elements tab to find `<a>` tags not visible in the rendered nav.
- **Interaction behavior:** screen record (QuickTime on Mac, Xbox Game Bar on Windows, or just your phone) doing the scroll/zoom/filter actions above.
- **Data model:** Devtools → Network tab → filter by "Fetch/XHR" → reload the page → look for requests to `apicdn.sanity.io` — the request payload will show the exact GROQ query and response shape, which tells you the real schema.
- **Visual tokens:** Devtools → Elements → inspect a heading and body text for the computed font-family/size/weight/line-height, and inspect the page background/text for hex colors. Screenshot key breakpoints (mobile ~390px, tablet ~768px, desktop ~1440px).

---

## Open questions for you

1. Confirm: does the homepage grid loop/repeat on scroll, or is it a fixed-length grid?
2. What does zoom actually change visually?
3. Full list of nav/footer pages beyond home + PDP?
4. Is there a cart/checkout, or is this catalog-only (enquire/contact instead)?
5. Any specific "brief" requirements from your project (different content categories, different product structure, additional pages) that should diverge from Lusano's model rather than replicate it?
