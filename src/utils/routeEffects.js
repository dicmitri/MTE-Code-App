const HIGHLIGHT_CLASSES = [
  'bg-yellow-50',
  'transition-colors',
  'duration-1000',
];

export function createRouteEffectScheduler({
  setTimer = (callback, delay) => window.setTimeout(callback, delay),
  clearTimer = (timerId) => window.clearTimeout(timerId),
} = {}) {
  let revision = 0;
  let routeTimer = null;
  let highlightTimer = null;
  let highlightedElement = null;

  const removeHighlight = () => {
    highlightedElement?.classList.remove(...HIGHLIGHT_CLASSES);
    highlightedElement = null;
  };

  const cancel = () => {
    revision += 1;

    if (routeTimer !== null) {
      clearTimer(routeTimer);
      routeTimer = null;
    }
    if (highlightTimer !== null) {
      clearTimer(highlightTimer);
      highlightTimer = null;
    }
    removeHighlight();
  };

  const schedule = ({
    anchor,
    findAnchor,
    scrollToTop,
  }) => {
    cancel();
    const scheduledRevision = revision;

    routeTimer = setTimer(() => {
      routeTimer = null;
      if (scheduledRevision !== revision) return;

      if (anchor) {
        const element = findAnchor?.(anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add(...HIGHLIGHT_CLASSES);
          highlightedElement = element;
          highlightTimer = setTimer(() => {
            highlightTimer = null;
            if (scheduledRevision !== revision) return;
            removeHighlight();
          }, 2000);
        }
        return;
      }

      scrollToTop?.();
    }, anchor ? 500 : 0);
  };

  return { cancel, schedule };
}
