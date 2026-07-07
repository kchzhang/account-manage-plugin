import { type Ref, onMounted, onBeforeUnmount } from "vue";

export function useDraggable(options: {
  posX: Ref<number>;
  posY: Ref<number>;
  width: Ref<number>;
  disabled: () => boolean;
}) {
  const { posX, posY, width, disabled } = options;

  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  let touchDragging = false;
  let touchDragOffsetX = 0;
  let touchDragOffsetY = 0;

  function onHeaderMouseDown(e: MouseEvent) {
    if (disabled()) return;
    dragging = true;
    dragOffsetX = e.clientX - posX.value;
    dragOffsetY = e.clientY - posY.value;
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    let newX = e.clientX - dragOffsetX;
    let newY = e.clientY - dragOffsetY;
    newX = Math.max(0, Math.min(newX, window.innerWidth - width.value));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 48));
    posX.value = newX;
    posY.value = newY;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onHeaderTouchStart(e: TouchEvent) {
    if (disabled()) return;
    const touch = e.touches[0];
    touchDragging = true;
    touchDragOffsetX = touch.clientX - posX.value;
    touchDragOffsetY = touch.clientY - posY.value;
  }

  function onHeaderTouchMove(e: TouchEvent) {
    if (!touchDragging) return;
    const touch = e.touches[0];
    let newX = touch.clientX - touchDragOffsetX;
    let newY = touch.clientY - touchDragOffsetY;
    newX = Math.max(0, Math.min(newX, window.innerWidth - width.value));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 48));
    posX.value = newX;
    posY.value = newY;
  }

  function onHeaderTouchEnd() {
    touchDragging = false;
  }

  onMounted(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  });

  return {
    onHeaderMouseDown,
    onHeaderTouchStart,
    onHeaderTouchMove,
    onHeaderTouchEnd,
  };
}
