# Changes: coffee QR reveal + EN/DE localization

Date: 2026-10-05
Branch: `i18n-and-coffee-qr`
Merge base with `main`: `0c23a583ab8e8f4f3d9e06fb7d626be49b995178`
Design spec: `specs/2026-10-05-coffee-qr-and-i18n-design.md`

This document is the as-built record of the branch. It describes what shipped, why each
non-obvious decision was made, and how the work was verified. The design spec says *what*
was intended; this says *what actually happened*.

---

## 1. Summary

Two independent changes:

**Part A — coffee popover scrolls to the QR.** Clicking "Buy" in the coffee popover scrolled
the *browser window* to a QR code that was off-screen, so the page appeared to do nothing.
It now scrolls the popover to the QR instead, leaving the page where it was.

**Part B — English/German switcher.** German pages are built as real static pages under
`/de/`, with per-string fallback to English so untranslated content still renders. No
client-side translation, no browser-language sniffing, no `localStorage`.

Later in the session, at the site owner's request, the QR code was swapped from a
third-party QR generator URL to a local image (`src/images/upiqr.jpeg`) carrying a real
UPI ID.

### Final state

| | |
|---|---|
| Commits ahead of `main` | 12 — the 11 for this work, plus the pre-existing `ef87779` redesign |
| Files changed, this work only (`ef87779..HEAD`) | 48 (`+3284 / -125`) |
| Files changed, whole branch (`main..HEAD`) | 63 (`+8762 / -180`) |
| Pages built | 4 — `/`, `/projects/`, `/de/`, `/de/projects/` |
| `verify.mjs` | **64/64** (was 18/18 before this branch) |
| `test-deep-merge.mjs` | **20/20** |
| `test-locale-path.mjs` | **38/38** |
| `test-de-overlays.mjs` | **9 overlays** |

---

## 2. Commit history

Each commit is one task and is independently revertable.

```
2517e28 fix: German copy corrections and track the local UPI QR image
d7fa2ac feat: localized lang, canonical and hreflang metadata
21744d2 feat: fixed EN/DE language switcher on all four pages
4a95af7 feat: German pages with per-key English fallback
eb74432 fix: merge equal-length arrays per entry so sparse translations keep base fields
b85193f feat: deepMerge helper for per-key translation fallback
d2bafa0 refactor: move hardcoded UI copy into data files   (also fixes c069cd2)
c069cd2 feat: localePath and localeUrl helpers for locale-aware links
644acf6 fix: root-relative asset paths so nested pages load their CSS and JS
a2643ca fix: reduced-motion scroll and no-overflow flash for the coffee QR
31c2610 fix: Buy button reveals the coffee QR instead of navigating
```

---

## 3. Part A — coffee QR reveal

### 3.1 Problem

The popover is shorter than its content. The Buy button sat at the top and the QR code at
the bottom, so a naive `scrollIntoView` on the QR scrolled the *window*, pushing the hero
section up and out of view. The user clicked Buy and the page appeared to jump for no
reason.

### 3.2 Implementation

`src/js/main.js`, inside `coffeeWidget()`:

- The Buy control carries `id="coffee-qr"` on the QR wrapper.
- The click is delegated on the popover, so it survives DOM changes in the popover.
- `event.preventDefault()` stops the button's default action.
- `qrEl.scrollIntoView({ behavior: ..., block: "center" })` scrolls the nearest scrollable
  ancestor — the popover — not the page.
- The page's own scroll position is never touched.

### 3.3 Edge cases

| Case | Behaviour |
|---|---|
| `prefers-reduced-motion: reduce` | `behavior: "auto"` instead of `"smooth"` |
| Popover too short to scroll (`clientHeight >= scrollHeight`) | Falls back to a `.qr-flash` outline pulse |

The duration is data-driven via `data-qr-flash-ms` (`qr_flash_ms`, default `1200`), so the
flash length is not hardcoded in JavaScript.

Verified at both 1080px and 2400px viewport heights. The 2400px case matters: it is the
one where the popover stops overflowing and the scroll path is never taken.

### 3.4 QR image swap

