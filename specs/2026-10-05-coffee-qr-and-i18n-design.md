# Buy-a-Coffee QR reveal + EN/DE i18n — design

Date: 2026-10-05
Status: approved in chat, pending review of this document

## Goal

Two independent changes to the portfolio site:

- **Part A.** Clicking a "Buy" button in the coffee popover scrolls the popover down to
  the QR / UPI block instead of navigating away.
- **Part B.** Add an English / German switcher. German pages are built as real static
  pages under `/de/`, with per-string fallback to English so untranslated content still
  renders.

Part A is a self-contained bug-fix-sized change to existing code. Part B introduces a
new localization layer and is the larger of the two.

## Constraints and context

- Eleventy 2.0.1, Nunjucks, static output to `docs/` (GitHub Pages, served from the
  domain root, so root-relative URLs are valid).
- Site is a single-language personal portfolio. All prose lives in `src/_data/*.json`
  plus a handful of hardcoded strings in templates. There is no i18n layer today.
- German copy is machine-written by the implementer and reviewed by the site owner.
  Technical CV content (job titles, company names, long work-experience descriptions,
  project article titles) deliberately stays English.
- `docs/` is build output and is deleted outright on a clean build. Nothing that must
  survive a rebuild may live under `docs/`. This is why the spec lives in `specs/`.

---

## Part A — coffee popover scrolls to the QR

### Current behaviour

`.coffee-popover` is `position: fixed` with `max-height: calc(100vh - 190px)` and
`overflow-y: auto`, so it is its own scroll container. Each coffee card renders
`<a class="btn btn-buy" href="{{ item.link }}" target="_blank">`. Those `item.link`
values are `https://example.com/pay/...` placeholders and are not real payment URLs.

### Design

1. `src/_includes/partials/coffee.html`
   - Give the QR wrapper `id="coffee-qr"`.
   - The QR/UPI block is currently rendered *below* the item grid, separated by a
     "or" divider. Keep that order.
   - Buttons keep their existing class for styling but no longer act as navigation.
2. `src/js/main.js`
   - Delegated click handler on the popover for `.btn-buy`:
     `event.preventDefault()`, then
     `qr.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })`.
   - Because the popover is the scroll container, this animates the popover only. The
     page itself must not scroll.
   - If the popover content is short enough not to overflow (tall viewport, few cards),
     there is nothing to scroll. In that case flash an outline on `#coffee-qr` for
     ~1.2s so the click still produces visible feedback. Detect via
     `el.scrollHeight > el.clientHeight`.
   - Do not open a new tab. The GitHub Sponsors link already in the popover remains the
     non-UPI route.

### Edge cases

- `prefers-reduced-motion: reduce` → `behavior: 'auto'`, matching the existing reduced
  motion handling in the stylesheet.
- Popover closed when clicked → impossible, buttons only exist inside it.
- Repeated clicks → each call re-scrolls; the flash restarts. No state to corrupt.

### Testing

- Click a `.btn-buy`; assert the popover's `scrollTop` increased.
- Assert `window.scrollY` did not change.
- Assert no new tab / navigation occurred.
- Assert `#coffee-qr` is within the popover's visible bounds after the click.

---

## Part B — EN/DE switcher

### Chosen approach

Sparse German overlay files under `src/de/_data/`, each of which deep-merges over the
corresponding English JSON.

Rejected alternatives:

- **A single `t` namespace.** Templates would read `{{ t.about.title }}`. Tidier in
  principle, but it is a mechanical edit to every prose reference across five templates,
  and it puts a standing trap in front of future authors.
- **Complete duplicate German JSON trees.** Abandons per-key fallback: every file must
  be complete, and duplicating ~7KB of resume and project copy guarantees it drifts.

### Structure

```
src/
  _data/home.json              new. Holds headings currently hardcoded in home.html.
  _data/*.json                 English base. Otherwise untouched. Source of truth + fallback.
  de/
    _data/merge.js             deepMerge helper (~10 lines)
    _data/about.js             module.exports = deepMerge(en, de)
    _data/contact.js
    _data/coffee.js
    _data/home.js
    _data/service.js
    _data/skill.js
    _data/portfolio.js
    i18n/de/*.json             sparse German strings only
    index.md                   permalink /de/                    layout home.html
    projects.md                permalink /de/projects/index.html layout project.html
  _includes/partials/lang.html EN | DE switcher (new; included by base.html)
```

Eleventy's data cascade already scopes `src/de/_data/` to pages beneath `/de/`, so the
existing templates need no locale-specific variants. Because each German data file
starts from the complete English object, per-key fallback is automatic: omit
`about.paragraph2` from `src/de/i18n/de/about.json` and the English sentence is served.

### Path fix (prerequisite)

Asset URLs are currently relative. `layouts/base.html` requests `css/style.css` and
`src/_data/portfolio.json` holds `images/profilepic.jpeg` and `../images/profilepic.jpeg`.
From `/de/` these resolve to `/de/css/...` and `/de/images/...` and 404.

