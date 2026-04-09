/**
 * SCAI Connector — Elementor-Style WYSIWYG Article Editor JavaScript
 *
 * Handles: WYSIWYG block hover toolbars, sidebar add-component & edit,
 * reorder, delete, repeater add/remove, unsaved changes warning, AJAX save,
 * image preview updates, sidebar toggle, drag-and-drop reordering,
 * custom delete modal, field validation, undo/redo,
 * WordPress media library picker, live block preview updates.
 *
 * Expects `scaiEditor` global from wp_localize_script:
 *   { ajaxUrl, nonce, postId }
 */

(function () {
  'use strict';

  var hasChanges = false;
  var blocksContainer = document.getElementById('scai-editor-blocks');
  var form = document.getElementById('scai-editor-form');
  var saveBtn = document.getElementById('scai-save-editor');

  if (!form || !blocksContainer) return;

  /* --- Sidebar edit mode references --- */
  var sidebar = document.getElementById('sce-sidebar');
  var sidebarBrowse = document.getElementById('sce-sidebar-browse');
  var sidebarEdit = document.getElementById('sce-sidebar-edit');
  var sidebarEditTitle = document.getElementById('sce-sidebar-edit-title');
  var sidebarEditFields = document.getElementById('sce-sidebar-edit-fields');
  var sidebarBack = document.getElementById('sce-sidebar-back');
  var sidebarExpand = document.getElementById('sce-sidebar-expand');
  var selectedBlock = null;
  var originalPreviewHtml = null;
  var blockWasEdited = false;

  /* --- Add-between insertion target --- */
  var pendingInsertTarget = null;

  /* --- Component label lookup --- */
  var componentLabels = {
    'scai-h1': 'Article Title',
    'scai-featured-image': 'Featured Image',
    'scai-overview': 'Overview',
    'scai-table-of-contents': 'Table of Contents',
    'scai-section': 'Content Section',
    'scai-faq-section': 'FAQ',
    'scai-product-card': 'Product Card',
    'scai-service-info-box': 'Service Info',
    'scai-why-local-section': 'Why Choose Local',
    'scai-closing': 'Closing',
    'scai-feature-section': 'Features',
    'scai-key-takeaways': 'Key Takeaways',
    'scai-quick-facts-section': 'Quick Facts',
    'scai-requirements-box': 'Requirements',
    'scai-pro-tips-section': 'Pro Tips',
    'scai-honorable-mentions': 'Honorable Mentions',
    'scai-ingredients-section': 'Ingredients',
    'scai-instructions-section': 'Instructions',
    'scai-comparison-table': 'Comparison Table',
    'scai-cta-box': 'Call to Action',
    'scai-quick-verdict': 'Quick Verdict',
    'scai-pros-cons-section': 'Pros & Cons',
    'scai-rating-section': 'Rating',
    'scai-nutrition-section': 'Nutrition Facts'
  };

  /* ═══════════════════════════════════════════════════════════════
     ARIA LIVE REGION
     ═══════════════════════════════════════════════════════════════ */

  var liveRegion = document.getElementById('sce-live-region');

  function announce(message) {
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(function () { liveRegion.textContent = ''; }, 3000);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     UNSAVED CHANGES TRACKING
     ═══════════════════════════════════════════════════════════════ */

  function markDirty() {
    if (!hasChanges) {
      hasChanges = true;
      var bar = document.getElementById('scai-unsaved-bar');
      if (bar) bar.style.display = 'flex';
    }
    pushUndoState();
  }

  function markClean() {
    hasChanges = false;
    var bar = document.getElementById('scai-unsaved-bar');
    if (bar) bar.style.display = 'none';
  }

  form.addEventListener('input', markDirty);
  if (sidebarEditFields) sidebarEditFields.addEventListener('input', markDirty);

  window.addEventListener('beforeunload', function (e) {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ═══════════════════════════════════════════════════════════════
     SIDEBAR TOGGLE + EXPAND BUTTON
     ═══════════════════════════════════════════════════════════════ */

  var sidebarToggle = document.getElementById('sce-sidebar-toggle');
  var sidebarToggleEdit = document.getElementById('sce-sidebar-toggle-edit');

  function collapseSidebar() {
    if (sidebar) {
      sidebar.classList.add('collapsed');
      if (sidebarExpand) sidebarExpand.style.display = '';
    }
  }

  function expandSidebar() {
    if (sidebar) {
      sidebar.classList.remove('collapsed');
      if (sidebarExpand) sidebarExpand.style.display = 'none';
    }
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      if (sidebar.classList.contains('collapsed')) {
        expandSidebar();
      } else {
        collapseSidebar();
      }
    });
  }

  if (sidebarToggleEdit && sidebar) {
    sidebarToggleEdit.addEventListener('click', function () {
      if (sidebar.classList.contains('collapsed')) {
        expandSidebar();
      } else {
        collapseSidebar();
      }
    });
  }

  if (sidebarExpand) {
    sidebarExpand.addEventListener('click', expandSidebar);
  }

  /* ═══════════════════════════════════════════════════════════════
     BLOCK SELECTION + SIDEBAR EDITING
     ═══════════════════════════════════════════════════════════════ */

  function selectBlock(block) {
    if (!block || !sidebarEdit || !sidebarEditFields) return;

    if (selectedBlock) deselectBlock();

    selectedBlock = block;
    blockWasEdited = false;

    // Save the original preview HTML so we can restore it if the user
    // didn't edit anything — this preserves variation-specific styling.
    var preview = block.querySelector('.scai-block-preview');
    originalPreviewHtml = preview ? preview.innerHTML : null;

    block.classList.add('sce-editing');

    var type = block.getAttribute('data-component-type');
    if (sidebarEditTitle) {
      sidebarEditTitle.textContent = 'Editing: ' + (componentLabels[type] || 'Block');
    }

    var fields = block.querySelector('.scai-block-fields');
    if (fields) {
      while (fields.firstChild) {
        sidebarEditFields.appendChild(fields.firstChild);
      }
    }

    if (sidebarBrowse) sidebarBrowse.style.display = 'none';
    sidebarEdit.style.display = '';

    if (sidebar && sidebar.classList.contains('collapsed')) {
      expandSidebar();
    }

    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function deselectBlock() {
    if (!selectedBlock) return;

    var block = selectedBlock;
    var fields = block.querySelector('.scai-block-fields');
    if (fields && sidebarEditFields) {
      while (sidebarEditFields.firstChild) {
        fields.appendChild(sidebarEditFields.firstChild);
      }
    }

    // Clear selectedBlock BEFORE updateBlockPreview so getFieldContainer()
    // reads from the block's own fields (not the now-empty sidebar).
    selectedBlock = null;

    // Only regenerate preview if the block was actually edited.
    // Otherwise, restore the original PHP-rendered preview to preserve
    // variation-specific styling (classes, structure, etc.).
    if (blockWasEdited) {
      updateBlockPreview(block);
    } else if (originalPreviewHtml !== null) {
      var preview = block.querySelector('.scai-block-preview');
      if (preview) preview.innerHTML = originalPreviewHtml;
    }

    originalPreviewHtml = null;
    blockWasEdited = false;
    block.classList.remove('sce-editing');

    if (sidebarBrowse) sidebarBrowse.style.display = '';
    if (sidebarEdit) sidebarEdit.style.display = 'none';
  }

  function returnFieldsToBlocks() {
    if (!selectedBlock) return;
    var fields = selectedBlock.querySelector('.scai-block-fields');
    if (fields && sidebarEditFields) {
      while (sidebarEditFields.firstChild) {
        fields.appendChild(sidebarEditFields.firstChild);
      }
    }
  }

  function getFieldContainer(block) {
    return (block === selectedBlock && sidebarEditFields) ? sidebarEditFields : block;
  }

  /* ═══════════════════════════════════════════════════════════════
     BLOCK PREVIEW — generates HTML from field values
     ═══════════════════════════════════════════════════════════════ */

  /* -- DOM helpers: update content inside outer_html to preserve variation styling -- */

  function setElText(container, selector, text) {
    if (!text) return;
    var el = container.querySelector(selector);
    if (el) el.textContent = text;
  }

  function setByClass(container, cls, text) {
    if (text === undefined) return false;
    var el = container.querySelector('.' + cls);
    if (el) { el.textContent = text; return true; }
    return false;
  }

  function setHrefByClass(container, cls, url) {
    if (!url) return;
    var el = container.querySelector('.' + cls);
    if (el && el.hasAttribute('href')) el.setAttribute('href', url);
  }

  function setImgAttr(container, attr, val) {
    if (val === undefined) return;
    var img = container.querySelector('img');
    if (img) img.setAttribute(attr, val);
  }

  function collectTexts(fc, nameSuffix) {
    var vals = [];
    fc.querySelectorAll('textarea[name*="' + nameSuffix + '"]').forEach(function (ta) {
      if (ta.value.trim()) vals.push(ta.value);
    });
    return vals;
  }

  /** Sync <p> elements in a parsed outer_html fragment with current textarea values. */
  function syncParagraphs(container, texts) {
    var paras = Array.from(container.querySelectorAll('p'));
    // Exclude product-card specific paragraphs
    paras = paras.filter(function (p) { return !(/scai-pc-|scai-product-/).test(p.className); });

    // Remove excess
    while (paras.length > texts.length && paras.length > 0) {
      var rm = paras.pop(); rm.parentNode.removeChild(rm);
    }

    // Add by cloning last (preserves variation classes)
    if (paras.length > 0) {
      var tmpl = paras[paras.length - 1];
      while (paras.length < texts.length) {
        var cl = tmpl.cloneNode(false);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        paras.push(cl);
        tmpl = cl;
      }
    } else if (texts.length > 0) {
      // No paragraphs existed — create basic ones
      var parent = container.querySelector('section, [data-component], div') || container;
      for (var pi = 0; pi < texts.length; pi++) {
        var np = document.createElement('p'); np.className = 'scai-paragraph';
        parent.appendChild(np); paras.push(np);
      }
    }

    // Update text only when changed (preserves inline HTML like <strong> when untouched)
    for (var i = 0; i < texts.length && i < paras.length; i++) {
      if (paras[i].textContent.trim() !== texts[i].trim()) paras[i].textContent = texts[i];
    }
  }

  /** Sync FAQ items inside a parsed outer_html fragment. */
  function syncFaqItems(container, fc) {
    var domItems = Array.from(container.querySelectorAll('.scai-faq-item'));
    var formItems = Array.from(fc.querySelectorAll('.scai-editor-faq-item'));

    while (domItems.length > formItems.length && domItems.length > 0) {
      var rm = domItems.pop(); rm.parentNode.removeChild(rm);
    }
    if (domItems.length > 0) {
      var tmpl = domItems[domItems.length - 1];
      while (domItems.length < formItems.length) {
        var cl = tmpl.cloneNode(true);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domItems.push(cl); tmpl = cl;
      }
    }

    for (var i = 0; i < formItems.length && i < domItems.length; i++) {
      var qIn = formItems[i].querySelector('input[name*="[q]"]');
      var aIn = formItems[i].querySelector('textarea[name*="[a]"]');
      var h3  = domItems[i].querySelector('h3');
      var aP  = domItems[i].querySelector('p');
      if (h3 && qIn) h3.textContent = qIn.value;
      if (aP && aIn) aP.textContent = aIn.value;
    }
  }

  /** Sync service-info key/value rows inside a parsed outer_html fragment. */
  function syncServiceRows(container, fc) {
    var domRows  = Array.from(container.querySelectorAll('.scai-info-row, tr'));
    var formRows = Array.from(fc.querySelectorAll('.scai-editor-kv-item'));

    while (domRows.length > formRows.length && domRows.length > 0) {
      var rm = domRows.pop(); rm.parentNode.removeChild(rm);
    }
    if (domRows.length > 0) {
      var tmpl = domRows[domRows.length - 1];
      while (domRows.length < formRows.length) {
        var cl = tmpl.cloneNode(true);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domRows.push(cl); tmpl = cl;
      }
    }

    for (var i = 0; i < formRows.length && i < domRows.length; i++) {
      var lIn = formRows[i].querySelector('input[name*="[label]"]');
      var vIn = formRows[i].querySelector('input[name*="[value]"]');
      var lEl = domRows[i].querySelector('.scai-svc-label') || domRows[i].querySelector('td:first-child, span:first-child');
      var vEl = domRows[i].querySelector('.scai-svc-value') || domRows[i].querySelector('td:last-child, span:last-child');
      if (lEl && lIn) lEl.textContent = lIn.value;
      if (vEl && vIn) vEl.textContent = vIn.value;
    }
  }

  /** Sync <li> items in a list inside a parsed outer_html fragment. */
  function syncListItems(container, fc) {
    var list = container.querySelector('ul, ol');
    if (!list) return;

    var domLis   = Array.from(list.querySelectorAll('li'));
    var formIns  = Array.from(fc.querySelectorAll('.scai-editor-repeater-item input[name*="[items]"]'));

    while (domLis.length > formIns.length && domLis.length > 0) {
      var rm = domLis.pop(); rm.parentNode.removeChild(rm);
    }
    if (domLis.length > 0) {
      var tmpl = domLis[domLis.length - 1];
      while (domLis.length < formIns.length) {
        var cl = tmpl.cloneNode(false);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domLis.push(cl); tmpl = cl;
      }
    }

    for (var i = 0; i < formIns.length && i < domLis.length; i++) {
      if (domLis[i].textContent.trim() !== formIns[i].value.trim()) domLis[i].textContent = formIns[i].value;
    }
  }

  /** Sync honorable-mention items (h3 + p pairs) inside parsed outer_html. */
  function syncHmItems(container, fc) {
    var domItems = Array.from(container.querySelectorAll('.scai-hm-item'));
    var formItems = Array.from(fc.querySelectorAll('.scai-editor-hm-item'));

    while (domItems.length > formItems.length && domItems.length > 0) {
      var rm = domItems.pop(); rm.parentNode.removeChild(rm);
    }
    if (domItems.length > 0) {
      var tmpl = domItems[domItems.length - 1];
      while (domItems.length < formItems.length) {
        var cl = tmpl.cloneNode(true);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domItems.push(cl); tmpl = cl;
      }
    }

    for (var i = 0; i < formItems.length && i < domItems.length; i++) {
      var tIn = formItems[i].querySelector('input[name*="[title]"]');
      var dIn = formItems[i].querySelector('textarea[name*="[desc]"]');
      var h3  = domItems[i].querySelector('h3');
      var p   = domItems[i].querySelector('p');
      if (h3 && tIn) h3.textContent = tIn.value;
      if (p && dIn) p.textContent = dIn.value;
    }
  }

  /** Sync comparison-table headers and cell data inside parsed outer_html. */
  function syncComparisonTable(container, fc) {
    var table = container.querySelector('table');
    if (!table) return;

    var domThs = Array.from(table.querySelectorAll('thead th'));
    var headerInputs = Array.from(fc.querySelectorAll('input[name*="[headers]"]'));
    for (var h = 0; h < headerInputs.length && h < domThs.length; h++) {
      domThs[h].textContent = headerInputs[h].value;
    }

    var domTrs = Array.from(table.querySelectorAll('tbody tr'));
    var formRows = Array.from(fc.querySelectorAll('.scai-editor-comp-row'));
    while (domTrs.length > formRows.length && domTrs.length > 0) {
      var rm = domTrs.pop(); rm.parentNode.removeChild(rm);
    }
    if (domTrs.length > 0) {
      var tmpl = domTrs[domTrs.length - 1];
      while (domTrs.length < formRows.length) {
        var cl = tmpl.cloneNode(true);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domTrs.push(cl); tmpl = cl;
      }
    }
    for (var r = 0; r < formRows.length && r < domTrs.length; r++) {
      var cellInputs = Array.from(formRows[r].querySelectorAll('input'));
      var domTds = Array.from(domTrs[r].querySelectorAll('td'));
      for (var c = 0; c < cellInputs.length && c < domTds.length; c++) {
        domTds[c].textContent = cellInputs[c].value;
      }
    }
  }

  /** Sync quick-verdict option items inside parsed outer_html. */
  function syncVerdictOptions(container, fc) {
    var domOpts = Array.from(container.querySelectorAll('.scai-verdict-option'));
    var formOpts = Array.from(fc.querySelectorAll('.scai-editor-verdict-item'));

    while (domOpts.length > formOpts.length && domOpts.length > 0) {
      var rm = domOpts.pop(); rm.parentNode.removeChild(rm);
    }
    if (domOpts.length > 0) {
      var tmpl = domOpts[domOpts.length - 1];
      while (domOpts.length < formOpts.length) {
        var cl = tmpl.cloneNode(true);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domOpts.push(cl); tmpl = cl;
      }
    }

    for (var i = 0; i < formOpts.length && i < domOpts.length; i++) {
      var lIn = formOpts[i].querySelector('input[name*="[label]"]');
      var tIn = formOpts[i].querySelector('textarea[name*="[text]"]');
      var lEl = domOpts[i].querySelector('.scai-verdict-label');
      var tEl = domOpts[i].querySelector('.scai-verdict-text, p');
      if (lEl && lIn) lEl.textContent = lIn.value;
      if (tEl && tIn) tEl.textContent = tIn.value;
    }
  }

  /** Sync pros or cons list items inside parsed outer_html. */
  function syncProsCons(container, fc, listClass, repeaterKey) {
    var listWrap = container.querySelector('.' + listClass);
    if (!listWrap) return;
    var list = listWrap.querySelector('ul, ol');
    if (!list) return;

    var repeater = fc.querySelector('[data-repeater="' + repeaterKey + '"]');
    if (!repeater) return;
    var formIns = Array.from(repeater.querySelectorAll('.scai-editor-repeater-item input'));
    var domLis = Array.from(list.querySelectorAll('li'));

    while (domLis.length > formIns.length && domLis.length > 0) {
      var rm = domLis.pop(); rm.parentNode.removeChild(rm);
    }
    if (domLis.length > 0) {
      var tmpl = domLis[domLis.length - 1];
      while (domLis.length < formIns.length) {
        var cl = tmpl.cloneNode(false);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domLis.push(cl); tmpl = cl;
      }
    }

    for (var i = 0; i < formIns.length && i < domLis.length; i++) {
      if (domLis[i].textContent.trim() !== formIns[i].value.trim()) domLis[i].textContent = formIns[i].value;
    }
  }

  /** Sync nutrition table rows inside parsed outer_html. */
  function syncNutritionRows(container, fc) {
    var table = container.querySelector('table');
    if (!table) return;

    var domTrs = Array.from(table.querySelectorAll('tbody tr'));
    var formRows = Array.from(fc.querySelectorAll('.scai-editor-nutrition-item'));

    while (domTrs.length > formRows.length && domTrs.length > 0) {
      var rm = domTrs.pop(); rm.parentNode.removeChild(rm);
    }
    if (domTrs.length > 0) {
      var tmpl = domTrs[domTrs.length - 1];
      while (domTrs.length < formRows.length) {
        var cl = tmpl.cloneNode(true);
        tmpl.parentNode.insertBefore(cl, tmpl.nextSibling);
        domTrs.push(cl); tmpl = cl;
      }
    }

    for (var i = 0; i < formRows.length && i < domTrs.length; i++) {
      var nIn = formRows[i].querySelector('input[name*="[nutrient]"]');
      var aIn = formRows[i].querySelector('input[name*="[amount]"]');
      var tds = Array.from(domTrs[i].querySelectorAll('td'));
      if (tds[0] && nIn) tds[0].textContent = nIn.value;
      if (tds[1] && aIn) tds[1].textContent = aIn.value;
    }
  }

  /**
   * Parse the stored outer_html and surgically update text/attribute content
   * inside the variation-specific DOM, mirroring PHP rebuild_from_outer().
   * Returns updated HTML string, or null to fall back to simplified preview.
   */
  function rebuildFromOuterHtml(type, outerHtml, block, c) {
    try {
      var t = document.createElement('div');
      t.innerHTML = outerHtml;

      switch (type) {
        case 'scai-h1':
          setElText(t, 'h1', getFieldValue(block, '[title]'));
          break;

        case 'scai-featured-image':
          setImgAttr(t, 'src', getFieldValue(block, '[src]'));
          setImgAttr(t, 'alt', getFieldValue(block, '[alt]'));
          setElText(t, 'figcaption', getFieldValue(block, '[caption]'));
          break;

        case 'scai-overview':
          syncParagraphs(t, collectTexts(c, '[paragraphs]'));
          break;

        case 'scai-table-of-contents':
          break; // no editable fields

        case 'scai-section':
          setElText(t, 'h2', getFieldValue(block, '[heading]'));
          setImgAttr(t, 'src', getFieldValue(block, '[image_src]'));
          setImgAttr(t, 'alt', getFieldValue(block, '[image_alt]'));
          setElText(t, 'figcaption', getFieldValue(block, '[image_caption]'));
          syncParagraphs(t, collectTexts(c, '[paragraphs]'));
          break;

        case 'scai-faq-section':
          setElText(t, 'h2', getFieldValue(block, '[title]'));
          syncFaqItems(t, c);
          break;

        case 'scai-product-card':
          setByClass(t, 'scai-pc-title', getFieldValue(block, '[name]'));
          setByClass(t, 'scai-pc-badge', getFieldValue(block, '[badge]'));
          setByClass(t, 'scai-pc-price', getFieldValue(block, '[price]'));
          setByClass(t, 'scai-pc-desc', getFieldValue(block, '[description]'));
          setByClass(t, 'scai-pc-cta', getFieldValue(block, '[cta_text]'));
          setHrefByClass(t, 'scai-pc-cta', getFieldValue(block, '[cta_url]'));
          setImgAttr(t, 'src', getFieldValue(block, '[image_src]'));
          break;

        case 'scai-service-info-box':
          var hdr = getFieldValue(block, '[header]');
          if (hdr) {
            if (!setByClass(t, 'scai-svc-header', hdr))
              if (!setByClass(t, 'scai-info-title', hdr))
                setElText(t, 'h2', hdr);
          }
          syncServiceRows(t, c);
          break;

        case 'scai-why-local-section':
          setByClass(t, 'scai-local-title', getFieldValue(block, '[title]'));
          setByClass(t, 'scai-local-badge', getFieldValue(block, '[badge]'));
          setImgAttr(t, 'src', getFieldValue(block, '[image_src]'));
          syncListItems(t, c);
          break;

        case 'scai-closing':
          setElText(t, 'h2', getFieldValue(block, '[heading]'));
          syncParagraphs(t, collectTexts(c, '[paragraphs]'));
          break;

        case 'scai-feature-section':
        case 'scai-key-takeaways':
        case 'scai-quick-facts-section':
        case 'scai-requirements-box':
        case 'scai-pro-tips-section':
        case 'scai-ingredients-section':
        case 'scai-instructions-section':
          var hlHeading = getFieldValue(block, '[heading]');
          if (hlHeading) {
            if (!setByClass(t, 'scai-takeaways-title', hlHeading) &&
                !setByClass(t, 'scai-facts-title', hlHeading)) {
              setElText(t, 'h2', hlHeading);
            }
          }
          syncListItems(t, c);
          break;

        case 'scai-honorable-mentions':
          setElText(t, 'h2', getFieldValue(block, '[heading]'));
          syncHmItems(t, c);
          break;

        case 'scai-comparison-table':
          setByClass(t, 'scai-comp-title', getFieldValue(block, '[heading]'));
          if (!t.querySelector('.scai-comp-title')) setElText(t, 'h3', getFieldValue(block, '[heading]'));
          syncComparisonTable(t, c);
          break;

        case 'scai-cta-box':
          setByClass(t, 'scai-cta-title', getFieldValue(block, '[heading]'));
          if (!t.querySelector('.scai-cta-title')) setElText(t, 'h3', getFieldValue(block, '[heading]'));
          setByClass(t, 'scai-cta-text', getFieldValue(block, '[description]'));
          setByClass(t, 'scai-cta-button', getFieldValue(block, '[btn_text]'));
          setHrefByClass(t, 'scai-cta-button', getFieldValue(block, '[btn_url]'));
          break;

        case 'scai-quick-verdict':
          setByClass(t, 'scai-verdict-title', getFieldValue(block, '[heading]'));
          syncVerdictOptions(t, c);
          break;

        case 'scai-pros-cons-section':
          setElText(t, 'h2', getFieldValue(block, '[heading]'));
          syncProsCons(t, c, 'scai-pc-pros', 'pros-items');
          syncProsCons(t, c, 'scai-pc-cons', 'cons-items');
          break;

        case 'scai-rating-section':
          setElText(t, 'h2', getFieldValue(block, '[heading]'));
          setByClass(t, 'scai-rt-score', getFieldValue(block, '[score]'));
          setByClass(t, 'scai-rt-title', getFieldValue(block, '[title]'));
          setByClass(t, 'scai-rt-paragraph', getFieldValue(block, '[summary]'));
          break;

        case 'scai-nutrition-section':
          setElText(t, 'h2', getFieldValue(block, '[heading]'));
          syncNutritionRows(t, c);
          break;

        default:
          return null;
      }

      return t.innerHTML;
    } catch (e) {
      return null; // parse error — fall back to simplified preview
    }
  }

  function updateBlockPreview(block) {
    if (!block) return;
    var preview = block.querySelector('.scai-block-preview');
    if (!preview) return;

    var type = block.getAttribute('data-component-type');
    var c = getFieldContainer(block);

    // Try DOM-based rebuild from outer_html to preserve variation-specific
    // classes, structure, SVGs, and styling that the simplified fallback loses.
    var outerInput = c.querySelector('input[name*="[outer_html]"]');
    var outerHtml = outerInput ? outerInput.value.trim() : '';

    if (outerHtml) {
      var rebuilt = rebuildFromOuterHtml(type, outerHtml, block, c);
      if (rebuilt !== null) {
        preview.innerHTML = rebuilt;
        return;
      }
    }

    // Simplified fallback for new blocks that have no outer_html yet.
    var html = '';

    if (type === 'scai-h1') {
      var title = getFieldValue(block, '[title]');
      if (title) html = '<h1 class="scai-h1">' + escapeHtml(title) + '</h1>';
    }

    else if (type === 'scai-featured-image') {
      var src = getFieldValue(block, '[src]');
      var alt = getFieldValue(block, '[alt]');
      var caption = getFieldValue(block, '[caption]');
      if (src) {
        html = '<figure class="scai-featured-image"><img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '">';
        if (caption) html += '<figcaption>' + escapeHtml(caption) + '</figcaption>';
        html += '</figure>';
      }
    }

    else if (type === 'scai-overview') {
      html += '<div class="scai-component">';
      c.querySelectorAll('textarea[name*="[paragraphs]"]').forEach(function (ta) {
        if (ta.value.trim()) html += '<p class="scai-paragraph">' + escapeHtml(ta.value) + '</p>';
      });
      html += '</div>';
    }

    else if (type === 'scai-table-of-contents') {
      html = '<nav class="scai-toc"><strong class="scai-toc-title">Table of Contents</strong> <em style="color:#666;">(auto-generated)</em></nav>';
    }

    else if (type === 'scai-section') {
      html += '<section class="scai-section">';
      var heading = getFieldValue(block, '[heading]');
      if (heading) html += '<h2 class="scai-h2">' + escapeHtml(heading) + '</h2>';

      var imgSrc = getFieldValue(block, '[image_src]');
      var imgAlt = getFieldValue(block, '[image_alt]');
      var imgCap = getFieldValue(block, '[image_caption]');
      if (imgSrc) {
        html += '<figure class="scai-h2-image"><img src="' + escapeAttr(imgSrc) + '" alt="' + escapeAttr(imgAlt || '') + '">';
        if (imgCap) html += '<figcaption>' + escapeHtml(imgCap) + '</figcaption>';
        html += '</figure>';
      }

      c.querySelectorAll('textarea[name*="[paragraphs]"]').forEach(function (ta) {
        if (ta.value.trim()) html += '<p class="scai-paragraph">' + escapeHtml(ta.value) + '</p>';
      });
      html += '</section>';
    }

    else if (type === 'scai-faq-section') {
      html += '<div class="scai-faq" data-component="scai-faq-section">';
      var faqTitle = getFieldValue(block, '[title]');
      if (faqTitle) html += '<h2 class="scai-faq-title">' + escapeHtml(faqTitle) + '</h2>';
      c.querySelectorAll('.scai-editor-faq-item').forEach(function (item) {
        var q = item.querySelector('input[name*="[q]"]');
        var a = item.querySelector('textarea[name*="[a]"]');
        if (q && q.value.trim()) {
          html += '<div class="scai-faq-question"><h3 class="scai-faq-h3">' + escapeHtml(q.value) + '</h3></div>';
          if (a && a.value.trim()) html += '<div class="scai-faq-answer"><p class="scai-paragraph">' + escapeHtml(a.value) + '</p></div>';
        }
      });
      html += '</div>';
    }

    else if (type === 'scai-product-card') {
      var pName = getFieldValue(block, '[name]');
      var pBadge = getFieldValue(block, '[badge]');
      var pPrice = getFieldValue(block, '[price]');
      var pDesc = getFieldValue(block, '[description]');
      var pImg = getFieldValue(block, '[image_src]');
      var pCta = getFieldValue(block, '[cta_text]');
      var pCtaUrl = getFieldValue(block, '[cta_url]');
      html += '<div class="scai-product-card scai-component">';
      if (pBadge) html += '<span class="scai-product-badge">' + escapeHtml(pBadge) + '</span>';
      if (pImg) html += '<img src="' + escapeAttr(pImg) + '" alt="' + escapeAttr(pName || '') + '">';
      if (pName) html += '<h3 class="scai-product-title">' + escapeHtml(pName) + '</h3>';
      if (pPrice) html += '<p class="scai-product-price">' + escapeHtml(pPrice) + '</p>';
      if (pDesc) html += '<p class="scai-paragraph">' + escapeHtml(pDesc) + '</p>';
      if (pCta) html += '<a class="scai-product-cta" href="' + escapeAttr(pCtaUrl || '#') + '">' + escapeHtml(pCta) + '</a>';
      html += '</div>';
    }

    else if (type === 'scai-service-info-box') {
      html += '<div class="scai-service-info scai-component" data-component="scai-service-info">';
      var svcHeader = getFieldValue(block, '[header]');
      if (svcHeader) html += '<h2 class="scai-h2">' + escapeHtml(svcHeader) + '</h2>';
      html += '<table><tbody>';
      c.querySelectorAll('.scai-editor-kv-item').forEach(function (row) {
        var label = row.querySelector('input[name*="[label]"]');
        var value = row.querySelector('input[name*="[value]"]');
        if (label && label.value.trim()) {
          html += '<tr><td>' + escapeHtml(label.value) + '</td>';
          html += '<td>' + escapeHtml(value ? value.value : '') + '</td></tr>';
        }
      });
      html += '</tbody></table>';
      html += '</div>';
    }

    else if (type === 'scai-why-local-section') {
      html += '<div class="scai-component" data-component="scai-why-local-section">';
      var wTitle = getFieldValue(block, '[title]');
      var wBadge = getFieldValue(block, '[badge]');
      var wImg = getFieldValue(block, '[image_src]');
      if (wTitle) html += '<h2 class="scai-h2">' + escapeHtml(wTitle) + '</h2>';
      if (wBadge) html += '<span class="scai-badge">' + escapeHtml(wBadge) + '</span>';
      if (wImg) html += '<img src="' + escapeAttr(wImg) + '" alt="">';
      html += '<ul>';
      c.querySelectorAll('.scai-editor-repeater-item input[name*="[items]"]').forEach(function (input) {
        if (input.value.trim()) html += '<li>' + escapeHtml(input.value) + '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }

    else if (type === 'scai-closing') {
      html += '<section class="scai-section">';
      var closeHeading = getFieldValue(block, '[heading]');
      if (closeHeading) html += '<h2 class="scai-h2">' + escapeHtml(closeHeading) + '</h2>';
      c.querySelectorAll('textarea[name*="[paragraphs]"]').forEach(function (ta) {
        if (ta.value.trim()) html += '<p class="scai-paragraph">' + escapeHtml(ta.value) + '</p>';
      });
      html += '</section>';
    }

    preview.innerHTML = html;
  }

  // Debounced preview update while editing in sidebar.
  var previewDebounceTimer = null;

  function handlePreviewInput() {
    if (!selectedBlock) return;
    blockWasEdited = true;
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(function () {
      updateBlockPreview(selectedBlock);
    }, 300);
  }

  if (sidebarEditFields) sidebarEditFields.addEventListener('input', handlePreviewInput);

  /* ═══════════════════════════════════════════════════════════════
     BLOCK TOOLBAR + CLICK HANDLERS
     ═══════════════════════════════════════════════════════════════ */

  // Click on block preview to select for editing.
  blocksContainer.addEventListener('click', function (e) {
    // Don't intercept toolbar button clicks.
    if (e.target.closest('[data-action]') || e.target.closest('.scai-block-action')) return;

    var preview = e.target.closest('.scai-block-preview');
    if (!preview) return;

    var block = preview.closest('.scai-editor-block');
    if (!block || block === selectedBlock) return;

    selectBlock(block);
  });

  // Toolbar action handler (delegated on blocksContainer).
  blocksContainer.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    var action = btn.getAttribute('data-action');
    var block = btn.closest('.scai-editor-block');

    if (action === 'edit' && block) {
      if (block === selectedBlock) {
        deselectBlock();
      } else {
        selectBlock(block);
      }
      return;
    }

    if (action === 'move-up' && block) {
      var prev = block.previousElementSibling;
      if (prev && prev.classList.contains('scai-editor-block')) {
        blocksContainer.insertBefore(block, prev);
        markDirty();
        announce('Section moved up');
      }
      return;
    }

    if (action === 'move-down' && block) {
      var next = block.nextElementSibling;
      if (next && next.classList.contains('scai-editor-block')) {
        blocksContainer.insertBefore(next, block);
        markDirty();
        announce('Section moved down');
      }
      return;
    }

    if (action === 'delete' && block) {
      showDeleteModal(block);
      return;
    }

    if (action === 'add-between' && block) {
      pendingInsertTarget = block;
      if (selectedBlock) deselectBlock();
      if (sidebarBrowse) sidebarBrowse.style.display = '';
      if (sidebarEdit) sidebarEdit.style.display = 'none';
      if (sidebar && sidebar.classList.contains('collapsed')) expandSidebar();
      announce('Select a component to insert');
      return;
    }

    // Repeater actions.
    if (action === 'remove-item') {
      var item = btn.closest('.scai-editor-repeater-item');
      if (item) { item.remove(); markDirty(); }
      return;
    }

    if (action === 'add-paragraph') { addRepeaterItem(btn, 'paragraph'); return; }
    if (action === 'add-faq') { addRepeaterItem(btn, 'faq'); return; }
    if (action === 'add-service-row') { addRepeaterItem(btn, 'service-row'); return; }
    if (action === 'add-local-item') { addRepeaterItem(btn, 'local-item'); return; }
    if (action === 'add-list-item') { addRepeaterItem(btn, 'list-item'); return; }
    if (action === 'add-hm-item') { addRepeaterItem(btn, 'hm-item'); return; }
    if (action === 'add-verdict-option') { addRepeaterItem(btn, 'verdict-option'); return; }
    if (action === 'add-nutrition-row') { addRepeaterItem(btn, 'nutrition-row'); return; }
  });

  // Repeater actions for fields in the sidebar (outside blocksContainer).
  if (sidebarEditFields) {
    sidebarEditFields.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.getAttribute('data-action');
      blockWasEdited = true;

      if (action === 'remove-item') {
        var item = btn.closest('.scai-editor-repeater-item');
        if (item) { item.remove(); markDirty(); }
      }
      if (action === 'add-paragraph') addRepeaterItem(btn, 'paragraph');
      if (action === 'add-faq') addRepeaterItem(btn, 'faq');
      if (action === 'add-service-row') addRepeaterItem(btn, 'service-row');
      if (action === 'add-local-item') addRepeaterItem(btn, 'local-item');
      if (action === 'add-list-item') addRepeaterItem(btn, 'list-item');
      if (action === 'add-hm-item') addRepeaterItem(btn, 'hm-item');
      if (action === 'add-verdict-option') addRepeaterItem(btn, 'verdict-option');
      if (action === 'add-nutrition-row') addRepeaterItem(btn, 'nutrition-row');
    });
  }

  // Sidebar back button.
  if (sidebarBack) {
    sidebarBack.addEventListener('click', deselectBlock);
  }

  // Initialize block previews for existing blocks (they already have outer_html rendered by PHP).
  // No need to regenerate — PHP already rendered the outer_html in .scai-block-preview.

  /* ═══════════════════════════════════════════════════════════════
     SIDEBAR — ADD COMPONENT
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Get skeleton outer_html for a component type from server-provided data.
   */
  function getSkeleton(compType) {
    return (typeof scaiEditor !== 'undefined' && scaiEditor.skeletons && scaiEditor.skeletons[compType]) ? scaiEditor.skeletons[compType] : '';
  }

  var componentTemplates = {
    'scai-section': function (idx) {
      return buildBlock(idx, 'scai-section', [
        hiddenField(idx, 'type', 'scai-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-section')),
        textField(idx, '[heading]', 'Section Heading', ''),
        paragraphsRepeater(idx, [])
      ]);
    },
    'scai-faq-section': function (idx) {
      return buildBlock(idx, 'scai-faq-section', [
        hiddenField(idx, 'type', 'scai-faq-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-faq-section')),
        textField(idx, '[title]', 'FAQ Section Title', 'Frequently Asked Questions'),
        faqRepeater(idx, [])
      ]);
    },
    'scai-product-card': function (idx) {
      return buildBlock(idx, 'scai-product-card', [
        hiddenField(idx, 'type', 'scai-product-card'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-product-card')),
        textField(idx, '[badge]', 'Badge', ''),
        textField(idx, '[name]', 'Product Name', ''),
        textField(idx, '[rating]', 'Rating (e.g. 4.8)', ''),
        textField(idx, '[price]', 'Price', ''),
        textareaField(idx, '[description]', 'Description', '', 3),
        textField(idx, '[cta_text]', 'Button Text', ''),
        textField(idx, '[cta_url]', 'Button URL', ''),
        textField(idx, '[image_src]', 'Image URL', '')
      ]);
    },
    'scai-service-info-box': function (idx) {
      return buildBlock(idx, 'scai-service-info-box', [
        hiddenField(idx, 'type', 'scai-service-info-box'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-service-info-box')),
        textField(idx, '[header]', 'Section Header', ''),
        serviceInfoRepeater(idx, [])
      ]);
    },
    'scai-why-local-section': function (idx) {
      return buildBlock(idx, 'scai-why-local-section', [
        hiddenField(idx, 'type', 'scai-why-local-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-why-local-section')),
        textField(idx, '[title]', 'Title', ''),
        textField(idx, '[badge]', 'Badge Text', 'Local Partner'),
        textField(idx, '[image_src]', 'Image URL', ''),
        localItemsRepeater(idx, [])
      ]);
    },
    'scai-closing': function (idx) {
      return buildBlock(idx, 'scai-closing', [
        hiddenField(idx, 'type', 'scai-closing'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-closing')),
        textField(idx, '[heading]', 'Closing Heading', ''),
        paragraphsRepeater(idx, [])
      ]);
    },
    'scai-feature-section': function (idx) {
      return buildBlock(idx, 'scai-feature-section', [
        hiddenField(idx, 'type', 'scai-feature-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-feature-section')),
        textField(idx, '[heading]', 'Features Heading', 'Key Features'),
        listItemsRepeater(idx, 'Features', 'Feature')
      ]);
    },
    'scai-key-takeaways': function (idx) {
      return buildBlock(idx, 'scai-key-takeaways', [
        hiddenField(idx, 'type', 'scai-key-takeaways'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-key-takeaways')),
        textField(idx, '[heading]', 'Takeaways Title', 'Key Takeaways'),
        listItemsRepeater(idx, 'Takeaways', 'Takeaway')
      ]);
    },
    'scai-quick-facts-section': function (idx) {
      return buildBlock(idx, 'scai-quick-facts-section', [
        hiddenField(idx, 'type', 'scai-quick-facts-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-quick-facts-section')),
        textField(idx, '[heading]', 'Facts Title', 'Quick Facts'),
        listItemsRepeater(idx, 'Facts', 'Fact')
      ]);
    },
    'scai-requirements-box': function (idx) {
      return buildBlock(idx, 'scai-requirements-box', [
        hiddenField(idx, 'type', 'scai-requirements-box'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-requirements-box')),
        textField(idx, '[heading]', 'Requirements Heading', 'What You Will Need'),
        listItemsRepeater(idx, 'Requirements', 'Requirement')
      ]);
    },
    'scai-pro-tips-section': function (idx) {
      return buildBlock(idx, 'scai-pro-tips-section', [
        hiddenField(idx, 'type', 'scai-pro-tips-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-pro-tips-section')),
        textField(idx, '[heading]', 'Tips Heading', 'Pro Tips'),
        listItemsRepeater(idx, 'Tips', 'Tip')
      ]);
    },
    'scai-honorable-mentions': function (idx) {
      return buildBlock(idx, 'scai-honorable-mentions', [
        hiddenField(idx, 'type', 'scai-honorable-mentions'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-honorable-mentions')),
        textField(idx, '[heading]', 'Section Heading', 'Honorable Mentions'),
        hmRepeater(idx)
      ]);
    },
    'scai-ingredients-section': function (idx) {
      return buildBlock(idx, 'scai-ingredients-section', [
        hiddenField(idx, 'type', 'scai-ingredients-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-ingredients-section')),
        textField(idx, '[heading]', 'Ingredients Heading', 'Ingredients'),
        listItemsRepeater(idx, 'Ingredients', 'Ingredient')
      ]);
    },
    'scai-instructions-section': function (idx) {
      return buildBlock(idx, 'scai-instructions-section', [
        hiddenField(idx, 'type', 'scai-instructions-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-instructions-section')),
        textField(idx, '[heading]', 'Instructions Heading', 'Step-by-Step Instructions'),
        listItemsRepeater(idx, 'Steps', 'Step')
      ]);
    },
    'scai-comparison-table': function (idx) {
      return buildBlock(idx, 'scai-comparison-table', [
        hiddenField(idx, 'type', 'scai-comparison-table'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-comparison-table')),
        textField(idx, '[heading]', 'Table Title', 'Product Comparison')
      ]);
    },
    'scai-cta-box': function (idx) {
      return buildBlock(idx, 'scai-cta-box', [
        hiddenField(idx, 'type', 'scai-cta-box'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-cta-box')),
        textField(idx, '[heading]', 'CTA Heading', ''),
        textareaField(idx, '[description]', 'Description', '', 3),
        textField(idx, '[btn_text]', 'Button Text', 'Get Started'),
        textField(idx, '[btn_url]', 'Button URL', '#')
      ]);
    },
    'scai-quick-verdict': function (idx) {
      return buildBlock(idx, 'scai-quick-verdict', [
        hiddenField(idx, 'type', 'scai-quick-verdict'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-quick-verdict')),
        textField(idx, '[heading]', 'Verdict Title', 'Quick Verdict'),
        verdictRepeater(idx)
      ]);
    },
    'scai-pros-cons-section': function (idx) {
      return buildBlock(idx, 'scai-pros-cons-section', [
        hiddenField(idx, 'type', 'scai-pros-cons-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-pros-cons-section')),
        textField(idx, '[heading]', 'Section Heading', 'Pros and Cons'),
        prosConsRepeater(idx, 'pros', 'Pros', 'Pro'),
        prosConsRepeater(idx, 'cons', 'Cons', 'Con')
      ]);
    },
    'scai-rating-section': function (idx) {
      return buildBlock(idx, 'scai-rating-section', [
        hiddenField(idx, 'type', 'scai-rating-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-rating-section')),
        textField(idx, '[heading]', 'Section Heading', 'Our Verdict'),
        textField(idx, '[score]', 'Score (e.g. 8.5)', ''),
        textField(idx, '[title]', 'Rating Label (e.g. Excellent)', ''),
        textareaField(idx, '[summary]', 'Summary', '', 4)
      ]);
    },
    'scai-nutrition-section': function (idx) {
      return buildBlock(idx, 'scai-nutrition-section', [
        hiddenField(idx, 'type', 'scai-nutrition-section'),
        hiddenField(idx, 'outer_html', getSkeleton('scai-nutrition-section')),
        textField(idx, '[heading]', 'Section Heading', 'Nutrition Facts'),
        nutritionRepeater(idx)
      ]);
    }
  };

  // Handle sidebar add-component clicks.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add-component]');
    if (!btn) return;

    var compType = btn.getAttribute('data-add-component');
    var template = componentTemplates[compType];
    if (!template) return;

    var currentCount = blocksContainer.querySelectorAll('.scai-editor-block').length;
    var blockEl = template(currentCount);

    // Make new blocks draggable.
    if (compType !== 'scai-h1' && compType !== 'scai-table-of-contents') {
      blockEl.setAttribute('draggable', 'true');
    }

    // Insert after pending target or append to end.
    if (pendingInsertTarget && pendingInsertTarget.parentNode === blocksContainer) {
      var insertRef = pendingInsertTarget.nextElementSibling;
      if (insertRef) {
        blocksContainer.insertBefore(blockEl, insertRef);
      } else {
        blocksContainer.appendChild(blockEl);
      }
      pendingInsertTarget = null;
    } else {
      blocksContainer.appendChild(blockEl);
    }

    markDirty();
    updateSectionCount();

    // Add highlight animation.
    blockEl.classList.add('sce-just-added');
    setTimeout(function () { blockEl.classList.remove('sce-just-added'); }, 600);

    // Auto-select the new block for sidebar editing.
    selectBlock(blockEl);

    announce('Added ' + (componentLabels[compType] || compType.replace('scai-', '')));
  });

  /* ═══════════════════════════════════════════════════════════════
     BLOCK BUILDER (for add-component)
     ═══════════════════════════════════════════════════════════════ */

  function buildBlock(idx, compType, fieldElements) {
    var label = componentLabels[compType] || compType;

    var block = document.createElement('div');
    block.className = 'scai-editor-block';
    block.setAttribute('data-component-index', idx);
    block.setAttribute('data-component-type', compType);

    // Toolbar.
    var toolbar = document.createElement('div');
    toolbar.className = 'scai-block-toolbar';
    toolbar.innerHTML =
      '<span class="scai-block-toolbar-label">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>' +
        escapeHtml(label) +
      '</span>' +
      '<div class="scai-block-toolbar-actions">' +
        '<button type="button" class="scai-block-action" data-action="edit" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
        '<button type="button" class="scai-block-action" data-action="move-up" title="Move up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button>' +
        '<button type="button" class="scai-block-action" data-action="move-down" title="Move down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<button type="button" class="scai-block-action danger" data-action="delete" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
      '</div>';

    // Preview (empty for new blocks).
    var preview = document.createElement('div');
    preview.className = 'scai-block-preview';

    // Hidden fields.
    var fields = document.createElement('div');
    fields.className = 'scai-block-fields';
    fields.style.display = 'none';
    fieldElements.forEach(function (el) { fields.appendChild(el); });

    // Add-between button.
    var addBetween = document.createElement('div');
    addBetween.className = 'scai-block-add-between';
    addBetween.innerHTML =
      '<button type="button" class="scai-block-add-btn" data-action="add-between" title="Insert block">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>' +
      '</button>';

    block.appendChild(toolbar);
    block.appendChild(preview);
    block.appendChild(fields);
    block.appendChild(addBetween);
    return block;
  }

  /* ═══════════════════════════════════════════════════════════════
     FIELD BUILDERS (for add-component)
     ═══════════════════════════════════════════════════════════════ */

  function hiddenField(idx, key, value) {
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'components[' + idx + ']' + (key.charAt(0) === '[' ? key : '[' + key + ']');
    input.value = value;
    return input;
  }

  function textField(idx, keySuffix, labelText, value) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    wrap.innerHTML =
      '<label class="scai-editor-label">' + escapeHtml(labelText) + '</label>' +
      '<input type="text" name="components[' + idx + ']' + keySuffix + '" value="' + escapeAttr(value) + '" class="scai-editor-input">';
    return wrap;
  }

  function textareaField(idx, keySuffix, labelText, value, rows) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    wrap.innerHTML =
      '<label class="scai-editor-label">' + escapeHtml(labelText) + '</label>' +
      '<textarea name="components[' + idx + ']' + keySuffix + '" rows="' + (rows || 4) + '" class="scai-editor-textarea">' + escapeHtml(value) + '</textarea>';
    return wrap;
  }

  function paragraphsRepeater(idx, items) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">Paragraphs</label>' +
      '<div class="scai-editor-repeater" data-repeater="paragraphs">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-paragraph" data-prefix="' + prefix + '">+ Add Paragraph</button>' +
      '</div>';
    return wrap;
  }

  function faqRepeater(idx, items) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">Questions & Answers</label>' +
      '<div class="scai-editor-repeater" data-repeater="faq">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-faq" data-prefix="' + prefix + '">+ Add Question</button>' +
      '</div>';
    return wrap;
  }

  function serviceInfoRepeater(idx, items) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">Info Rows</label>' +
      '<div class="scai-editor-repeater" data-repeater="service-info">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-service-row" data-prefix="' + prefix + '">+ Add Row</button>' +
      '</div>';
    return wrap;
  }

  function localItemsRepeater(idx, items) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">Benefit Items</label>' +
      '<div class="scai-editor-repeater" data-repeater="local-items">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-local-item" data-prefix="' + prefix + '">+ Add Item</button>' +
      '</div>';
    return wrap;
  }

  function listItemsRepeater(idx, label, placeholder) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">' + escapeHtml(label) + '</label>' +
      '<div class="scai-editor-repeater" data-repeater="list-items">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-list-item" data-prefix="' + prefix + '" data-placeholder="' + escapeAttr(placeholder) + '">+ Add ' + escapeHtml(placeholder) + '</button>' +
      '</div>';
    return wrap;
  }

  function hmRepeater(idx) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">Mentions</label>' +
      '<div class="scai-editor-repeater" data-repeater="hm-items">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-hm-item" data-prefix="' + prefix + '">+ Add Mention</button>' +
      '</div>';
    return wrap;
  }

  function verdictRepeater(idx) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">Verdict Options</label>' +
      '<div class="scai-editor-repeater" data-repeater="verdict-options">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-verdict-option" data-prefix="' + prefix + '">+ Add Option</button>' +
      '</div>';
    return wrap;
  }

  function prosConsRepeater(idx, key, label, placeholder) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">' + escapeHtml(label) + '</label>' +
      '<div class="scai-editor-repeater" data-repeater="' + key + '-items">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-list-item" data-prefix="' + prefix + '[' + key + ']" data-placeholder="' + escapeAttr(placeholder) + '">+ Add ' + escapeHtml(placeholder) + '</button>' +
      '</div>';
    return wrap;
  }

  function nutritionRepeater(idx) {
    var wrap = document.createElement('div');
    wrap.className = 'scai-editor-field';
    var prefix = 'components[' + idx + ']';
    wrap.innerHTML =
      '<label class="scai-editor-label">Nutrients</label>' +
      '<div class="scai-editor-repeater" data-repeater="nutrition-rows">' +
        '<button type="button" class="scai-editor-add-btn" data-action="add-nutrition-row" data-prefix="' + prefix + '">+ Add Nutrient</button>' +
      '</div>';
    return wrap;
  }

  /* ═══════════════════════════════════════════════════════════════
     CUSTOM DELETE MODAL
     ═══════════════════════════════════════════════════════════════ */

  var deleteModal = document.getElementById('sce-delete-modal');
  var pendingDeleteBlock = null;

  function showDeleteModal(block) {
    pendingDeleteBlock = block;
    if (deleteModal) {
      deleteModal.style.display = '';
      var confirmBtn = deleteModal.querySelector('.sce-modal-confirm');
      if (confirmBtn) confirmBtn.focus();
    }
  }

  function hideDeleteModal() {
    pendingDeleteBlock = null;
    if (deleteModal) deleteModal.style.display = 'none';
  }

  if (deleteModal) {
    deleteModal.querySelector('.sce-modal-cancel').addEventListener('click', hideDeleteModal);
    deleteModal.querySelector('.sce-modal-confirm').addEventListener('click', function () {
      if (pendingDeleteBlock) {
        // If deleting the selected block, clear sidebar without moving fields back.
        if (pendingDeleteBlock === selectedBlock) {
          if (sidebarEditFields) sidebarEditFields.innerHTML = '';
          selectedBlock = null;
          if (sidebarBrowse) sidebarBrowse.style.display = '';
          if (sidebarEdit) sidebarEdit.style.display = 'none';
        }

        pendingDeleteBlock.remove();
        markDirty();
        updateSectionCount();
        announce('Section deleted');
      }
      hideDeleteModal();
    });

    // Close on overlay click.
    deleteModal.addEventListener('click', function (e) {
      if (e.target === deleteModal) hideDeleteModal();
    });

    // Close on Escape (also deselect block if no modal open).
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (deleteModal.style.display !== 'none') {
          hideDeleteModal();
        } else if (selectedBlock) {
          deselectBlock();
        }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     REPEATER: ADD ITEMS
     ═══════════════════════════════════════════════════════════════ */

  function addRepeaterItem(btn, type) {
    var repeater = btn.closest('.scai-editor-repeater');
    if (!repeater) return;

    var prefix = btn.getAttribute('data-prefix') || '';
    var item = document.createElement('div');
    item.className = 'scai-editor-repeater-item';

    var removeBtn = '<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove" aria-label="Remove item">&times;</button>';

    if (type === 'paragraph') {
      item.innerHTML =
        '<textarea name="' + prefix + '[paragraphs][]" rows="3" class="scai-editor-textarea" placeholder="New paragraph..."></textarea>' +
        removeBtn;
    }

    if (type === 'faq') {
      item.className += ' scai-editor-faq-item';
      var existingItems = repeater.querySelectorAll('.scai-editor-faq-item');
      var newIndex = existingItems.length;
      item.innerHTML =
        '<div class="scai-editor-faq-fields">' +
          '<input type="text" name="' + prefix + '[items][' + newIndex + '][q]" class="scai-editor-input" placeholder="Question">' +
          '<textarea name="' + prefix + '[items][' + newIndex + '][a]" rows="3" class="scai-editor-textarea" placeholder="Answer"></textarea>' +
        '</div>' +
        removeBtn;
    }

    if (type === 'service-row') {
      item.className += ' scai-editor-kv-item';
      var existingRows = repeater.querySelectorAll('.scai-editor-kv-item');
      var rowIndex = existingRows.length;
      item.innerHTML =
        '<input type="text" name="' + prefix + '[rows][' + rowIndex + '][label]" class="scai-editor-input scai-editor-input-sm" placeholder="Label">' +
        '<input type="text" name="' + prefix + '[rows][' + rowIndex + '][value]" class="scai-editor-input" placeholder="Value">' +
        removeBtn;
    }

    if (type === 'local-item') {
      item.innerHTML =
        '<input type="text" name="' + prefix + '[items][]" class="scai-editor-input" placeholder="Benefit">' +
        removeBtn;
    }

    if (type === 'list-item') {
      var placeholder = btn.getAttribute('data-placeholder') || 'Item';
      // Detect the field name suffix: if prefix ends with [pros] or [cons] or [headers], use [] directly.
      var nameSuffix = /\[(pros|cons|headers)\]$/.test(prefix) ? prefix + '[]' : prefix + '[items][]';
      item.innerHTML =
        '<input type="text" name="' + nameSuffix + '" class="scai-editor-input" placeholder="' + escapeAttr(placeholder) + '">' +
        removeBtn;
    }

    if (type === 'hm-item') {
      item.className += ' scai-editor-hm-item';
      var existingHm = repeater.querySelectorAll('.scai-editor-hm-item');
      var hmIndex = existingHm.length;
      item.innerHTML =
        '<div class="scai-editor-faq-fields">' +
          '<input type="text" name="' + prefix + '[items][' + hmIndex + '][title]" class="scai-editor-input" placeholder="Title">' +
          '<textarea name="' + prefix + '[items][' + hmIndex + '][desc]" rows="3" class="scai-editor-textarea" placeholder="Description"></textarea>' +
        '</div>' +
        removeBtn;
    }

    if (type === 'verdict-option') {
      item.className += ' scai-editor-hm-item';
      var existingOpts = repeater.querySelectorAll('.scai-editor-hm-item');
      var optIndex = existingOpts.length;
      item.innerHTML =
        '<div class="scai-editor-faq-fields">' +
          '<input type="text" name="' + prefix + '[options][' + optIndex + '][label]" class="scai-editor-input" placeholder="Label (e.g. Choose Product A)">' +
          '<textarea name="' + prefix + '[options][' + optIndex + '][text]" rows="2" class="scai-editor-textarea" placeholder="Description"></textarea>' +
        '</div>' +
        removeBtn;
    }

    if (type === 'nutrition-row') {
      item.className += ' scai-editor-kv-item';
      var existingNutr = repeater.querySelectorAll('.scai-editor-kv-item');
      var nutrIndex = existingNutr.length;
      item.innerHTML =
        '<input type="text" name="' + prefix + '[rows][' + nutrIndex + '][nutrient]" class="scai-editor-input scai-editor-input-sm" placeholder="Nutrient">' +
        '<input type="text" name="' + prefix + '[rows][' + nutrIndex + '][amount]" class="scai-editor-input" placeholder="Amount">' +
        removeBtn;
    }

    // Insert before the add button.
    repeater.insertBefore(item, btn);
    markDirty();

    // Focus the first input.
    var firstInput = item.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
  }

  /* ═══════════════════════════════════════════════════════════════
     IMAGE PREVIEW
     ═══════════════════════════════════════════════════════════════ */

  function handleImagePreview(e) {
    if (!e.target.hasAttribute('data-image-url')) return;

    var url = e.target.value;
    var field = e.target.closest('.scai-editor-image-field');
    if (!field) return;

    var preview = field.querySelector('[data-preview]');
    if (!preview) return;

    if (preview.tagName === 'IMG') {
      preview.src = url || '';
    }
  }

  form.addEventListener('input', handleImagePreview);
  if (sidebarEditFields) sidebarEditFields.addEventListener('input', handleImagePreview);

  /* ═══════════════════════════════════════════════════════════════
     WORDPRESS MEDIA LIBRARY PICKER
     ═══════════════════════════════════════════════════════════════ */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.sce-media-btn');
    if (!btn) return;

    if (typeof wp === 'undefined' || typeof wp.media === 'undefined') {
      showNotice('error', 'WordPress media library not available.');
      return;
    }

    var targetName = btn.getAttribute('data-media-target');
    if (!targetName) return;

    var targetInput = document.querySelector('[name="' + targetName + '"]');
    if (!targetInput) return;

    var frame = wp.media({
      title: 'Select Image',
      multiple: false,
      library: { type: 'image' }
    });

    frame.on('select', function () {
      var attachment = frame.state().get('selection').first().toJSON();
      targetInput.value = attachment.url;
      markDirty();

      var imageField = targetInput.closest('.scai-editor-image-field');
      if (imageField) {
        var preview = imageField.querySelector('[data-preview]');
        if (preview) {
          if (preview.tagName === 'IMG') {
            preview.src = attachment.url;
          } else {
            var img = document.createElement('img');
            img.src = attachment.url;
            img.alt = '';
            img.className = 'scai-editor-image-preview';
            img.setAttribute('data-preview', '');
            preview.parentNode.replaceChild(img, preview);
          }
        }
      }

      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    frame.open();
  });

  /* ═══════════════════════════════════════════════════════════════
     FIELD VALIDATION
     ═══════════════════════════════════════════════════════════════ */

  function clearValidation() {
    form.querySelectorAll('.sce-invalid').forEach(function (el) {
      el.classList.remove('sce-invalid');
    });
    form.querySelectorAll('.sce-validation-msg').forEach(function (el) {
      el.remove();
    });
    if (sidebarEditFields) {
      sidebarEditFields.querySelectorAll('.sce-invalid').forEach(function (el) {
        el.classList.remove('sce-invalid');
      });
      sidebarEditFields.querySelectorAll('.sce-validation-msg').forEach(function (el) {
        el.remove();
      });
    }
  }

  function addValidationError(input, message) {
    input.classList.add('sce-invalid');
    var msg = document.createElement('div');
    msg.className = 'sce-validation-msg';
    msg.textContent = message;
    input.parentNode.appendChild(msg);
  }

  function validateForm() {
    clearValidation();
    var errors = 0;
    var firstErrorEl = null;

    var blocks = blocksContainer.querySelectorAll('.scai-editor-block');
    blocks.forEach(function (block) {
      var type = block.getAttribute('data-component-type');
      var c = getFieldContainer(block);

      if (type === 'scai-h1') {
        var titleInput = c.querySelector('input[name*="[title]"]');
        if (titleInput && !titleInput.value.trim()) {
          addValidationError(titleInput, 'Article title is required.');
          errors++;
          if (!firstErrorEl) firstErrorEl = titleInput;
        }
      }

      if (type === 'scai-section' || type === 'scai-closing') {
        var headingInput = c.querySelector('input[name*="[heading]"]');
        if (headingInput && !headingInput.value.trim()) {
          addValidationError(headingInput, 'Section heading is required.');
          errors++;
          if (!firstErrorEl) firstErrorEl = headingInput;
        }
      }

      c.querySelectorAll('[data-image-url]').forEach(function (imgInput) {
        var val = imgInput.value.trim();
        if (val && !/^https?:\/\/.+/i.test(val)) {
          addValidationError(imgInput, 'Must be a valid URL (starts with http).');
          errors++;
          if (!firstErrorEl) firstErrorEl = imgInput;
        }
      });

      if (type === 'scai-product-card') {
        var ctaUrl = c.querySelector('input[name*="[cta_url]"]');
        if (ctaUrl) {
          var ctaVal = ctaUrl.value.trim();
          if (ctaVal && !/^https?:\/\/.+/i.test(ctaVal)) {
            addValidationError(ctaUrl, 'Must be a valid URL.');
            errors++;
            if (!firstErrorEl) firstErrorEl = ctaUrl;
          }
        }
      }

      if (type === 'scai-faq-section') {
        c.querySelectorAll('.scai-editor-faq-item').forEach(function (faqItem) {
          var qInput = faqItem.querySelector('input[name*="[q]"]');
          var aInput = faqItem.querySelector('textarea[name*="[a]"]');
          if (qInput && aInput) {
            if (qInput.value.trim() && !aInput.value.trim()) {
              addValidationError(aInput, 'Answer is required when question is provided.');
              errors++;
              if (!firstErrorEl) firstErrorEl = aInput;
            }
            if (!qInput.value.trim() && aInput.value.trim()) {
              addValidationError(qInput, 'Question is required when answer is provided.');
              errors++;
              if (!firstErrorEl) firstErrorEl = qInput;
            }
          }
        });
      }
    });

    if (errors > 0 && firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorEl.focus();
      showNotice('error', 'Please fix ' + errors + ' validation error' + (errors > 1 ? 's' : '') + ' before saving.');
      return false;
    }

    return true;
  }

  /* ═══════════════════════════════════════════════════════════════
     DRAG-AND-DROP REORDERING
     ═══════════════════════════════════════════════════════════════ */

  var draggedBlock = null;
  var draggedComponentType = null; // for sidebar-to-canvas drags
  var dropIndicator = null;

  function initDraggable() {
    blocksContainer.querySelectorAll('.scai-editor-block').forEach(function (block) {
      var type = block.getAttribute('data-component-type');
      if (type !== 'scai-h1' && type !== 'scai-table-of-contents') {
        block.setAttribute('draggable', 'true');
      }
    });
  }

  initDraggable();

  // Sidebar component button drag start.
  document.addEventListener('dragstart', function (e) {
    var btn = e.target.closest('[data-add-component]');
    if (!btn) return;

    draggedComponentType = btn.getAttribute('data-add-component');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', draggedComponentType);
    btn.classList.add('sce-dragging-sidebar');
  });

  document.addEventListener('dragend', function (e) {
    var btn = e.target.closest('[data-add-component]');
    if (btn) btn.classList.remove('sce-dragging-sidebar');
    if (draggedComponentType) {
      draggedComponentType = null;
      removeDropIndicator();
    }
  });

  // Block reorder drag start.
  blocksContainer.addEventListener('dragstart', function (e) {
    var block = e.target.closest('.scai-editor-block');
    if (!block || !block.getAttribute('draggable')) return;

    draggedBlock = block;
    block.classList.add('sce-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });

  blocksContainer.addEventListener('dragover', function (e) {
    if (!draggedBlock && !draggedComponentType) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedComponentType ? 'copy' : 'move';

    var target = e.target.closest('.scai-editor-block');
    if (!target || target === draggedBlock) {
      // If dragging from sidebar and no block target, show indicator at end.
      if (draggedComponentType && !target) {
        removeDropIndicator();
        dropIndicator = document.createElement('div');
        dropIndicator.className = 'sce-drop-indicator';
        blocksContainer.appendChild(dropIndicator);
      } else {
        removeDropIndicator();
      }
      return;
    }

    var rect = target.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    var insertBefore = e.clientY < midY;

    removeDropIndicator();
    dropIndicator = document.createElement('div');
    dropIndicator.className = 'sce-drop-indicator';

    if (insertBefore) {
      blocksContainer.insertBefore(dropIndicator, target);
    } else {
      if (target.nextElementSibling) {
        blocksContainer.insertBefore(dropIndicator, target.nextElementSibling);
      } else {
        blocksContainer.appendChild(dropIndicator);
      }
    }
  });

  blocksContainer.addEventListener('dragleave', function (e) {
    if (!blocksContainer.contains(e.relatedTarget)) {
      removeDropIndicator();
    }
  });

  blocksContainer.addEventListener('drop', function (e) {
    e.preventDefault();

    // Sidebar-to-canvas drop: create a new block at the drop position.
    if (draggedComponentType) {
      var compType = draggedComponentType;
      draggedComponentType = null;
      var template = componentTemplates[compType];
      if (template) {
        var currentCount = blocksContainer.querySelectorAll('.scai-editor-block').length;
        var blockEl = template(currentCount);

        if (compType !== 'scai-h1' && compType !== 'scai-table-of-contents') {
          blockEl.setAttribute('draggable', 'true');
        }

        if (dropIndicator && dropIndicator.parentNode) {
          blocksContainer.insertBefore(blockEl, dropIndicator);
        } else {
          blocksContainer.appendChild(blockEl);
        }

        removeDropIndicator();
        markDirty();
        updateSectionCount();

        blockEl.classList.add('sce-just-added');
        setTimeout(function () { blockEl.classList.remove('sce-just-added'); }, 600);

        selectBlock(blockEl);
        announce('Added ' + (componentLabels[compType] || compType.replace('scai-', '')));
      }
      return;
    }

    // Block reorder drop.
    if (!draggedBlock) return;

    if (dropIndicator && dropIndicator.parentNode) {
      blocksContainer.insertBefore(draggedBlock, dropIndicator);
    }

    removeDropIndicator();
    draggedBlock.classList.remove('sce-dragging');
    draggedBlock = null;
    markDirty();
    announce('Section reordered');
  });

  blocksContainer.addEventListener('dragend', function () {
    if (draggedBlock) {
      draggedBlock.classList.remove('sce-dragging');
      draggedBlock = null;
    }
    removeDropIndicator();
  });

  function removeDropIndicator() {
    if (dropIndicator && dropIndicator.parentNode) {
      dropIndicator.parentNode.removeChild(dropIndicator);
    }
    dropIndicator = null;
  }

  /* ═══════════════════════════════════════════════════════════════
     UNDO / REDO
     ═══════════════════════════════════════════════════════════════ */

  var undoStack = [];
  var redoStack = [];
  var MAX_UNDO = 30;
  var undoBtn = document.getElementById('sce-undo');
  var redoBtn = document.getElementById('sce-redo');
  var isRestoring = false;

  function snapshotState() {
    var snapshot = [];
    blocksContainer.querySelectorAll('.scai-editor-block').forEach(function (block) {
      var blockData = {
        type: block.getAttribute('data-component-type'),
        fields: {}
      };
      var source = getFieldContainer(block);
      source.querySelectorAll('input, textarea, select').forEach(function (input) {
        if (input.name) {
          blockData.fields[input.name] = input.value;
        }
      });
      snapshot.push(blockData);
    });
    return JSON.stringify(snapshot);
  }

  function restoreState(stateJson) {
    isRestoring = true;

    if (selectedBlock) deselectBlock();

    var snapshot = JSON.parse(stateJson);
    var blocks = blocksContainer.querySelectorAll('.scai-editor-block');
    var minCount = Math.min(blocks.length, snapshot.length);

    for (var i = 0; i < minCount; i++) {
      var block = blocks[i];
      var data = snapshot[i];
      block.querySelectorAll('input, textarea, select').forEach(function (input) {
        if (input.name && data.fields[input.name] !== undefined) {
          input.value = data.fields[input.name];
        }
      });
      // Update the visual preview after restoring field values.
      updateBlockPreview(block);
    }

    isRestoring = false;
    updateUndoRedoButtons();
  }

  function pushUndoState() {
    if (isRestoring) return;

    var state = snapshotState();
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === state) return;

    undoStack.push(state);
    if (undoStack.length > MAX_UNDO) undoStack.shift();

    redoStack = [];
    updateUndoRedoButtons();
  }

  function undo() {
    if (undoStack.length < 2) return;

    var current = undoStack.pop();
    redoStack.push(current);

    var previous = undoStack[undoStack.length - 1];
    restoreState(previous);
    announce('Undone');
  }

  function redo() {
    if (redoStack.length === 0) return;

    var next = redoStack.pop();
    undoStack.push(next);

    restoreState(next);
    announce('Redone');
  }

  function updateUndoRedoButtons() {
    if (undoBtn) undoBtn.disabled = undoStack.length < 2;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z') || (e.shiftKey && e.key === 'Z'))) {
      e.preventDefault();
      redo();
    }
  });

  // Take initial snapshot.
  setTimeout(function () {
    undoStack.push(snapshotState());
    updateUndoRedoButtons();
  }, 100);

  /* ═══════════════════════════════════════════════════════════════
     SAVE EDITOR (AJAX)
     ═══════════════════════════════════════════════════════════════ */

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      doSave();
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    doSave();
  });

  function doSave() {
    if (!saveBtn) return;

    // Move fields back to blocks for save + validation.
    var wasSelected = selectedBlock;
    returnFieldsToBlocks();

    if (!validateForm()) {
      if (wasSelected) selectBlock(wasSelected);
      return;
    }

    var originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="scai-spinner"></span> Saving...';
    saveBtn.disabled = true;

    var blocks = blocksContainer.querySelectorAll('.scai-editor-block');
    var formData = new FormData();
    formData.append('action', 'scai_save_editor');
    formData.append('nonce', scaiEditor.nonce);
    formData.append('post_id', scaiEditor.postId);

    blocks.forEach(function (block, blockIndex) {
      var inputs = block.querySelectorAll('input, textarea, select');
      inputs.forEach(function (input) {
        var name = input.name;
        if (!name) return;

        var reindexed = name.replace(/^components\[\d+\]/, 'components[' + blockIndex + ']');
        formData.append(reindexed, input.value);
      });
    });

    fetch(scaiEditor.ajaxUrl, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        if (res.success) {
          markClean();
          showNotice('success', res.data.message || 'Article saved.');
        } else {
          showNotice('error', (res.data && res.data.message) || 'Save failed.');
        }
        if (wasSelected && wasSelected.parentNode) selectBlock(wasSelected);
      })
      .catch(function () {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        showNotice('error', 'Network error — please try again.');
        if (wasSelected && wasSelected.parentNode) selectBlock(wasSelected);
      });
  }

  /* ═══════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════ */

  function updateSectionCount() {
    var counter = document.getElementById('sce-stat-sections');
    if (counter) {
      counter.textContent = blocksContainer.querySelectorAll('.scai-editor-block').length;
    }
  }

  function getFieldValue(block, suffix) {
    var container = getFieldContainer(block);
    var input = container.querySelector('input[name*="' + suffix + '"], textarea[name*="' + suffix + '"]');
    return input ? input.value : '';
  }

  function showNotice(type, message) {
    document.querySelectorAll('.scai-notice').forEach(function (n) { n.remove(); });

    var notice = document.createElement('div');
    notice.className = 'scai-notice scai-notice-' + type;
    notice.textContent = message;
    document.body.appendChild(notice);

    setTimeout(function () {
      if (notice.parentNode) notice.parentNode.removeChild(notice);
    }, 4000);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