`coffee.json` → `qr.image` now points at a local file rather than
`api.qrserver.com`:

```json
"image": "/images/upiqr.jpeg",
"upi_id": "8510945954@kotakbank"
```

Two problems were found and fixed here:

1. The value had been set to a bare `upiqr.jpeg`, which resolves to `/upiqr.jpeg` and
   **404s on every page, English included**. The file lives in `src/images/`, so the
   correct value is `/images/upiqr.jpeg`.
2. `src/images/upiqr.jpeg` was **untracked in git**. Local builds served it from disk, so
   all tests passed — but the image would have 404'd in production after deploy. Committed
   in `2517e28`.

Confirmed: `/images/upiqr.jpeg` → `200`, `/de/images/upiqr.jpeg` → `404` (correctly, and
proof that the root-relative form is required rather than incidental).

---

## 4. Part B — EN/DE localization

### 4.1 Structure

```
src/de/
  de.11tydata.js        Eleventy directory-data entry point for both German pages
  index.md              /de/
  projects.md           /de/projects/
  i18n/
    merge.js            deepMerge
    about.js  coffee.js  contact.js  home.js  portfolio.js
    projects.js  resume.js  service.js  skill.js        per-dataset merged objects
    de/
      *.json            nine German overlay files — all prose lives here
```

The layout puts **all German prose in `src/de/i18n/de/*.json`**, so proofreading the
translation is one directory read and requires reading no templates. This is the single
most important structural decision in Part B.

### 4.2 Two Eleventy 2.0 facts that cost the most time

Both were diagnosed from `TemplateData.js` source and `DEBUG=Eleventy:TemplateData` output
rather than guessed, after the naive approach silently produced English pages.

**Nested `_data` directories are not supported.** Eleventy has exactly one global data
directory (`src/_data/`). A per-directory data directory such as `src/de/_data/` does not
exist as a concept. The first implementation put merge modules there, and `/de/` rendered
pure English with no warning at all.

The only mechanism for directory-scoped data is a data file named after the directory:
`src/de/<dir-name>.<ext>`, discovered by `getLocalDataPaths()`.

**The file must be `de.11tydata.js`, not `de.js`.** The suffix loop builds its glob list
like this:

```js
for (let suffix of suffixes) {          // suffixes = [ '.11tydata', '' ]
  if (suffix && typeof suffix === "string") {   // <-- '' is falsy, skipped entirely
```

The empty-string suffix never contributes candidates, so bare `.js`/`.cjs` are never
globbed. Confirmed by the actual candidate list for `./src/de/index.md`:

```
de.11tydata.js, de.11tydata.cjs, de.11tydata.json, de.json, src.11tydata.*, src.json
```

`de.js` is absent. Renaming the file to `de.11tydata.js` immediately fixed the German pages.

### 4.3 Locale helpers

Added to `.eleventy.js` via `addNunjucksGlobal`. (The first attempt used `addGlobal`,
which does not exist in Eleventy 2.0.1 — it was caught only because the unit tests run the
*real* `UserConfig` rather than a hand-rolled stub.)

| Helper | Purpose |
|---|---|
| `localePath(currentUrl, path)` | Same path in the **other** locale — the switcher |
| `localeUrl(currentUrl, path)` | Same path in the **current** locale — internal links |
| `isGermanPage(url)` | Locale predicate, so templates never re-implement the test |
| `localeAlternate(url, lang)` | This page's path in a given locale — hreflang |

Two design points:

- **The helpers were split, not unified.** `localePath` was specified for the switcher, but
  internal links need the opposite behaviour — they must *not* drop a German visitor into
  English. One helper could not serve both, so `localeUrl` was added. A single
  higher-order helper would have been worse than two clearly-named ones.
- **`isGermanPage` exists to stop logic leaking into templates.** A template that wrote
  `page.url.indexOf('/de') === 0` would be a second, unanchored implementation of the
  locale rule. It is unit-tested against `/downloads/deep-link.pdf` and `/projectdesign/`,
  both of which must be `false`.

External URLs (`https:`), `mailto:`, and bare `#anchor` links pass through untouched in both
helpers.