This is a pre-existing defect: `/projects/index.html` already fails to load its CSS and
JS for the same reason. Adding `/de/` makes it unavoidable, so it is fixed as part of
Part B by switching to root-relative URLs (`/css/style.css`, `/images/...`). Valid for
this site because it is served from the domain root, and it repairs `/projects/` as a
side effect.

### Locale-aware URLs

Internal links must stay within the current locale. Add `localePath(path)` to
`.eleventy.js`, which inspects `page.url` and prefixes `/de` when the current page is
German. Used by:

- navbar brand `/`
- home → projects (`/projects/`)
- topic anchors on home (`/projects/#arduino`)
- the switcher itself

Because the projects page is built as `index.html` under a directory permalink, the
paths are not symmetrical: `/de/projects/index.html` maps back to `/projects/index.html`,
and `/projects/` maps to `/de/`. `localePath` therefore takes the *target* path and
rewrites only the leading `/de` segment in either direction. It must not assume the two
locales' paths are mirror images, and it must leave external URLs (`https://…`, `mailto:`,
`#anchor`-only) untouched.

No front matter is required; the locale is derived from the URL so it cannot drift out
of sync with the page's actual location.

### Switcher

`partials/lang.html`, included by `base.html`, therefore present on all four pages.

- Fixed `EN | DE` pill, top-right, `#ff9000` to match the existing accent.
- `position: fixed`, above the cover image.
- The current language renders as inert text (`aria-current="true"`); the other language
  is a real `<a>` to that locale's equivalent URL.
- Pure HTML. No JavaScript, no `localStorage`, no browser-language sniffing. The browser
  back button works and URLs stay shareable.

### SEO

- `<html lang="de">` on German pages, `lang="en"` on English, derived from `page.url`.
- `<link rel="alternate" hreflang="en">`, `hreflang="de">`, and `x-default` pointing at
  English.
- `<title>` and `<meta name="description">` localized. `base.html` currently hardcodes
  the description; it becomes a data key.

### Content scope

*Translated:*

- switcher labels
- navbar name
- "About Me", "Work Experience" headings (`home.html`)
- `portfolio.tag`, `portfolio.profession`
- `about.title`, `about.paragraph1`, `about.paragraph2`, and the About field labels
  (Full Name, Phone, Email, Languages, Nationality)
- `contact.*`
- `service.*`, `skill.*`
- `projects.title`, `projects.topics[*].title`
- `resume.title` (section heading only)
- all `coffee.*` strings: title, button text, buy text, description, item titles and
  descriptions, divider, close/copy labels, UPI fallback note

*Left English via fallback:*

- `resume.work_experience[*].position`, `.company`, `.description`
- `resume.education[*]`
- `projects.topics[*].articles[*].title`
- proper nouns, URLs, phone, email, nationality codes

Rationale: bad machine-translated CV copy is worse than none. A reader who hits the
English fallback sees a coherent English sentence rather than garbled German.

### Strings that move out of templates and into data

Currently hardcoded, and where they must go:

| String | File | New key |
|---|---|---|
| `About Me` | `layouts/home.html` | `home.about_heading` |
| `Work Experience` | `layouts/home.html` | `home.work_experience_heading` |
| `Contact Me` | `partials/cta.html` | `contact.button` |
| `Vijay Pratap Singh` (navbar) | `partials/site-head.html` | reuse `portfolio.name` |
| `Electronics / Embedded Engineer` (meta) | `layouts/base.html` | reuse `portfolio.profession` |
| `Close`, `Copy`, `or`, QR fallback note | `partials/coffee.html` | `coffee.*` |

The two `home.html` headings need a new English `src/_data/home.json`; the other five
already have a host file.

### Testing

Extend `verify.mjs` with a locale block:

- `/de/` responds 200, `<html lang="de">`, zero CSS/JS/image 404s on that page.
- `/projects/` loads its CSS and JS (regression test for the path fix).
- Switcher on `/` links to `/de/`; switcher on `/de/` links to `/`; on `/de/projects/`
  it links to `/projects/`.
- `contact.title` is German on `/de/` and English on `/`.
- **Fallback proof:** `resume.work_experience[0].description` is byte-identical on `/`
  and `/de/`. This verifies per-key fallback behaviourally rather than by assertion.
- `hreflang` / `x-default` present and correct on both pages.
- No console errors on `/de/`.

Plus the Part A coffee checks described above.

### Risks

- **Review burden.** Someone must proofread the German. Mitigation: all German strings
  live in `src/de/i18n/de/*.json`, so review is a single directory read with no
  template reading required.
- **Silent drift.** A German overlay could reference a key that no longer exists in
  English. Mitigation: the merge helper ignores unknown keys, and the fallback test
  catches the common case.
- **Mixed-language page.** By design, not a bug. `/de/` shows German headings over
  English resume entries.