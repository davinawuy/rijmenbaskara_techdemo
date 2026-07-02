// Turns stored slideshow blocks inside article bodies into interactive carousels.
// Stored markup (from the editor):
//   <div class="article-slideshow" data-slideshow>
//     <img src="..."> <img src="..."> ...
//   </div>
(function () {
  function buildSlideshow(block) {
    // Editor-only chrome may survive if an old draft was saved oddly — drop it.
    block.querySelectorAll('.slideshow-editor-bar').forEach((el) => el.remove());

    const images = Array.from(block.querySelectorAll('img'));
    if (images.length === 0) return;

    block.classList.add('is-live');
    block.innerHTML = '';

    const viewport = document.createElement('div');
    viewport.className = 'slideshow-viewport';

    const track = document.createElement('div');
    track.className = 'slideshow-track';

    images.forEach((img) => {
      const slide = document.createElement('div');
      slide.className = 'slideshow-slide';
      img.setAttribute('loading', 'lazy');
      slide.appendChild(img);
      track.appendChild(slide);
    });

    viewport.appendChild(track);
    block.appendChild(viewport);

    let index = 0;

    function show(i) {
      index = (i + images.length) % images.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, d) => dot.classList.toggle('is-active', d === index));
      counter.textContent = `${index + 1} / ${images.length}`;
    }

    // Only add controls when there's more than one image.
    const dots = [];
    let counter = document.createElement('span');

    if (images.length > 1) {
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'slideshow-nav slideshow-prev';
      prev.setAttribute('aria-label', 'Previous image');
      prev.innerHTML = '&#8249;';
      prev.addEventListener('click', () => show(index - 1));

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'slideshow-nav slideshow-next';
      next.setAttribute('aria-label', 'Next image');
      next.innerHTML = '&#8250;';
      next.addEventListener('click', () => show(index + 1));

      viewport.appendChild(prev);
      viewport.appendChild(next);

      const dotRow = document.createElement('div');
      dotRow.className = 'slideshow-dots';
      images.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'slideshow-dot';
        dot.setAttribute('aria-label', `Go to image ${i + 1}`);
        dot.addEventListener('click', () => show(i));
        dots.push(dot);
        dotRow.appendChild(dot);
      });
      block.appendChild(dotRow);

      counter.className = 'slideshow-counter';
      block.appendChild(counter);

      // Keyboard navigation when the slideshow is focused.
      block.tabIndex = 0;
      block.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
      });

      // Basic touch swipe.
      let startX = null;
      viewport.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      viewport.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) show(dx < 0 ? index + 1 : index - 1);
        startX = null;
      });
    }

    show(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document
      .querySelectorAll('.article-slideshow[data-slideshow]')
      .forEach(buildSlideshow);
  });
})();
