import { type Ref, onMounted, onBeforeUnmount } from "vue";

export function useResizable(options: {
  posX: Ref<number>;
  posY: Ref<number>;
  width: Ref<number>;
  height: Ref<number>;
  minWidth: number;
  minHeight: number;
  disabled: () => boolean;
}) {
  const { posX, posY, width, height, minWidth, minHeight, disabled } = options;

  let resizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartW = 0;
  let resizeStartH = 0;

  function onResizeMouseDown(e: MouseEvent) {
    if (disabled()) return;
    e.preventDefault();
    e.stopPropagation();
    startResize(e.clientX, e.clientY);
  }

  function onResizeTouchStart(e: TouchEvent) {
    if (disabled()) return;
    e.stopPropagation();
    const touch = e.touches[0];
    startResize(touch.clientX, touch.clientY);
  }

  function startResize(clientX: number, clientY: number) {
    resizing = true;
    resizeStartX = clientX;
    resizeStartY = clientY;
    resizeStartW = width.value;
    resizeStartH = height.value;
  }

  function handleResizeMove(clientX: number, clientY: number) {
    let newW = resizeStartW + (clientX - resizeStartX);
    let newH = resizeStartH + (clientY - resizeStartY);
    newW = Math.max(minWidth, newW);
    newH = Math.max(minHeight, newH);
    newW = Math.min(newW, window.innerWidth - posX.value);
    newH = Math.min(newH, window.innerHeight - posY.value);
    width.value = newW;
    height.value = newH;
  }

  function onMouseMove(e: MouseEvent) {
    if (!resizing) return;
    handleResizeMove(e.clientX, e.clientY);
  }

  function onMouseUp() {
    resizing = false;
  }

  function onTouchMove(e: TouchEvent) {
    if (!resizing) return;
    const touch = e.touches[0];
    handleResizeMove(touch.clientX, touch.clientY);
  }

  function onTouchEnd() {
    resizing = false;
  }

  onMounted(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
  });

  return {
    onResizeMouseDown,
    onResizeTouchStart,
  };
}
