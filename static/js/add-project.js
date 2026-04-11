(function(){
  const container = document.getElementById('tagPanelContainer');
  const panelExisting = document.getElementById('panelExisting');
  const panelNew = document.getElementById('panelNew');
  const btnExisting = document.getElementById('toggleExisting');
  const btnNew = document.getElementById('toggleNew');
  const chosenArea = document.getElementById('chosenTagsContainer');
  const searchInput = document.getElementById('tagSearch');
  const customInput = document.getElementById('customTagsInput');

  if (!container || !chosenArea) return;

  function togglePanel(target) {
    const isCurrentlyOpen = container.style.display !== 'none';
    const isSamePanel = (target === 'existing' && panelExisting.style.display !== 'none') ||
                        (target === 'new' && panelNew.style.display !== 'none');

    if (isCurrentlyOpen && isSamePanel) {
        container.style.display = 'none';
        if (btnExisting) btnExisting.classList.remove('is-active');
        if (btnNew) btnNew.classList.remove('is-active');
    } else {
        container.style.display = 'block';
        if (target === 'existing') {
            panelExisting.style.display = 'block';
            panelNew.style.display = 'none';
            if (btnExisting) btnExisting.classList.add('is-active');
            if (btnNew) btnNew.classList.remove('is-active');
        } else {
            panelExisting.style.display = 'none';
            panelNew.style.display = 'block';
            if (btnExisting) btnExisting.classList.remove('is-active');
            if (btnNew) btnNew.classList.add('is-active');
        }
    }
  }

  if (btnExisting) btnExisting.addEventListener('click', () => togglePanel('existing'));
  if (btnNew) btnNew.addEventListener('click', () => togglePanel('new'));

  function updateChosenTags() {
    chosenArea.innerHTML = '';
    
    document.querySelectorAll('input[name="categories"]:checked').forEach(cb => {
        createTagCard(cb.value, () => { 
          cb.checked = false; 
          updateChosenTags(); 
        });
    });

    if (customInput) {
        const customTags = customInput.value.split(',').map(t => t.trim()).filter(t => t !== "");
        customTags.forEach(tag => {
            createTagCard(tag, () => {
                const updated = customTags.filter(t => t !== tag);
                customInput.value = updated.join(', ');
                updateChosenTags();
            });
        });
    }
  }

  function createTagCard(text, onRemove) {
    const card = document.createElement('div');
    card.className = 'tag-card';
    card.innerHTML = `<span>${text}</span><button type="button">×</button>`;
    card.querySelector('button').onclick = onRemove;
    chosenArea.appendChild(card);
  }

  // 6. Search filter for existing categories
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('.tag-toggle-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
      });
    });
  }
  
  document.addEventListener('change', (e) => {
    if (e.target.name === 'categories') updateChosenTags();
  });
  
  if (customInput) {
    customInput.addEventListener('input', updateChosenTags);
  }

  updateChosenTags();
})();