### 4.4 Path mapping

The two locales are **not mirror images**, so the helpers rewrite only the leading `/de`
segment rather than prefixing blindly:

| English | German |
|---|---|
| `/` | `/de/` |
| `/projects/` | `/de/projects/` |

Note `/de/projects/`, not `/de/projects/index.html`. Both resolve on GitHub Pages, but
`page.url` is the canonical `/projects/`, so that is what the switcher emits.

### 4.5 Fallback semantics (`deepMerge`)

`src/de/i18n/merge.js` implements per-key fallback with these rules, all unit-tested:

| Rule | Reason |
|---|---|
| Unknown overlay keys are **ignored** at every depth | A stale translation must not crash or inject phantom keys |
| `undefined` is ignored | Absent means "not translated", not "delete" |
| `null` **replaces** | An explicit instruction to clear a value |
| Arrays of equal length merge **element-wise by index** | Lets `service` and `projects` translate a title while price/image/link fall back |
| Arrays of differing length **replace wholesale** | Index-wise merging past the end would be meaningless |

The equal-length-array rule was the one behavioural amendment: the initial whole-array
replacement forced sparse translations to re-specify every field of every item.

---

## 5. Data extraction (Task 3)

Strings were moved out of templates into `src/_data/*.json` so they could be translated:
`home.json` (new), plus headings, About field labels, contact, coffee labels, the site name
in the navbar, and the meta description/author. `base.html` no longer hardcodes them.

This commit also fixed the `addGlobal` → `addNunjucksGlobal` API error described above.

English output was verified byte-stable through this refactor.

---

## 6. Switcher

`src/_includes/partials/lang.html`, included by `base.html`.

- Fixed `EN | DE` pill, top-right, `#ff9000` to match the existing accent.
- `position: fixed`, above the cover image; `z-index: 1001` — clears the coffee FAB
  (`1000`) and stays far below the custom cursor (`999999`).
- The current language is **inert text** with `aria-current="true"`; the other language is
  a real `<a>` to that locale's equivalent page.
- Pure HTML. No JavaScript, no `localStorage`, no sniffing. URLs stay shareable and the
  back button works.

### Layout finding

`partials/site-head.html` — which contains the navbar — is included **only** by
`project.html`, not `home.html`. There is no navbar on the home pages at all. Asserting the
navbar brand link on `/de/` therefore queried `null` and aborted the run. Brand checks were
moved to the projects pages, where the navbar actually renders. The switcher was placed in
`base.html` per the spec, which is what makes it appear on all four pages despite the home
pages having no navbar.

---

## 7. Root-relative asset paths (prerequisite)

This had to land before any German page could exist. Shared CSS/JS references and all local
image paths were converted to root-relative form:

- 15 shared CSS/JS references in `base.html`
- `portfolio.json` image/cover paths
- `projects.json` topic image paths (6)

Without this, `/de/projects/` requested `/de/css/style.css` and rendered unstyled.

### Test reliability note

CDP `Network.responseReceived` proved unreliable for catching 404'd stylesheets — Chrome
caches 404 error entries for stylesheets but not scripts. The final check resolves every
URL straight out of the DOM and fetches it with `cache: "no-store"`, which does not depend
on network events at all.

---

## 8. SEO

- `<html lang="de">` / `lang="en"`, derived from `page.url`.
- `<link rel="canonical">`, plus `hreflang` `en`, `de`, and `x-default` (pointing at
  English).

`hreflang` requires **absolute** URLs. No site URL existed anywhere in the project — no
CNAME, nothing in the data files — so the owner confirmed `https://vijayprtap.github.io`.
It is stored as a single key, `site.url`, in `src/_data/site.json`, so it can be changed in
one place.

`localeAlternate(url, lang)` makes each page's `en`/`de` pair describe *that* page, so the
two tags always reference the same content rather than a fixed URL pair.

### Nunjucks has no ternary operator

`{{ isGermanPage(page.url) ? 'de' : 'en' }}` is valid Jinja2 but **not** valid Nunjucks. The
build failed with `expected variable end` at `base.html` line 2. Replaced with an explicit
`{% set %}` inside `{% if %}`.

