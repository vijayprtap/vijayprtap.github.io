module.exports = config => {
    config.addPassthroughCopy("src/js");
    config.addPassthroughCopy("src/css");
    config.addPassthroughCopy("src/sass");
    config.addPassthroughCopy("src/fonts");
    config.addPassthroughCopy("src/images");

    const isGermanUrl = url => typeof url === 'string' && /^\/de(\/|$)/.test(url);
    const isRootRelative = path => typeof path === 'string' && path.charAt(0) === '/';

    // Same path, but in the OTHER locale - used by the language switch.
    // The caller passes the root-relative English path of the page it is on, so
    // the result is that same page in the other locale. currentUrl is an
    // argument because a Nunjucks global has no reliable `this`, and the file
    // exports `module.exports = config => {}`, which Eleventy calls plainly, so
    // `this` is not the config object either.
    // Only the leading /de segment is rewritten, in either direction: the two
    // locales are not mirror images - the projects page builds as
    // <locale>/projects/index.html - so blind prefixing would yield /de/de/.
    // Anything not root-relative (https:, mailto:, #anchor) passes through.
    config.addNunjucksGlobal('localePath', (currentUrl, path) => {
        if (!isRootRelative(path)) { return path; }
        return isGermanUrl(currentUrl) ? (path.replace(/^\/de(?=\/|$)/, '') || '/') : '/de' + path;
    });

    // Same path in the CURRENT locale - for internal links, which must not
    // silently drop a German visitor into the English site.
    config.addNunjucksGlobal('localeUrl', (currentUrl, path) => {
        if (!isRootRelative(path)) { return path; }
        return isGermanUrl(currentUrl) && !isGermanUrl(path) ? '/de' + path : path;
    });

    // The switcher needs the same predicate the helpers use. Exposed so templates
    // never re-implement the /de test (and get it subtly wrong).
    config.addNunjucksGlobal('isGermanPage', (currentUrl) => isGermanUrl(currentUrl));

    // This page's own path in the requested locale. hreflang needs the EN and the
    // DE counterpart of whichever page is rendering, so the two tags always
    // point at the same content rather than at a fixed pair of URLs.
    config.addNunjucksGlobal('localeAlternate', (currentUrl, lang) => {
        if (lang === 'de') { return isGermanUrl(currentUrl) ? currentUrl : '/de' + currentUrl; }
        return isGermanUrl(currentUrl) ? currentUrl.replace(/^\/de(?=\/|$)/, '') || '/' : currentUrl;
    });

    return {
        markdownTemplateEngine: 'njk',
        dataTemplateEngine: 'njk',
        htmlTemplateEngine: 'njk',
        dir: {
            input: 'src',
            output: 'docs'
        }
    };
};