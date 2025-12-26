// Simple horizontal slider + client-side add image (non-persistent)
(function(){
  const grid = document.getElementById('worksGrid');
  const upload = document.getElementById('workUpload');
  const modal = document.createElement('div');
  modal.className = 'work-modal';
  modal.innerHTML = `
    <div class="work-modal__backdrop"></div>
    <div class="work-modal__content">
      <button class="work-modal__close" aria-label="Close">×</button>
      <img alt="Work preview">
      <div class="work-modal__caption"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalImg = modal.querySelector('img');
  const modalCaption = modal.querySelector('.work-modal__caption');
  const closeBtn = modal.querySelector('.work-modal__close');
  const backdrop = modal.querySelector('.work-modal__backdrop');

  // Slider controls
  document.querySelectorAll('.slider-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!grid) return;
      const dir = btn.dataset.dir === 'next' ? 1 : -1;
      const scrollAmount = grid.clientWidth * 0.9;
      grid.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    });
  });

  // Drag to scroll
  if (grid) {
    grid.addEventListener('click', (e) => {
      const fig = e.target.closest('.work-item');
      if (!fig) return;
      const img = fig.querySelector('img');
      const caption = fig.querySelector('figcaption');
      if (img && modalImg && modalCaption) {
        modalImg.src = img.src;
        modalImg.alt = img.alt || '';
        modalCaption.textContent = caption ? caption.textContent : '';
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
    });

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    grid.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - grid.offsetLeft;
      scrollLeft = grid.scrollLeft;
      grid.classList.add('is-grabbing');
    });
    grid.addEventListener('mouseleave', () => { isDown = false; grid.classList.remove('is-grabbing'); });
    grid.addEventListener('mouseup', () => { isDown = false; grid.classList.remove('is-grabbing'); });
    grid.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - grid.offsetLeft;
      const walk = (x - startX) * 1.4;
      grid.scrollLeft = scrollLeft - walk;
    });

    // Touch swipe
    grid.addEventListener('touchstart', (e) => {
      isDown = true;
      startX = e.touches[0].pageX - grid.offsetLeft;
      scrollLeft = grid.scrollLeft;
    });
    grid.addEventListener('touchmove', (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - grid.offsetLeft;
      const walk = (x - startX) * 1.2;
      grid.scrollLeft = scrollLeft - walk;
    });
    grid.addEventListener('touchend', () => { isDown = false; });
  }

  // Admin upload -> submit form (server saves to static)
  if (upload) {
    upload.addEventListener('change', () => {
      const form = document.getElementById('workUploadForm');
      if (form && upload.files.length) form.submit();
    });
  }

  function closeModal(){
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  [closeBtn, backdrop].forEach(el => {
    if (el) el.addEventListener('click', closeModal);
  });
})();
