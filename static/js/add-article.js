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

  // Sync HTML to hidden textarea on submit
  form.addEventListener('submit', () => {
    if (bodyField) {
      bodyField.value = editor.innerHTML.trim();
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

  // Inline image insertion
  if (insertImageBtn && inlineImageInput) {
    insertImageBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      inlineImageInput.click();
    });

    inlineImageInput.addEventListener('change', (evt) => {
      const files = evt.target.files;
      if (!files || files.length === 0) return;

      // Save current selection/range
      const sel = window.getSelection();
      let range = null;
      if (sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
      }

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.alt = file.name;
          img.className = 'inline-image';
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.margin = '20px auto';

          // Insert at saved range or at end
          if (range) {
            sel.removeAllRanges();
            sel.addRange(range);
            range.insertNode(img);
            
            // Move cursor after image
            range.setStartAfter(img);
            range.setEndAfter(img);
            sel.removeAllRanges();
            sel.addRange(range);

            // Add line break after image for better editing
            const br = document.createElement('br');
            range.insertNode(br);
          } else {
            editor.appendChild(img);
            const br = document.createElement('br');
            editor.appendChild(br);
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input for reuse
      inlineImageInput.value = '';
    });
  }

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
