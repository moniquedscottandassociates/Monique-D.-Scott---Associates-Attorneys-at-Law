/**
 * admin-dashboard.js
 * Monique D. Scott & Associates — Admin Dashboard Logic
 * Handles: Publications CRUD, Listings CRUD, File Uploads
 */

'use strict';

/* ── Supabase client (set by dashboard.html inline script) ───── */
var db; // assigned from window.adminDb

/* ── Constants ───────────────────────────────────────────────── */
var SUPABASE_URL = 'https://efvnklokllobqsoripxy.supabase.co';

/* ── Toast notification ──────────────────────────────────────── */
function toast(msg, type) {
    var el = document.getElementById('adm-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'adm-toast adm-toast--' + (type === 'err' ? 'err' : 'ok');
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3000);
}

/* ── Slug generator ──────────────────────────────────────────── */
function makeSlug(str) {
    return str.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/* ── Navigation ──────────────────────────────────────────────── */
function showPanel(name) {
    document.querySelectorAll('.adm-panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.adm-nav a').forEach(function (a) { a.classList.remove('active'); });

    var panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.add('active');

    var link = document.querySelector('.adm-nav a[data-panel="' + name + '"]');
    if (link) link.classList.add('active');

    document.getElementById('adm-page-title').textContent =
        name === 'publications' ? 'Publications' :
        name === 'listings'     ? 'Property Listings' :
                                  'File Uploads';

    if (name === 'publications') loadPublications();
    if (name === 'listings')     loadListings();
}

/* ════════════════════════════════════════════════════════════════
   PUBLICATIONS
════════════════════════════════════════════════════════════════ */

var editingPubId = null;

function loadPublications() {
    var tbody = document.getElementById('pub-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="adm-loading"><i class="fa fa-spinner fa-spin"></i> Loading…</td></tr>';

    db.from('publications')
        .select('id,slug,title,date,category,status,featured')
        .order('date', { ascending: false })
        .then(function (r) {
            if (r.error) { tbody.innerHTML = '<tr><td colspan="6">Error loading publications.</td></tr>'; return; }
            if (!r.data.length) { tbody.innerHTML = '<tr><td colspan="6" class="adm-empty"><i class="fa fa-newspaper"></i><br>No publications yet.</td></tr>'; return; }

            tbody.innerHTML = r.data.map(function (p) {
                return '<tr>' +
                    '<td>' + escHtml(p.title) + '</td>' +
                    '<td>' + escHtml(p.category || '—') + '</td>' +
                    '<td>' + (p.date ? p.date : '—') + '</td>' +
                    '<td>' + statusBadgePub(p.status) + '</td>' +
                    '<td>' + (p.featured ? '<span class="adm-badge adm-badge--feat">Featured</span>' : '') + '</td>' +
                    '<td><div class="adm-actions">' +
                    '<button class="adm-btn adm-btn--sm adm-btn--ghost" onclick="editPub(\'' + p.id + '\')"><i class="fa fa-pen"></i></button>' +
                    '<button class="adm-btn adm-btn--sm adm-btn--danger" onclick="deletePub(\'' + p.id + '\',\'' + escHtml(p.title).replace(/'/g, "\\'") + '\')"><i class="fa fa-trash"></i></button>' +
                    '</div></td>' +
                    '</tr>';
            }).join('');
        });
}

function statusBadgePub(s) {
    if (s === 'published') return '<span class="adm-badge adm-badge--pub">Published</span>';
    return '<span class="adm-badge adm-badge--draft">Draft</span>';
}

function openPubModal(id, data) {
    editingPubId = id || null;
    var d = data || {};
    document.getElementById('pub-modal-title').textContent = id ? 'Edit Publication' : 'New Publication';
    document.getElementById('pub-title').value      = d.title || '';
    document.getElementById('pub-slug').value       = d.slug  || '';
    document.getElementById('pub-date').value       = d.date  || '';
    document.getElementById('pub-category').value   = d.category || 'Legal Update';
    document.getElementById('pub-status').value     = d.status   || 'published';
    document.getElementById('pub-summary').value    = d.summary  || '';
    document.getElementById('pub-body').value       = d.body     || '';
    document.getElementById('pub-featured').checked = !!d.featured;
    document.getElementById('pub-doc-current').textContent   = d.document_file   ? ('Current: ' + d.document_file)   : '';
    document.getElementById('pub-image-current').textContent = d.featured_image ? ('Current: ' + d.featured_image) : '';
    document.getElementById('pub-modal').classList.add('open');
}

function closePubModal() {
    document.getElementById('pub-modal').classList.remove('open');
    editingPubId = null;
}

function editPub(id) {
    db.from('publications').select('*').eq('id', id).single().then(function (r) {
        if (r.error) { toast('Failed to load publication.', 'err'); return; }
        openPubModal(id, r.data);
    });
}

function deletePub(id, title) {
    if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
    db.from('publications').delete().eq('id', id).then(function (r) {
        if (r.error) { toast('Delete failed: ' + r.error.message, 'err'); return; }
        toast('Publication deleted.');
        loadPublications();
    });
}

async function savePub() {
    var btn = document.getElementById('pub-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';

    var title    = document.getElementById('pub-title').value.trim();
    var slug     = document.getElementById('pub-slug').value.trim() || makeSlug(title);
    var date     = document.getElementById('pub-date').value     || null;
    var category = document.getElementById('pub-category').value;
    var status   = document.getElementById('pub-status').value;
    var summary  = document.getElementById('pub-summary').value.trim();
    var body     = document.getElementById('pub-body').value;
    var featured = document.getElementById('pub-featured').checked;

    if (!title) { toast('Title is required.', 'err'); btn.disabled = false; btn.innerHTML = 'Save'; return; }

    // Handle file uploads
    var imageFile = document.getElementById('pub-image-file').files[0];
    var docFile   = document.getElementById('pub-doc-file').files[0];

    var featured_image = null;
    var document_file  = null;

    if (imageFile) {
        var imgPath = 'publications/' + Date.now() + '-' + imageFile.name.replace(/\s+/g, '-');
        var imgUpload = await db.storage.from('images').upload(imgPath, imageFile, { upsert: true });
        if (imgUpload.error) { toast('Image upload failed: ' + imgUpload.error.message, 'err'); btn.disabled = false; btn.innerHTML = 'Save'; return; }
        featured_image = SUPABASE_URL + '/storage/v1/object/public/images/' + imgPath;
    }

    if (docFile) {
        var docPath = 'publications/' + Date.now() + '-' + docFile.name.replace(/\s+/g, '-');
        var docUpload = await db.storage.from('documents').upload(docPath, docFile, { upsert: true });
        if (docUpload.error) { toast('Document upload failed: ' + docUpload.error.message, 'err'); btn.disabled = false; btn.innerHTML = 'Save'; return; }
        document_file = SUPABASE_URL + '/storage/v1/object/public/documents/' + docPath;
    }

    var payload = { title: title, slug: slug, date: date, category: category, status: status, summary: summary, body: body, featured: featured, updated_at: new Date().toISOString() };
    if (featured_image) payload.featured_image = featured_image;
    if (document_file)  payload.document_file  = document_file;

    var result;
    if (editingPubId) {
        result = await db.from('publications').update(payload).eq('id', editingPubId);
    } else {
        payload.created_at = new Date().toISOString();
        result = await db.from('publications').insert([payload]);
    }

    btn.disabled = false;
    btn.innerHTML = 'Save';

    if (result.error) { toast('Save failed: ' + result.error.message, 'err'); return; }
    toast(editingPubId ? 'Publication updated.' : 'Publication created.');
    closePubModal();
    loadPublications();
}

/* ════════════════════════════════════════════════════════════════
   LISTINGS
════════════════════════════════════════════════════════════════ */

var editingListingId = null;

function loadListings() {
    var tbody = document.getElementById('listing-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="adm-loading"><i class="fa fa-spinner fa-spin"></i> Loading…</td></tr>';

    db.from('listings')
        .select('id,slug,title,listing_type,price,status,featured')
        .order('created_at', { ascending: false })
        .then(function (r) {
            if (r.error) { tbody.innerHTML = '<tr><td colspan="6">Error loading listings.</td></tr>'; return; }
            if (!r.data.length) { tbody.innerHTML = '<tr><td colspan="6" class="adm-empty"><i class="fa fa-home"></i><br>No listings yet.</td></tr>'; return; }

            tbody.innerHTML = r.data.map(function (l) {
                return '<tr>' +
                    '<td>' + escHtml(l.title) + '</td>' +
                    '<td>' + escHtml(l.listing_type || '—') + '</td>' +
                    '<td>' + escHtml(l.price || '—') + '</td>' +
                    '<td>' + statusBadgeListing(l.status) + '</td>' +
                    '<td>' + (l.featured ? '<span class="adm-badge adm-badge--feat">Featured</span>' : '') + '</td>' +
                    '<td><div class="adm-actions">' +
                    '<button class="adm-btn adm-btn--sm adm-btn--ghost" onclick="editListing(\'' + l.id + '\')"><i class="fa fa-pen"></i></button>' +
                    '<button class="adm-btn adm-btn--sm adm-btn--danger" onclick="deleteListing(\'' + l.id + '\',\'' + escHtml(l.title).replace(/'/g, "\\'") + '\')"><i class="fa fa-trash"></i></button>' +
                    '</div></td>' +
                    '</tr>';
            }).join('');
        });
}

function statusBadgeListing(s) {
    if (s === 'available') return '<span class="adm-badge adm-badge--avail">Available</span>';
    if (s === 'pending')   return '<span class="adm-badge adm-badge--pending">Pending</span>';
    if (s === 'sold')      return '<span class="adm-badge adm-badge--sold">Sold/Let</span>';
    return '<span class="adm-badge adm-badge--draft">Draft</span>';
}

function openListingModal(id, data) {
    editingListingId = id || null;
    var d = data || {};
    document.getElementById('listing-modal-title').textContent = id ? 'Edit Listing' : 'New Listing';
    document.getElementById('lst-title').value        = d.title        || '';
    document.getElementById('lst-slug').value         = d.slug         || '';
    document.getElementById('lst-type').value         = d.listing_type || 'For Sale';
    document.getElementById('lst-price').value        = d.price        || '';
    document.getElementById('lst-location').value     = d.location     || '';
    document.getElementById('lst-parish').value       = d.parish       || 'Portland';
    document.getElementById('lst-status').value       = d.status       || 'available';
    document.getElementById('lst-summary').value      = d.summary      || '';
    document.getElementById('lst-body').value         = d.body         || '';
    document.getElementById('lst-featured').checked   = !!d.featured;
    document.getElementById('lst-image-current').textContent = d.featured_image ? ('Current: ' + d.featured_image) : '';

    // Show gallery preview
    var galleryPreview = document.getElementById('lst-gallery-preview');
    galleryPreview.innerHTML = '';
    if (d.gallery && d.gallery.length) {
        var imgs = Array.isArray(d.gallery) ? d.gallery : [];
        imgs.forEach(function (src) {
            var img = document.createElement('img');
            img.src = src;
            galleryPreview.appendChild(img);
        });
    }

    document.getElementById('listing-modal').classList.add('open');
}

function closeListingModal() {
    document.getElementById('listing-modal').classList.remove('open');
    editingListingId = null;
}

function editListing(id) {
    db.from('listings').select('*').eq('id', id).single().then(function (r) {
        if (r.error) { toast('Failed to load listing.', 'err'); return; }
        openListingModal(id, r.data);
    });
}

function deleteListing(id, title) {
    if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
    db.from('listings').delete().eq('id', id).then(function (r) {
        if (r.error) { toast('Delete failed: ' + r.error.message, 'err'); return; }
        toast('Listing deleted.');
        loadListings();
    });
}

async function saveListing() {
    var btn = document.getElementById('listing-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';

    var title        = document.getElementById('lst-title').value.trim();
    var slug         = document.getElementById('lst-slug').value.trim() || makeSlug(title);
    var listing_type = document.getElementById('lst-type').value;
    var price        = document.getElementById('lst-price').value.trim();
    var location     = document.getElementById('lst-location').value.trim();
    var parish       = document.getElementById('lst-parish').value;
    var status       = document.getElementById('lst-status').value;
    var summary      = document.getElementById('lst-summary').value.trim();
    var body         = document.getElementById('lst-body').value;
    var featured     = document.getElementById('lst-featured').checked;

    if (!title) { toast('Title is required.', 'err'); btn.disabled = false; btn.innerHTML = 'Save'; return; }

    // Featured image
    var imageFile = document.getElementById('lst-image-file').files[0];
    var featured_image = null;
    if (imageFile) {
        var imgPath = 'listings/' + Date.now() + '-' + imageFile.name.replace(/\s+/g, '-');
        var imgUpload = await db.storage.from('images').upload(imgPath, imageFile, { upsert: true });
        if (imgUpload.error) { toast('Image upload failed: ' + imgUpload.error.message, 'err'); btn.disabled = false; btn.innerHTML = 'Save'; return; }
        featured_image = SUPABASE_URL + '/storage/v1/object/public/images/' + imgPath;
    }

    // Gallery — multiple files
    var galleryFiles = document.getElementById('lst-gallery-files').files;
    var galleryUrls  = [];

    // Preserve existing gallery if editing and no new files uploaded
    if (editingListingId && galleryFiles.length === 0) {
        var existing = await db.from('listings').select('gallery').eq('id', editingListingId).single();
        if (existing.data && existing.data.gallery) galleryUrls = existing.data.gallery;
    }

    for (var i = 0; i < galleryFiles.length; i++) {
        var gFile = galleryFiles[i];
        var gPath = 'listings/gallery/' + Date.now() + '-' + i + '-' + gFile.name.replace(/\s+/g, '-');
        var gUpload = await db.storage.from('images').upload(gPath, gFile, { upsert: true });
        if (gUpload.error) { toast('Gallery upload failed: ' + gUpload.error.message, 'err'); }
        else { galleryUrls.push(SUPABASE_URL + '/storage/v1/object/public/images/' + gPath); }
    }

    var payload = { title: title, slug: slug, listing_type: listing_type, price: price, location: location, parish: parish, status: status, summary: summary, body: body, featured: featured, gallery: galleryUrls, updated_at: new Date().toISOString() };
    if (featured_image) payload.featured_image = featured_image;

    var result;
    if (editingListingId) {
        result = await db.from('listings').update(payload).eq('id', editingListingId);
    } else {
        payload.created_at = new Date().toISOString();
        result = await db.from('listings').insert([payload]);
    }

    btn.disabled = false;
    btn.innerHTML = 'Save';

    if (result.error) { toast('Save failed: ' + result.error.message, 'err'); return; }
    toast(editingListingId ? 'Listing updated.' : 'Listing created.');
    closeListingModal();
    loadListings();
}

/* ════════════════════════════════════════════════════════════════
   UPLOADS
════════════════════════════════════════════════════════════════ */

async function uploadFile() {
    var input  = document.getElementById('upload-file-input');
    var bucket = document.getElementById('upload-bucket').value;
    var file   = input.files[0];
    var btn    = document.getElementById('upload-btn');

    if (!file) { toast('Please select a file first.', 'err'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Uploading…';

    var path   = Date.now() + '-' + file.name.replace(/\s+/g, '-');
    var result = await db.storage.from(bucket).upload(path, file, { upsert: false });

    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-upload"></i> Upload';

    if (result.error) { toast('Upload failed: ' + result.error.message, 'err'); return; }

    var publicUrl = SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
    addUploadedItem(file.name, publicUrl, bucket);
    toast('File uploaded successfully.');
    input.value = '';
}

function addUploadedItem(name, url, bucket) {
    var list = document.getElementById('upload-results');
    var li   = document.createElement('li');
    li.innerHTML =
        '<span style="font-size:12px;color:var(--muted)">[' + bucket + ']</span> ' +
        '<span class="adm-upload-url" title="' + url + '">' + url + '</span>' +
        '<button class="adm-copy-btn" onclick="copyUrl(\'' + url.replace(/'/g, "\\'") + '\',this)">Copy URL</button>';
    list.prepend(li);
}

function copyUrl(url, btn) {
    navigator.clipboard.writeText(url).then(function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy URL'; }, 2000);
    });
}

/* ── Slug auto-fill ──────────────────────────────────────────── */
function wireSlugAuto(titleId, slugId) {
    var titleEl = document.getElementById(titleId);
    var slugEl  = document.getElementById(slugId);
    if (!titleEl || !slugEl) return;
    titleEl.addEventListener('input', function () {
        if (!slugEl._userEdited) {
            slugEl.value = makeSlug(titleEl.value);
        }
    });
    slugEl.addEventListener('input', function () {
        slugEl._userEdited = !!slugEl.value;
    });
}

/* ── HTML escape ─────────────────────────────────────────────── */
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    db = window.adminDb;

    // Nav
    document.querySelectorAll('.adm-nav a[data-panel]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            showPanel(this.dataset.panel);
        });
    });

    // Default panel
    showPanel('publications');

    // Slug auto-fill
    wireSlugAuto('pub-title', 'pub-slug');
    wireSlugAuto('lst-title', 'lst-slug');

    // Modal close on overlay click
    document.querySelectorAll('.adm-modal-overlay').forEach(function (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
});
