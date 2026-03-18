/**
 * cms-renderer.js
 * Monique D. Scott & Associates — Client-Side CMS Content Renderer
 *
 * Reads JSON index files and individual markdown files, then builds UI.
 * Used by: publications.html, publication-single.html,
 *           listings.html, listing-single.html, and homepage preview sections.
 */

'use strict';

/* ── Utilities ───────────────────────────────────────────────── */

/**
 * Parse YAML front matter from a raw markdown string.
 * Returns { data: {}, body: '' }
 */
function mdsParseMarkdown(raw) {
    var fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (!fmMatch) return { data: {}, body: raw };

    var data = {};
    fmMatch[1].split(/\r?\n/).forEach(function (line) {
        var ci = line.indexOf(': ');
        if (ci === -1) return;
        var key = line.slice(0, ci).trim();
        var val = line.slice(ci + 2).trim().replace(/^["']|["']$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        data[key] = val;
    });

    return { data: data, body: fmMatch[2] };
}

/**
 * Format an ISO date string to "January 20, 2025" style.
 */
function mdsFormatDate(dateStr) {
    if (!dateStr) return '';
    try {
        var d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-JM', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return dateStr; }
}

/**
 * Get a URL query parameter value.
 */
function mdsParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

/**
 * Truncate a string to maxLen characters, adding ellipsis if needed.
 */
function mdsTruncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen).trimEnd() + '…' : str;
}

/* ── Publication Card Builder ────────────────────────────────── */

function mdsBuildPubCard(item, delay) {
    delay = delay || 0;
    var imgHtml = item.featured_image
        ? '<img src="' + item.featured_image + '" alt="' + mdsSafe(item.title) + '" loading="lazy">'
        : '<div class="mds-pub-card__image-placeholder"><i class="fa fa-file-alt"></i></div>';

    return (
        '<div class="col-lg-4 col-md-6 d-flex">' +
        '<article class="mds-pub-card wow fadeInUp" data-wow-delay="' + delay + 'ms" style="width:100%">' +
        '<div class="mds-pub-card__image">' + imgHtml +
        '<span class="mds-pub-card__category">' + mdsSafe(item.category || 'Publication') + '</span>' +
        '</div>' +
        '<div class="mds-pub-card__body">' +
        '<p class="mds-pub-card__date">' + mdsFormatDate(item.date) + '</p>' +
        '<h3 class="mds-pub-card__title">' + mdsSafe(item.title) + '</h3>' +
        '<p class="mds-pub-card__summary">' + mdsSafe(mdsTruncate(item.summary, 140)) + '</p>' +
        '<a href="/publication-single.html?slug=' + encodeURIComponent(item.slug) + '" class="mds-pub-card__link">' +
        'Read More <i class="fa fa-arrow-right"></i>' +
        '</a>' +
        '</div>' +
        '</article>' +
        '</div>'
    );
}

/* ── Listing Card Builder ────────────────────────────────────── */

function mdsBuildListingCard(item, delay) {
    delay = delay || 0;
    var imgHtml = item.featured_image
        ? '<img src="' + item.featured_image + '" alt="' + mdsSafe(item.title) + '" loading="lazy">'
        : '<div class="mds-listing-card__image-placeholder"><i class="fa fa-home"></i></div>';

    return (
        '<div class="col-lg-4 col-md-6 d-flex">' +
        '<div class="mds-listing-card wow fadeInUp" data-wow-delay="' + delay + 'ms" style="width:100%">' +
        '<div class="mds-listing-card__image">' + imgHtml +
        '<span class="mds-listing-card__badge">' + mdsSafe(item.listing_type || 'Listing') + '</span>' +
        '</div>' +
        '<div class="mds-listing-card__body">' +
        '<p class="mds-listing-card__price">' + mdsSafe(item.price || 'Price on Request') + '</p>' +
        '<h3 class="mds-listing-card__title">' + mdsSafe(item.title) + '</h3>' +
        '<p class="mds-listing-card__location"><i class="fa fa-map-marker-alt" style="margin-right:6px;opacity:.6;font-size:11px;"></i>' + mdsSafe(item.location || item.parish || '') + '</p>' +
        '<p class="mds-listing-card__summary">' + mdsSafe(mdsTruncate(item.summary, 130)) + '</p>' +
        '<a href="/listing-single.html?slug=' + encodeURIComponent(item.slug) + '" class="mds-listing-card__link">' +
        'View Details <i class="fa fa-arrow-right"></i>' +
        '</a>' +
        '</div>' +
        '</div>' +
        '</div>'
    );
}

/* ── Safe HTML escape ────────────────────────────────────────── */
function mdsSafe(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ── Render Publications Grid ────────────────────────────────── */
function mdsRenderPublications(containerId, opts) {
    opts = opts || {};
    var el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '<div class="mds-state"><i class="fa fa-spinner fa-spin"></i><p>Loading publications&hellip;</p></div>';

    fetch('/content/publications-index.json?v=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (items) {
            if (opts.featuredOnly) items = items.filter(function (i) { return i.featured; });
            if (opts.limit) items = items.slice(0, opts.limit);
            if (opts.category) items = items.filter(function (i) { return i.category === opts.category; });

            if (!items.length) {
                el.innerHTML = '<div class="col-12"><div class="mds-state"><i class="fa fa-newspaper"></i><p>No publications found.</p></div></div>';
                return;
            }

            el.innerHTML = items.map(function (item, idx) {
                return mdsBuildPubCard(item, idx * 100);
            }).join('');

            // Re-init WOW animations if available
            if (typeof WOW !== 'undefined') { new WOW({ live: false }).init(); }
        })
        .catch(function () {
            el.innerHTML = '<div class="col-12"><div class="mds-state"><i class="fa fa-exclamation-circle"></i><p>Unable to load publications.</p></div></div>';
        });
}

/* ── Render Listings Grid ────────────────────────────────────── */
function mdsRenderListings(containerId, opts) {
    opts = opts || {};
    var el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '<div class="mds-state"><i class="fa fa-spinner fa-spin"></i><p>Loading listings&hellip;</p></div>';

    fetch('/content/listings-index.json?v=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (items) {
            if (opts.type) items = items.filter(function (i) { return i.listing_type === opts.type; });
            if (opts.limit) items = items.slice(0, opts.limit);

            if (!items.length) {
                el.innerHTML = '<div class="col-12"><div class="mds-state"><i class="fa fa-home"></i><p>No listings found.</p></div></div>';
                return;
            }

            el.innerHTML = items.map(function (item, idx) {
                return mdsBuildListingCard(item, idx * 100);
            }).join('');

            if (typeof WOW !== 'undefined') { new WOW({ live: false }).init(); }
        })
        .catch(function () {
            el.innerHTML = '<div class="col-12"><div class="mds-state"><i class="fa fa-exclamation-circle"></i><p>Unable to load listings.</p></div></div>';
        });
}