The spec noted that `base.html` "currently hardcodes the description; it becomes a data
key". In fact it already used `portfolio.profession`, which the German overlay translates —
so no change was required. Recorded here because the spec and reality disagreed.

---

## 9. German copy

Copy is machine-written and **requires proofreading by the site owner**. Three errors found
and fixed during review:

| File | Was | Now |
|---|---|---|
| `about.json` | `Hallo !` | `Hallo!` |
| `contact.json` | `hire mich!` | `Hire mich!` |
| `coffee.json` | `geben Sie, was Ihnen passen vollkommen` | `geben Sie, was Ihnen vollkommen passt` |

### A test that was wrong, not the translation

The `contact.title` check initially required German umlauts and **failed against the
correct translation** — `Hire mich!` is proper German with none. The assertion now checks
that the value differs from English and contains `mich`. Worth recording: a localization
test written by pattern-matching rather than by reading the actual string will reject
correct translations.

### Translation scope

Translated: visitor-facing UI, headings, field labels, About prose, coffee copy, service and
topic titles.

Deliberately English (fallback): job titles, company names, long work-experience
descriptions, project article titles, technical skill names, URLs, proper nouns.

This produces mixed-language pages by design — German headings over English CV entries.

---

## 10. Verification

### Suites

| Suite | Result |
|---|---|
| `verify.mjs` (browser, CDP) | **64/64** |
| `test-deep-merge.mjs` | 20/20 |
| `test-locale-path.mjs` | 38/38 (13 + 11 + 6 + 8) |
| `test-de-overlays.mjs` | 9 overlays |

`test-locale-path.mjs` deliberately runs the **real** `UserConfig` rather than a stub. An
earlier stub exposed an `addGlobal` method that does not exist, so the test passed while the
actual build failed.

### Spec checklist, all closed

- `/de/` responds 200, `<html lang="de">`, zero CSS/JS/image 404s — 15 local assets all 200
- `/projects/` loads its CSS and JS (path-fix regression)
- Switcher on `/` → `/de/`, on `/de/` → `/`, on `/de/projects/` → `/projects/`
- `contact.title` English on `/`, German on `/de/`
- **Fallback proof:** `work_experience[0].description` byte-identical (85 chars both locales)
- `hreflang` / `x-default` present and correct on all four pages
- No console errors on `/de/`
- All Part A coffee checks

### Known pre-existing error

`js/google_map.js` throws on every page, English included:

```
Uncaught InvalidValueError: Map: Expected mapDiv of type HTMLElement but was passed null.
```

Unrelated to this branch; the home layout has no `#map` element. It is filtered
*explicitly* by name in the harness rather than by a blanket exception filter, so new
errors still surface.

### Build hygiene

`docs/` is build output and is deleted on a clean build, so the Eleventy watcher must be
stopped before source edits — otherwise it can delete passthrough files such as
`docs/js/jquery.min.js`. Anything that must survive a rebuild lives outside `docs/`.

---

## 11. Files changed by area

Counts are for this work only (`ef87779..HEAD`), excluding the earlier redesign commit.

| Area | Files |
|---|---|
| Eleventy config | `.eleventy.js` (1) |
| Data | `src/_data/` (7) |
| Layouts & partials | `src/_includes/` (6) |
| German | `src/de/` (22) |
| Scripts | `src/js/main.js` (1) |
| Styles | `src/css/style.css`, `src/sass/style.scss` (2, kept in sync) |
| Images | `src/images/upiqr.jpeg` (1) |
| Generated output | `docs/` (8, build output, committed) |

---

## 12. Open items

1. **Proofread the German.** Machine-written and only lightly reviewed. All prose is in
   `src/de/i18n/de/*.json`.
2. **Decide whether to merge.** 11 commits for this work are ahead of `ef87779`; nothing
   has been merged or pushed.
3. **`js/google_map.js`** still throws on every page. Out of scope here, but it is a real
   error and will show in any console.
4. `site.url` drives `hreflang` and `canonical`. If a custom domain is added later, change
   `site.url` — do not hardcode URLs in templates.
