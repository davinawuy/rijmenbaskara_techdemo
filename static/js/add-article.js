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

  // Basic toolbar actions
  if (toolbar) {
    toolbar.addEventListener('click', (evt) => {
      const btn = evt.target.closest('button[data-command]');
      if (!btn) return;

      const [command, value] = btn.dataset.command.split(':');
      if (command === 'createLink') {
        const url = prompt('Enter URL');
        if (url) document.execCommand('createLink', false, url);
        return;
      }

      if (command === 'formatBlock') {
        document.execCommand('formatBlock', false, value || 'p');
      } else {
        document.execCommand(command, false, value || null);
      }

      // visual active state (lightweight)
      btn.classList.add('is-active');
      setTimeout(() => btn.classList.remove('is-active'), 160);
    });
  }

  // Markdown-ish quick shortcuts (#, ##, > + space)
  editor.addEventListener('keydown', (evt) => {
    if (evt.key !== ' ') return;

    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;

    const anchor = sel.anchorNode;
    const textNode = anchor.nodeType === 3 ? anchor : anchor.firstChild;
    if (!textNode) return;

    const raw = (textNode.textContent || '').trim();

    if (raw === '##') {
      evt.preventDefault();
      textNode.textContent = '';
      document.execCommand('formatBlock', false, 'h2');
    } else if (raw === '#') {
      evt.preventDefault();
      textNode.textContent = '';
      document.execCommand('formatBlock', false, 'h1');
    } else if (raw === '>') {
      evt.preventDefault();
      textNode.textContent = '';
      document.execCommand('formatBlock', false, 'blockquote');
    }
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
})();