/* ── Render Single Publication ───────────────────────────────── */
function mdsRenderSinglePublication(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var slug = mdsParam('slug');
    if (!slug) {
        el.innerHTML = '<div class="mds-state"><i class="fa fa-exclamation-circle"></i><p>No publication specified. <a href="/publications.html" style="color:#c7954a">View all publications</a></p></div>';
        return;
    }

    el.innerHTML = '<div class="mds-state"><i class="fa fa-spinner fa-spin"></i><p>Loading&hellip;</p></div>';

    fetch('/content/publications/' + encodeURIComponent(slug) + '.md?v=' + Date.now())
        .then(function (r) {
            if (!r.ok) throw new Error('Not found');
            return r.text();
        })
        .then(function (raw) {
            var parsed = mdsParseMarkdown(raw);
            var d = parsed.data;

            // Update page title
            document.title = (d.title || 'Publication') + ' | Monique D. Scott & Associates';

            // Render markdown body (requires marked.js on page)
            var bodyHtml = (typeof marked !== 'undefined')
                ? marked.parse(parsed.body)
                : '<pre>' + mdsSafe(parsed.body) + '</pre>';

            var featImg = d.featured_image
                ? '<img src="' + mdsSafe(d.featured_image) + '" alt="' + mdsSafe(d.title) + '" class="mds-article__feat-img">'
                : '';

            var dlBtn = d.document_file
                ? '<a href="' + mdsSafe(d.document_file) + '" class="mds-article__download" target="_blank" rel="noopener"><i class="fa fa-download"></i> Download Document</a>'
                : '';

            el.innerHTML =
                '<div class="mds-article-wrap">' +
                '<a href="/publications.html" class="mds-article__back"><i class="fa fa-arrow-left"></i> All Publications</a>' +
                '<span class="mds-article__category">' + mdsSafe(d.category || 'Publication') + '</span>' +
                '<h1 class="mds-article__title">' + mdsSafe(d.title) + '</h1>' +
                '<p class="mds-article__meta">' + mdsFormatDate(d.date) + '</p>' +
                featImg +
                '<div class="mds-article__body">' + bodyHtml + '</div>' +
                dlBtn +
                '</div>';
        })
        .catch(function () {
            el.innerHTML =
                '<div class="mds-state"><i class="fa fa-exclamation-circle"></i>' +
                '<p>Publication not found. <a href="/publications.html" style="color:#c7954a">View all publications</a></p></div>';
        });
}

