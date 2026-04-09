/**
 * SCAI Connector — Admin JavaScript
 *
 * Handles: style sub-tab switching, variation card selection,
 * color swatch sync, API key toggle, AJAX form submissions.
 *
 * Expects `scaiAdmin` global from wp_localize_script:
 *   { ajaxUrl, nonce, apiKey, stylingNonce, settingsNonce }
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     STYLING SUB-TAB SWITCHING
     ═══════════════════════════════════════════════════════════════ */

  document.querySelectorAll('.scai-styling-nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = this.getAttribute('data-style-tab');
      if (!tab) return;

      document.querySelectorAll('.scai-styling-nav-item').forEach(function (b) {
        b.classList.remove('active');
      });
      document.querySelectorAll('.scai-styling-section').forEach(function (s) {
        s.classList.remove('active');
      });

      this.classList.add('active');
      var section = document.getElementById('style-section-' + tab);
      if (section) section.classList.add('active');
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     VARIATION CARD SELECTION
     ═══════════════════════════════════════════════════════════════ */

  document.querySelectorAll('.scai-variation-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.scai-variation-card').forEach(function (c) {
        c.classList.remove('selected');
      });
      this.classList.add('selected');

      var input = document.getElementById('scai-variation-input');
      if (input) input.value = this.getAttribute('data-variation');
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     COLOR SWATCH ↔ HEX INPUT SYNC
     ═══════════════════════════════════════════════════════════════ */

  document.querySelectorAll('.scai-color-swatch').forEach(function (swatch) {
    swatch.addEventListener('input', function () {
      var target = this.getAttribute('data-target');
      var textInput = this.parentElement.querySelector('.scai-color-input');
      if (textInput) textInput.value = this.value;
    });
  });

  document.querySelectorAll('.scai-color-input').forEach(function (input) {
    input.addEventListener('input', function () {
      var swatch = this.parentElement.querySelector('.scai-color-swatch');
      if (swatch && /^#[0-9A-Fa-f]{6}$/.test(this.value)) {
        swatch.value = this.value;
      }
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     TOGGLE SWITCHES
     ═══════════════════════════════════════════════════════════════ */

  document.querySelectorAll('.scai-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      this.classList.toggle('active');
      var field = this.getAttribute('data-field');
      if (field) {
        var input = this.closest('form')
          ? this.closest('form').querySelector('input[name="' + field + '"]')
          : document.querySelector('input[name="' + field + '"]');
        if (input) {
          input.value = this.classList.contains('active') ? 'on' : 'off';
        }
      }
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     SAVE STYLING (AJAX)
     ═══════════════════════════════════════════════════════════════ */

  var stylingForm = document.getElementById('scai-styling-form');
  if (stylingForm) {
    stylingForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn = document.getElementById('scai-save-styling');
      var originalText = btn.innerHTML;
      btn.innerHTML = '<span class="scai-spinner"></span> Saving...';
      btn.disabled = true;

      var formData = new FormData(stylingForm);
      formData.append('action', 'scai_save_styling');
      formData.append('nonce', formData.get('scai_styling_nonce'));

      fetch(scaiAdmin.ajaxUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          btn.innerHTML = originalText;
          btn.disabled = false;
          if (res.success) {
            showNotice('success', res.data.message || 'Styling saved.');
          } else {
            showNotice('error', (res.data && res.data.message) || 'Save failed.');
          }
        })
        .catch(function () {
          btn.innerHTML = originalText;
          btn.disabled = false;
          showNotice('error', 'Network error.');
        });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     SAVE SETTINGS (AJAX)
     ═══════════════════════════════════════════════════════════════ */

  var settingsForm = document.getElementById('scai-settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn = document.getElementById('scai-save-settings');
      var originalText = btn.innerHTML;
      btn.innerHTML = '<span class="scai-spinner"></span> Saving...';
      btn.disabled = true;

      var formData = new FormData(settingsForm);
      formData.append('action', 'scai_save_settings');
      formData.append('nonce', formData.get('scai_settings_nonce'));

      fetch(scaiAdmin.ajaxUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          btn.innerHTML = originalText;
          btn.disabled = false;
          if (res.success) {
            showNotice('success', res.data.message || 'Settings saved.');
            // Reload to show updated API key display
            setTimeout(function () { location.reload(); }, 800);
          } else {
            showNotice('error', (res.data && res.data.message) || 'Save failed.');
          }
        })
        .catch(function () {
          btn.innerHTML = originalText;
          btn.disabled = false;
          showNotice('error', 'Network error.');
        });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     ARTICLES — Select All, Bulk Bar, Bulk Actions, Single Delete
     ═══════════════════════════════════════════════════════════════ */

  var selectAll = document.getElementById('scai-select-all');
  var bulkBar   = document.getElementById('scai-bulk-bar');

  function getArticleCheckboxes() {
    return document.querySelectorAll('.scai-article-cb');
  }

  function updateBulkBar() {
    var checked = document.querySelectorAll('.scai-article-cb:checked');
    if (bulkBar) {
      if (checked.length > 0) {
        bulkBar.classList.add('visible');
        var counter = document.getElementById('scai-selected-count');
        if (counter) counter.textContent = checked.length;
      } else {
        bulkBar.classList.remove('visible');
      }
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', function () {
      var checked = this.checked;
      getArticleCheckboxes().forEach(function (cb) { cb.checked = checked; });
      updateBulkBar();
    });
  }

  getArticleCheckboxes().forEach(function (cb) {
    cb.addEventListener('change', updateBulkBar);
  });

  // Bulk action buttons
  document.querySelectorAll('[data-bulk-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var action = btn.getAttribute('data-bulk-action');
      var ids = [];
      document.querySelectorAll('.scai-article-cb:checked').forEach(function (cb) {
        ids.push(cb.value);
      });
      if (!ids.length) return;

      var label = action === 'publish' ? 'publish' : action === 'draft' ? 'move to draft' : 'delete';
      var isDestructive = action === 'trash';

      showConfirm(
        isDestructive ? 'Delete Articles' : 'Confirm Action',
        'Are you sure you want to ' + label + ' ' + ids.length + ' article(s)?' +
          (isDestructive ? ' This cannot be undone.' : ''),
        isDestructive ? 'Delete' : 'Confirm',
        isDestructive,
        function () {
          var formData = new FormData();
          formData.append('action', 'scai_bulk_articles');
          formData.append('nonce', scaiAdmin.nonce);
          formData.append('bulk_action', action);
          formData.append('post_ids', ids.join(','));

          btn.disabled = true;

          fetch(scaiAdmin.ajaxUrl, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
          })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              btn.disabled = false;
              if (res.success) {
                showNotice('success', res.data.message || 'Done.');
                setTimeout(function () { location.reload(); }, 600);
              } else {
                showNotice('error', (res.data && res.data.message) || 'Action failed.');
              }
            })
            .catch(function () {
              btn.disabled = false;
              showNotice('error', 'Network error.');
            });
        }
      );
    });
  });

  // Single Delete button
  document.querySelectorAll('[data-trash-id]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var postId = btn.getAttribute('data-trash-id');

      showConfirm(
        'Delete Article',
        'This article will be moved to the trash. This cannot be undone.',
        'Delete',
        true,
        function () {
          var formData = new FormData();
          formData.append('action', 'scai_bulk_articles');
          formData.append('nonce', scaiAdmin.nonce);
          formData.append('bulk_action', 'trash');
          formData.append('post_ids', postId);

          btn.disabled = true;

          fetch(scaiAdmin.ajaxUrl, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
          })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              btn.disabled = false;
              if (res.success) {
                var row = btn.closest('tr');
                if (row) row.remove();
                showNotice('success', 'Article moved to trash.');
              } else {
                showNotice('error', (res.data && res.data.message) || 'Delete failed.');
              }
            })
            .catch(function () {
              btn.disabled = false;
              showNotice('error', 'Network error.');
            });
        }
      );
    });
  });

  // Single Publish button
  document.querySelectorAll('[data-publish-id]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var postId = this.getAttribute('data-publish-id');

      var formData = new FormData();
      formData.append('action', 'scai_bulk_articles');
      formData.append('nonce', scaiAdmin.nonce);
      formData.append('bulk_action', 'publish');
      formData.append('post_ids', postId);

      btn.disabled = true;
      btn.textContent = 'Publishing...';

      fetch(scaiAdmin.ajaxUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          btn.disabled = false;
          if (res.success) {
            showNotice('success', 'Article published.');
            setTimeout(function () { location.reload(); }, 600);
          } else {
            btn.textContent = 'Publish';
            showNotice('error', (res.data && res.data.message) || 'Publish failed.');
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Publish';
          showNotice('error', 'Network error.');
        });
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     CONFIRM MODAL
     ═══════════════════════════════════════════════════════════════ */

  var confirmModal = document.getElementById('scai-confirm-modal');
  var confirmCallback = null;

  function showConfirm(title, text, btnLabel, isDanger, onConfirm) {
    if (!confirmModal) {
      // Fallback if modal HTML is missing.
      if (window.confirm(text)) onConfirm();
      return;
    }
    confirmModal.querySelector('#scai-modal-title').textContent = title;
    confirmModal.querySelector('#scai-modal-text').textContent = text;
    var confirmBtn = confirmModal.querySelector('.scai-modal-confirm');
    confirmBtn.textContent = btnLabel || 'Confirm';
    if (isDanger) {
      confirmBtn.style.background = '#dc2626';
    } else {
      confirmBtn.style.background = '';
    }
    confirmCallback = onConfirm;
    confirmModal.style.display = '';
  }

  function hideConfirm() {
    if (confirmModal) confirmModal.style.display = 'none';
    confirmCallback = null;
  }

  if (confirmModal) {
    confirmModal.querySelector('.scai-modal-cancel').addEventListener('click', hideConfirm);
    confirmModal.querySelector('.scai-modal-confirm').addEventListener('click', function () {
      var cb = confirmCallback;
      hideConfirm();
      if (cb) cb();
    });
    confirmModal.addEventListener('click', function (e) {
      if (e.target === confirmModal) hideConfirm();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && confirmModal.style.display !== 'none') hideConfirm();
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════ */

  function showNotice(type, message) {
    // Remove existing notices
    document.querySelectorAll('.scai-notice').forEach(function (n) { n.remove(); });

    var notice = document.createElement('div');
    notice.className = 'scai-notice scai-notice-' + type;
    notice.textContent = message;

    var content = document.querySelector('.scai-main-body');
    if (content) {
      content.insertBefore(notice, content.firstChild);
      // Auto-remove after 4 seconds
      setTimeout(function () {
        if (notice.parentNode) notice.parentNode.removeChild(notice);
      }, 4000);
    }
  }

  function showButtonFeedback(btn, text) {
    var original = btn.innerHTML;
    btn.textContent = text;
    setTimeout(function () { btn.innerHTML = original; }, 1500);
  }
})();
