export const calculateScrollProgress = ({
  scrollTop,
  scrollHeight,
  clientHeight,
}) => {
  const scrollableDistance = scrollHeight - clientHeight;
  if (!Number.isFinite(scrollableDistance) || scrollableDistance <= 0) return 0;

  const progress = (scrollTop / scrollableDistance) * 100;
  return Math.min(100, Math.max(0, progress));
};
