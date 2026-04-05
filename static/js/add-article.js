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
})();
