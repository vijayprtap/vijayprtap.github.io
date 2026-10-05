# Coffee QR Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a "Buy" button in the coffee popover scrolls the popover down to the QR / UPI block instead of navigating away.

**Architecture:** The popover is already `position: fixed` with `overflow-y: auto`, so it is its own scroll container. A delegated click handler on `document` calls `preventDefault()` then `scrollIntoView()` on a new `#coffee-qr` anchor. When the popover content is too short to overflow, a short outline flash on the QR provides the visual feedback instead.

**Tech Stack:** Vanilla JS (ES5-style `var`, matching `coffeeWidget`), Nunjucks, Eleventy, Edge via CDP.

**Spec:** `specs/2026-10-05-coffee-qr-and-i18n-design.md` (Part A)

## Global Constraints

- `src/js/main.js` uses `var`, double quotes, tabs, and jQuery-free vanilla JS. Match it.
- Never register a handler that assumes the popover is open; the buttons only exist while it is.
- `prefers-reduced-motion: reduce` must use `behavior: 'auto'`, never `'smooth'`.
- Verification runs against a live preview: Eleventy serving on `http://localhost:8080/`.
- **Stop Eleventy before editing sources, rebuild, restart.** The watcher rebuilds delete passthrough assets such as `docs/js/jquery.min.js`, which makes `main.js` fail to initialise and every check error out.
- Verification script lives at `C:\Users\dummy\AppData\Local\Temp\opencode\verify.mjs` (outside the repo, because `docs/` is deleted on a clean build). Run with `node "<that path>"`. Exit code 1 = failures, 2 = harness error.

## Review Focus

- **Popover content short enough not to overflow** (tall viewport, few cards): `scrollIntoView` has nothing to scroll and the click looks like a dead button. A visible flash is required.
- **`prefers-reduced-motion: reduce`**: a smooth scroll fires anyway, which is exactly what that setting asks us not to do.
- **The existing outside-click handler** (`main.js:171`) closes the popover on any document click whose target is outside it. A `.btn-buy` is inside the popover, so it is exempt — but a new handler that calls `stopPropagation()` before the widget's own handlers run would break outside-click closing for *every* click.
- **`element.closest`**: the existing copy handler guards with `event.target.closest &&`. A click landing on an SVG child of the button has no `closest` on some engines; use the same guard.

---

### Task 1: Reveal the QR on Buy click

**Files:**
- Modify: `src/_includes/partials/coffee.html` (add `id="coffee-qr"` to `.coffee-qr-wrap`)
- Modify: `src/js/main.js` (`coffeeWidget`, after the close-button handler at line 165)
- Test: `C:\Users\dummy\AppData\Local\Temp\opencode\verify.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: DOM anchor `#coffee-qr` on the `.coffee-qr-wrap` element, present on every page that renders the coffee partial.

- [ ] **Step 1: Write the failing test**

Add this block inside `main()` in `verify.mjs`, after the desktop checks and before `console: no errors/warnings`:

```js
  // ============ COFFEE: Buy reveals the QR ============
  await evaluate(`document.getElementById('coffee-fab').click(); true`);
  await settle(600);

  const before = await evaluate(`(() => {
    const p = document.getElementById('fh5co-coffee');
    return { open: p.classList.contains('open'), scrollTop: p.scrollTop,
             overflows: p.scrollHeight > p.clientHeight, pageY: window.scrollY };
  })()`);
  check('coffee: popover opens from the FAB', before.open, JSON.stringify(before));
  check('coffee: popover overflows so a scroll is possible', before.overflows,
        `scrollHeight>clientHeight=${before.overflows}`);
  check('coffee: has a #coffee-qr anchor', true, '');

  const hasQr = await evaluate(`!!document.getElementById('coffee-qr')`);
  check('coffee: QR wrapper exposes id="coffee-qr"', hasQr, `#coffee-qr present=${hasQr}`);

  await evaluate(`document.querySelector('.btn-buy').click(); true`);
  await settle(900);

  const after = await evaluate(`(() => {
    const p = document.getElementById('fh5co-coffee');
    const qr = document.getElementById('coffee-qr');
    const pr = p.getBoundingClientRect(), qrR = qr.getBoundingClientRect();
    return { scrollTop: p.scrollTop, pageY: window.scrollY,
             qrInView: qrR.top >= pr.top && qrR.bottom <= pr.bottom };
  })()`);
  check('coffee: Buy scrolls the popover to the QR', after.scrollTop > before.scrollTop,
        `scrollTop ${before.scrollTop} -> ${after.scrollTop}`);
  check('coffee: Buy does not scroll the page', after.pageY === before.pageY,
        `window.scrollY ${before.pageY} -> ${after.pageY}`);
  check('coffee: QR ends up visible inside the popover', after.qrInView, JSON.stringify(after));
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node "C:\Users\dummy\AppData\Local\Temp\opencode\verify.mjs"`

Expected: `coffee: Buy scrolls the popover to the QR` FAILS (`scrollTop` stays `0`) and
`coffee: QR wrapper exposes id="coffee-qr"` FAILS. The other checks in this block pass.
Total drops from `18/18` to `16/18`.

- [ ] **Step 3: Add the id in `coffee.html`**

Change the QR wrapper opening tag to include `id="coffee-qr"`. It is inside the
`{% if coffee.qr %}` block:

```html
    <div class="coffee-qr-wrap" id="coffee-qr">
```

- [ ] **Step 4: Add the delegated handler in `main.js`**

Insert after the `if(closeBtn) { ... }` block (ends line 169). Note it deliberately does
**not** call `stopPropagation()`, so the outside-click handler keeps working:

```js
		// A "Buy" button reveals the payment QR rather than following
		// item.link: those are placeholders, and the QR plus the UPI id are
		// the actual way to pay. The popover is its own scroll container,
		// so this animates the panel and leaves the page where it is.
		var qrEl = document.getElementById("coffee-qr");
		if(qrEl) {
			document.addEventListener("click", function(event) {
				var trigger = event.target.closest && event.target.closest(".btn-buy");
				if(!trigger || !popover.contains(trigger)) { return; }
				event.preventDefault();
				var smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				qrEl.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
			});
		}
```

- [ ] **Step 5: Rebuild and confirm it passes**

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess -Force
Remove-Item -Recurse -Force docs
npx @11ty/eleventy
Start-Process npx -ArgumentList "@11ty/eleventy","--serve","--port=8080" -WindowStyle Hidden
```

Wait for `http://localhost:8080/` to answer 200, then re-run `verify.mjs`.

Expected: `20/20 passed`. The four new coffee checks are green.

- [ ] **Step 6: Commit**

```bash
git add src/js/main.js src/_includes/partials/coffee.html docs
git commit -m "fix: Buy button reveals the coffee QR instead of navigating"
```

---

### Task 2: Edge cases — reduced motion and no-overflow feedback

**Files:**
- Modify: `src/_data/coffee.json` (new `qr_flash_ms`)
- Modify: `src/js/main.js` (`coffeeWidget`, same handler as Task 1)
- Test: `C:\Users\dummy\AppData\Local\Temp\opencode\verify.mjs`

**Interfaces:**
- Consumes: `#coffee-qr` (Task 1).
- Produces: `data-qr-flash-ms` on the `.coffee-popover` element, read by the handler.

- [ ] **Step 1: Write the failing tests**

Add after the Task 1 coffee block:

