(function () {
  const scroller = document.getElementById("pageScroll");
  const thumb = document.getElementById("scrollThumb");
  if (!scroller || !thumb) return;

  function updateThumb() {
    const scrollHeight = scroller.scrollHeight;
    const clientHeight = scroller.clientHeight;
    const scrollTop = scroller.scrollTop;

    const track = thumb.parentElement;
    const trackHeight = track.clientHeight;

    // If nothing to scroll, thumb fills track
    if (scrollHeight <= clientHeight) {
      thumb.style.height = trackHeight + "px";
      thumb.style.transform = "translateY(0px)";
      return;
    }

    // Thumb size proportional to visible area
    const ratio = clientHeight / scrollHeight;
    const minThumb = 28;
    const thumbHeight = Math.max(trackHeight * ratio, minThumb);

    // Thumb position
    const maxTop = trackHeight - thumbHeight;
    const maxScroll = scrollHeight - clientHeight;
    const top = (scrollTop / maxScroll) * maxTop;

    thumb.style.height = thumbHeight + "px";
    thumb.style.transform = `translateY(${top}px)`;
  }

  updateThumb();
  scroller.addEventListener("scroll", updateThumb, { passive: true });
  window.addEventListener("resize", updateThumb);
})();