/* ── Render Single Listing ───────────────────────────────────── */
function mdsRenderSingleListing(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var slug = mdsParam('slug');
    if (!slug) {
        el.innerHTML = '<div class="mds-state"><i class="fa fa-exclamation-circle"></i><p>No listing specified. <a href="/listings.html" style="color:#c7954a">View all listings</a></p></div>';
        return;
    }

    el.innerHTML = '<div class="mds-state"><i class="fa fa-spinner fa-spin"></i><p>Loading&hellip;</p></div>';

    fetch('/content/listings/' + encodeURIComponent(slug) + '.md?v=' + Date.now())
        .then(function (r) {
            if (!r.ok) throw new Error('Not found');
            return r.text();
        })
        .then(function (raw) {
            var parsed = mdsParseMarkdown(raw);
            var d = parsed.data;

            document.title = (d.title || 'Listing') + ' | Monique D. Scott & Associates';

            var bodyHtml = (typeof marked !== 'undefined')
                ? marked.parse(parsed.body)
                : '<pre>' + mdsSafe(parsed.body) + '</pre>';

            var featImg = d.featured_image
                ? '<img src="' + mdsSafe(d.featured_image) + '" alt="' + mdsSafe(d.title) + '" style="width:100%;max-height:420px;object-fit:cover;border-radius:6px;display:block;margin-bottom:32px;">'
                : '';

            var gallery = '';
            if (d.gallery && d.gallery.length) {
                var imgs = (Array.isArray(d.gallery) ? d.gallery : [d.gallery]).map(function (src) {
                    return '<img src="' + mdsSafe(src) + '" alt="Property image" loading="lazy">';
                }).join('');
                gallery = '<h3 style="font-family:\'Marcellus\',serif;color:#fff;margin-top:36px;margin-bottom:16px;">Gallery</h3><div class="mds-gallery">' + imgs + '</div>';
            }

            el.innerHTML =
                '<a href="/listings.html" class="mds-article__back"><i class="fa fa-arrow-left"></i> All Listings</a>' +
                '<div class="row gutter-y-30">' +
                '<div class="col-lg-8">' +
                featImg +
                '<span class="mds-pub-card__category" style="position:static;display:inline-block;margin-bottom:16px;">' + mdsSafe(d.listing_type || 'Listing') + '</span>' +
                '<h1 class="mds-article__title">' + mdsSafe(d.title) + '</h1>' +
                '<div class="mds-article__body">' + bodyHtml + '</div>' +
                gallery +
                '</div>' +
                '<div class="col-lg-4">' +
                '<div class="mds-property-detail">' +
                '<h3>Property Details</h3>' +
                '<ul class="mds-property-meta">' +
                mdsMetaRow('Price', d.price || 'Price on Request') +
                mdsMetaRow('Type', d.listing_type || '—') +
                mdsMetaRow('Location', d.location || '—') +
                mdsMetaRow('Parish', d.parish || '—') +
                mdsMetaRow('Status', d.status || '—') +
                '</ul>' +
                '<a href="/registration.html?type=property" class="procounsel-btn" style="display:block;text-align:center;">' +
                '<i>Enquire About This Property</i><span>Enquire About This Property</span>' +
                '</a>' +
                '</div>' +
                '</div>' +
                '</div>';
        })
        .catch(function () {
            el.innerHTML =
                '<div class="mds-state"><i class="fa fa-exclamation-circle"></i>' +
                '<p>Listing not found. <a href="/listings.html" style="color:#c7954a">View all listings</a></p></div>';
        });
}

function mdsMetaRow(label, val) {
    return '<li><span class="mds-property-meta__label">' + mdsSafe(label) + '</span><span class="mds-property-meta__val">' + mdsSafe(val) + '</span></li>';
}

/* ── Publications Filter ─────────────────────────────────────── */
function mdsInitFilter(filterId, gridId, renderFn) {
    var filterEl = document.getElementById(filterId);
    if (!filterEl) return;

    filterEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.mds-filter-btn');
        if (!btn) return;

        filterEl.querySelectorAll('.mds-filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var category = btn.dataset.filter === 'all' ? null : btn.dataset.filter;
        renderFn(gridId, { category: category });
    });
}

/* ── Registration: pre-select service from URL param ─────────── */
function mdsPreSelectService() {
    var type = mdsParam('type');
    if (!type) return;

    var select = document.getElementById('intake-service-type');
    if (!select) return;

    // Map URL param values to option values
    var map = {
        'conveyancing'  : 'Conveyancing & Property Transfer',
        'probate'        : 'Probate & Estate Administration',
        'family'         : 'Family Law Matter',
        'injury'         : 'Personal Injury Claim',
        'criminal'       : 'Criminal Defence',
        'property'       : 'Property Listing Submission',
        'consultation'   : 'General Consultation'
    };

    var target = map[type] || null;
    if (!target) return;

    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === target) {
            select.selectedIndex = i;
            break;
        }
    }
}