```js
  // reduced motion: the scroll must not be animated
  await send('Emulation.setEmulatedMedia', { media: 'screen', features: [
    { name: 'prefers-reduced-motion', value: 'reduce' }] }, S);
  await load(BASE, desktop, finePointer);
  await evaluate(`document.getElementById('coffee-fab').click(); true`);
  await settle(600);
  const rm = await evaluate(`(() => {
    const p = document.getElementById('fh5co-coffee');
    p.scrollTop = 0;
    let behavior = 'not-called';
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(o) { behavior = o && o.behavior; };
    document.querySelector('.btn-buy').click();
    Element.prototype.scrollIntoView = orig;
    return { behavior, matched: matchMedia('(prefers-reduced-motion: reduce)').matches };
  })()`);
  check('coffee: reduced motion skips the smooth scroll', rm.matched && rm.behavior === 'auto',
        `matched=${rm.matched} behavior=${rm.behavior}`);
  await send('Emulation.setEmulatedMedia', { media: 'screen', features: [] }, S);

  // a viewport too tall to overflow must still give feedback
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 2400, deviceScaleFactor: 1, mobile: false }, S);
  await load(BASE, desktop, finePointer);
  await evaluate(`document.getElementById('coffee-fab').click(); true`);
  await settle(600);
  const flash = await evaluate(`(() => {
    const p = document.getElementById('fh5co-coffee');
    document.querySelector('.btn-buy').click();
    return { overflows: p.scrollHeight > p.clientHeight,
             flashed: document.getElementById('coffee-qr').classList.contains('qr-flash') };
  })()`);
  check('coffee: tall viewport does not overflow', flash.overflows === false, `overflows=${flash.overflows}`);
  check('coffee: non-overflowing popover still flashes the QR', flash.flashed, JSON.stringify(flash));
  await send('Emulation.setDeviceMetricsOverride', desktop, S);
```

- [ ] **Step 2: Run it and confirm they fail**

Run: `node "C:\Users\dummy\AppData\Local\Temp\opencode\verify.mjs"`

Expected: `coffee: non-overflowing popover still flashes the QR` FAILS. The reduced-motion
check PASSES already, because Task 1 reads the media query — keep it as a regression guard
against that line being changed.

- [ ] **Step 3: Add `qr_flash_ms` to `coffee.json`**

```json
"qr_flash_ms": 1200,
```

Place it directly after `"buy_text"`. Update the `"//"` comment at the top of the file to
mention that `qr_flash_ms` is optional and defaults to 1200.

- [ ] **Step 4: Read the value in `coffeeWidget`**

Immediately after `var qrEl = document.getElementById("coffee-qr");`, add:

```js
			var flashMs = parseInt(popover.getAttribute("data-qr-flash-ms"), 10);
			if(!isFinite(flashMs)) { flashMs = 1200; }
```

- [ ] **Step 5: Add the flash branch**

Replace the last two lines of the handler body from Task 1 so the whole call becomes:

```js
				event.preventDefault();
				var smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				// Nothing to scroll in a tall viewport, so fall back to a
				// short outline pulse to acknowledge the click.
				if(popover.scrollHeight > popover.clientHeight) {
					qrEl.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
				} else {
					qrEl.classList.add("qr-flash");
					setTimeout(function() { qrEl.classList.remove("qr-flash"); }, flashMs);
				}
```

- [ ] **Step 6: Emit the attribute in `coffee.html`**

Change the popover opening tag to:

```html
<div class="coffee-popover" id="fh5co-coffee" role="dialog" aria-label="{{ coffee.title }}"
    data-qr-flash-ms="{{ coffee.qr_flash_ms | default: 1200 }}">
```

- [ ] **Step 7: Add the CSS**

Append to `src/css/style.css` and mirror in `src/sass/style.scss` (the two are kept in
sync by hand):

```css
.coffee-qr-wrap.qr-flash {
	outline: 2px solid #1cd6ac;
	outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
	.coffee-qr-wrap.qr-flash {
		outline-color: #1cd6ac;
	}
}
```

The reduced-motion block is a no-op on purpose: it documents that the flash is an
instant outline swap, not an animation, so nothing needs disabling.

- [ ] **Step 8: Rebuild and confirm it passes**

Repeat the Step 5 rebuild from Task 1, then run `verify.mjs`.

Expected: `22/22 passed`.

- [ ] **Step 9: Commit**

```bash
git add src/js/main.js src/_data/coffee.json src/_includes/partials/coffee.html src/css/style.css src/sass/style.scss docs
git commit -m "fix: reduced-motion scroll and no-overflow flash for the coffee QR"
```

---

## Final verification

```powershell
node "C:\Users\dummy\AppData\Local\Temp\opencode\verify.mjs"
```

Expected: `22/22 passed`, exit code 0, and no new console errors. Confirm the four
pre-existing Google Maps console items are still the only ignored entries.