// Medium-inspired editor interactions
(function(){
  const form = document.getElementById('articleForm');
  const bodyField = document.getElementById('bodyInput');
  const editor = document.getElementById('editorBody');
  const toolbar = document.querySelector('.toolbar');
  const coverInput = document.getElementById('coverInput');
  const coverPreview = document.getElementById('coverPreview');
  const coverPreviewImg = document.getElementById('coverPreviewImg');
  const removeCover = document.getElementById('removeCover');
  const insertImageBtn = document.getElementById('insertImageBtn');
  const inlineImageInput = document.getElementById('inlineImageInput');
  const insertSlideshowBtn = document.getElementById('insertSlideshowBtn');
  const slideshowInput = document.getElementById('slideshowInput');
  const editorConfig = document.getElementById('editorConfig');
  const uploadUrl = editorConfig ? editorConfig.dataset.uploadUrl : '';
  const container = document.getElementById('tagPanelContainer');
  const panelExisting = document.getElementById('panelExisting');
  const panelNew = document.getElementById('panelNew');
  const btnExisting = document.getElementById('toggleExisting');
  const btnNew = document.getElementById('toggleNew');
  const chosenArea = document.getElementById('chosenTagsContainer');
  const searchInput = document.getElementById('tagSearch');
  const customInput = document.getElementById('customTagsInput');

  if (!form || !editor) return;

  // Hydrate editor from hidden textarea (keeps HTML intact)
  if (bodyField && bodyField.value) {
    editor.innerHTML = bodyField.value;
  }

  // CSRF token for AJAX uploads
  function getCsrf() {
    const field = form.querySelector('input[name="csrfmiddlewaretoken"]');
    return field ? field.value : '';
  }

  // Upload one or more image files to the server, returns a promise of URLs.
  async function uploadImages(files) {
    const fd = new FormData();
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) fd.append('images', file);
    });
    const resp = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrf() },
      body: fd,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.success) {
      throw new Error((data && data.error) || 'Upload failed');
    }
    return data.urls || [];
  }

  // Produce the clean, storable HTML for the body: strip any editor-only chrome
  // (slideshow control bars) so only the semantic markup is saved.
  function serializeBody() {
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('.slideshow-editor-bar').forEach((el) => el.remove());
    clone.querySelectorAll('[data-slideshow]').forEach((el) => {
      el.classList.remove('is-enhanced');
    });
    return clone.innerHTML.trim();
  }

  // Sync HTML to hidden textarea on submit
  form.addEventListener('submit', () => {
    if (bodyField) {
      bodyField.value = serializeBody();
    }
  });

  // initialize with <p> to editor
  if (editor && editor.innerHTML.trim() === "") {
    editor.innerHTML = '<p><br></p>';
  }

  // Basic toolbar actions
  if (toolbar) {
    toolbar.addEventListener('mousedown', (evt) => {
      evt.preventDefault();
    })

    toolbar.addEventListener('click', (evt) => {
      const btn = evt.target.closest('button[data-command]');
      if (!btn) return;

      const [command, value] = btn.dataset.command.split(':');

      if (command === 'createLink') {
        const url = prompt('Enter URL');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(command, false, value || null);
      }

      editor.focus();
    });
  }

  // Markdown-ish quick shortcuts (#, ##, > + space)
  editor.addEventListener('keydown', (evt) => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    let block = range.startContainer;
    if (block.nodeType === 3) block = block.parentNode;
    block = block.closest('p, h1, h2, blockquote, li');

    if (evt.key === 'Enter') {
      if (block && (block.tagName === 'BLOCKQUOTE' || block.tagName.startsWith('H')) && block.textContent.trim() === "") {
        evt.preventDefault();
        
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        
        block.parentNode.insertBefore(newP, block.nextSibling);
        block.remove();

        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return;
      }
    }

    if (evt.key === ' ') {
      const text = block ? block.textContent : "";
      
      let targetBlock = null;
      if (text === '#') targetBlock = 'h1';
      else if (text === '##') targetBlock = 'h2';
      else if (text === '>') targetBlock = 'blockquote';

      if (targetBlock) {
        evt.preventDefault();
        block.textContent = "";
        document.execCommand('formatBlock', false, targetBlock);
      }
    }
  });

  editor.addEventListener('input', () => {
    document.getElementById('bodyInput').value = editor.innerHTML;
  });

  // Cover preview
  function resetCover(){
    if (coverPreview) {
      coverPreview.hidden = true;
    }
    if (coverPreviewImg) {
      coverPreviewImg.src = '';
    }
  }

  if (coverInput) {
    coverInput.addEventListener('change', (evt) => {
      const file = evt.target.files?.[0];
      if (!file) {
        resetCover();
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (!coverPreviewImg || !coverPreview) return;
        coverPreviewImg.src = e.target?.result;
        coverPreview.hidden = false;
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeCover) {
    removeCover.addEventListener('click', () => {
      if (coverInput) coverInput.value = '';
      resetCover();
    });
  }

  // Insert a DOM node at the last known caret position (or append to the editor).
  function insertNodeAtCaret(node, savedRange) {
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      savedRange.insertNode(node);
      savedRange.setStartAfter(node);
      savedRange.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } else {
      editor.appendChild(node);
    }
  }

  // Inline image insertion — uploads to the server and inserts an <img> that
  // references the stored file (no base64, so large images no longer bloat the body).
  if (insertImageBtn && inlineImageInput) {
    insertImageBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      inlineImageInput.click();
    });

    inlineImageInput.addEventListener('change', async (evt) => {
      const files = evt.target.files;
      if (!files || files.length === 0) return;

      const sel = window.getSelection();
      const savedRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

      insertImageBtn.disabled = true;
      const originalLabel = insertImageBtn.textContent;
      insertImageBtn.textContent = '⏳';
      try {
        const urls = await uploadImages(files);
        urls.forEach((url) => {
          const img = document.createElement('img');
          img.src = url;
          img.className = 'inline-image';
          insertNodeAtCaret(img, savedRange);
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          insertNodeAtCaret(p, savedRange);
        });
        syncBody();
      } catch (err) {
        alert('Could not upload image: ' + err.message);
      } finally {
        insertImageBtn.disabled = false;
        insertImageBtn.textContent = originalLabel;
        inlineImageInput.value = '';
      }
    });
  }

  // Keep the hidden textarea roughly in sync as the editor changes.
  function syncBody() {
    if (bodyField) bodyField.value = serializeBody();
  }

  // ---- Slideshow blocks ----------------------------------------------------
  // Stored markup is minimal: <div class="article-slideshow" data-slideshow>
  //   <img src="..."> ... </div>. In the editor we wrap it as a non-editable
  // atomic block with a small control bar (stripped out on save).

  function buildSlideshow(urls) {
    const block = document.createElement('div');
    block.className = 'article-slideshow';
    block.setAttribute('data-slideshow', '');
    urls.forEach((url) => {
      const img = document.createElement('img');
      img.src = url;
      block.appendChild(img);
    });
    return block;
  }

  // Add editor chrome (label + add/remove buttons) to a slideshow block once.
  function enhanceSlideshow(block) {
    if (block.classList.contains('is-enhanced')) return;
    block.classList.add('is-enhanced');
    block.setAttribute('contenteditable', 'false');

    const bar = document.createElement('div');
    bar.className = 'slideshow-editor-bar';
    bar.setAttribute('contenteditable', 'false');

    const label = document.createElement('span');
    function updateLabel() {
      // Count only the real slide images, not the toolbar.
      const n = block.querySelectorAll(':scope > img').length;
      label.textContent = `🎞 Slideshow · ${n} image${n === 1 ? '' : 's'}`;
    }
    updateLabel();

    const actions = document.createElement('span');
    actions.className = 'slideshow-editor-actions';

    // "Add images" — appends more slides to THIS block.
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Add images';
    addBtn.addEventListener('click', () => {
      // A fresh input each time avoids stale-selection issues.
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.multiple = true;
      picker.addEventListener('change', async () => {
        if (!picker.files || picker.files.length === 0) return;
        addBtn.disabled = true;
        addBtn.textContent = '⏳ Uploading…';
        try {
          const urls = await uploadImages(picker.files);
          urls.forEach((url) => {
            const img = document.createElement('img');
            img.src = url;
            block.appendChild(img); // append after existing slides
          });
          updateLabel();
          syncBody();
        } catch (err) {
          alert('Could not add images: ' + err.message);
        } finally {
          addBtn.disabled = false;
          addBtn.textContent = 'Add images';
        }
      });
      picker.click();
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      block.remove();
      syncBody();
    });

    actions.appendChild(addBtn);
    actions.appendChild(removeBtn);
    bar.appendChild(label);
    bar.appendChild(actions);
    block.insertBefore(bar, block.firstChild);
  }

  function enhanceAllSlideshows() {
    editor.querySelectorAll('.article-slideshow[data-slideshow]').forEach(enhanceSlideshow);
  }

  if (insertSlideshowBtn && slideshowInput) {
    insertSlideshowBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      slideshowInput.click();
    });

    slideshowInput.addEventListener('change', async (evt) => {
      const files = evt.target.files;
      if (!files || files.length === 0) return;

      const sel = window.getSelection();
      const savedRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

      insertSlideshowBtn.disabled = true;
      const originalLabel = insertSlideshowBtn.textContent;
      insertSlideshowBtn.textContent = '⏳ Uploading…';
      try {
        const urls = await uploadImages(files);
        if (urls.length) {
          const block = buildSlideshow(urls);
          insertNodeAtCaret(block, savedRange);
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          insertNodeAtCaret(p, savedRange);
          enhanceSlideshow(block);
          syncBody();
        }
      } catch (err) {
        alert('Could not upload slideshow images: ' + err.message);
      } finally {
        insertSlideshowBtn.disabled = false;
        insertSlideshowBtn.textContent = originalLabel;
        slideshowInput.value = '';
      }
    });
  }

  // Enhance any slideshow blocks that were loaded from a saved draft.
  enhanceAllSlideshows();

  // Tags
  function togglePanel(target) {
        const isCurrentlyOpen = container.style.display !== 'none';
        const isSamePanel = (target === 'existing' && panelExisting.style.display !== 'none') ||
                            (target === 'new' && panelNew.style.display !== 'none');

        if (isCurrentlyOpen && isSamePanel) {
            container.style.display = 'none';
            btnExisting.classList.remove('is-active');
            btnNew.classList.remove('is-active');
        } else {
            container.style.display = 'block';
            if (target === 'existing') {
                panelExisting.style.display = 'block';
                panelNew.style.display = 'none';
                btnExisting.classList.add('is-active');
                btnNew.classList.remove('is-active');
            } else {
                panelExisting.style.display = 'none';
                panelNew.style.display = 'block';
                btnExisting.classList.remove('is-active');
                btnNew.classList.add('is-active');
            }
        }
    }

    btnExisting.addEventListener('click', () => togglePanel('existing'));
    btnNew.addEventListener('click', () => togglePanel('new'));

    function updateChosenTags() {
        chosenArea.innerHTML = '';
        
        document.querySelectorAll('input[name="tags"]:checked').forEach(cb => {
            createTagCard(cb.value, () => { 
              cb.checked = false; 
              updateChosenTags(); });
        });

        const customTags = customInput.value.split(',').map(t => t.trim()).filter(t => t !== "");
        customTags.forEach(tag => {
            createTagCard(tag, () => {
                const updated = customTags.filter(t => t !== tag);
                customInput.value = updated.join(', ');
                updateChosenTags();
            });
        });
    }

    function createTagCard(text, onRemove) {
        const card = document.createElement('div');
        card.className = 'tag-card';
        card.innerHTML = `<span>${text}</span><button type="button">×</button>`;
        card.querySelector('button').onclick = onRemove;
        chosenArea.appendChild(card);
    }

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('.tag-toggle-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
      });
    });
    
    document.addEventListener('change', (e) => {
      if (e.target.name === 'tags') updateChosenTags();
    });
    customInput.addEventListener('input', updateChosenTags);

    updateChosenTags();
})();
