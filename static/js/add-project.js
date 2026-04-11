(function() {
    const container = document.getElementById('categoryPanelContainer');
    const panelExisting = document.getElementById('panelExisting');
    const panelNew = document.getElementById('panelNew');
    const btnExisting = document.getElementById('toggleExisting');
    const btnNew = document.getElementById('toggleNew');
    const chosenArea = document.getElementById('chosenCategoriesContainer');
    const searchInput = document.getElementById('categorySearch');
    const customInput = document.getElementById('customCategoriesInput');

    // Categories
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

    btnExisting.addEventListener('click', () => togglePanel('new'));
    btnNew.addEventListener('click', () => togglePanel('existing'));

    function updateChosenCategories() {
        chosenArea.innerHTML = '';

        document.querySelectorAll('input[name="categories"]:checked').forEach(cb => {
            createCategoryCard(cb.value, () => { 
                cb.checked = false; 
                updateChosenCategories(); 
            });
        });

        const customCategories = customInput.value.split(',').map(t => t.trim()).filter(t => t !== "");
        customCategories.forEach(category => {
            createCategoryCard(tag, () => {
                const updated = customTags.filter(t => t !== tag);
                customInput.value = updated.join(', ');
                updateChosenCategories();
            });
        });

        function createCategoryCard(text, onRemove) {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `<span>${text}</span> <button type="button">×</button>`;
            chosenArea.appendChild(card);
        }
        
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.category-toggle-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(term) ? 'flex' : 'none';
            });
        });
        
        document.addEventListener('change', (e) => {
            if (e.target.name === 'categories') updateChosenCategories();
        });
        customInput.addEventListener('input', updateChosenCategories); 
        
        updateChosenCategories();
    }
}) ();