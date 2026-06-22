export function initParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
  if (!layers.length) return;

  let ticking = false;

  const update = () => {
    const isMobile = window.innerWidth < 1024;

    layers.forEach((layer) => {
      if (isMobile) {
        layer.style.transform = "";
        return;
      }

      const section = layer.closest("section");
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (rect.bottom < 0 || rect.top > viewportHeight) return;

      const speed = Number.parseFloat(layer.dataset.parallaxSpeed ?? "0.3");
      const offset = -rect.top * speed;
      const scale = layer.dataset.parallaxScale ?? "1.12";

      layer.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale})`;
    });

    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}
