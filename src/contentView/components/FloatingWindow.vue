<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { IconSidebar, IconMinimize, IconMaximize, IconClose, IconResize } from "@/icons";
import { useDraggable } from "../composables/useDraggable";
import { useResizable } from "../composables/useResizable";
import { FLOATING_WINDOW_Z_INDEX, WINDOW_MARGIN } from "@/constants/config";

const props = withDefaults(
  defineProps<{
    title?: string;
    width?: number;
    height?: number;
    initX?: number;
    initY?: number;
    minWidth?: number;
    minHeight?: number;
  }>(),
  {
    title: "浮动窗口",
    width: 400,
    height: 500,
    initX: -1,
    initY: -1,
    minWidth: 200,
    minHeight: 150,
  }
);

const visible = ref(true);
const minimized = ref(false);

const posX = ref(0);
const posY = ref(0);
const currentWidth = ref(props.width);
const currentHeight = ref(props.height);

const windowStyle = computed(() => ({
  position: "fixed" as const,
  left: `${posX.value}px`,
  top: `${posY.value}px`,
  width: `${currentWidth.value}px`,
  height: minimized.value ? "auto" : `${currentHeight.value}px`,
  zIndex: FLOATING_WINDOW_Z_INDEX,
}));

onMounted(() => {
  if (props.initX >= 0 && props.initY >= 0) {
    posX.value = props.initX;
    posY.value = props.initY;
  } else {
    posX.value = window.innerWidth - currentWidth.value - WINDOW_MARGIN;
    posY.value = window.innerHeight - currentHeight.value - WINDOW_MARGIN;
  }
});

const { onHeaderMouseDown, onHeaderTouchStart, onHeaderTouchMove, onHeaderTouchEnd } = useDraggable({
  posX,
  posY,
  width: currentWidth,
  disabled: () => minimized.value,
});

const { onResizeMouseDown, onResizeTouchStart } = useResizable({
  posX,
  posY,
  width: currentWidth,
  height: currentHeight,
  minWidth: props.minWidth,
  minHeight: props.minHeight,
  disabled: () => minimized.value,
});

function handleMinimize() {
  minimized.value = !minimized.value;
}

function handleClose() {
  visible.value = false;
}

function handleReopen() {
  visible.value = true;
  minimized.value = false;
}
</script>

<template>
  <!-- 关闭后的浮球 -->
  <div
    v-if="!visible"
    class="fixed right-5 bottom-5 w-10 h-10 rounded-full bg-sky-500 shadow-[0_2px_12px_rgba(14,165,233,0.35)] cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-sky-400 hover:shadow-[0_4px_16px_rgba(14,165,233,0.45)] hover:scale-105"
    :style="{ zIndex: FLOATING_WINDOW_Z_INDEX }"
    @click="handleReopen"
  >
    <IconSidebar class="w-[18px] h-[18px] text-white [&>svg]:stroke-white" />
  </div>

  <!-- 浮动窗口 -->
  <div v-if="visible" class="block font-sans bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden select-none" :style="windowStyle">
    <div
      class="flex items-center justify-between h-11 px-4 bg-slate-50 cursor-move select-none"
      @mousedown="onHeaderMouseDown"
      @touchstart="onHeaderTouchStart"
      @touchmove="onHeaderTouchMove"
      @touchend="onHeaderTouchEnd"
    >
      <span class="text-[13px] font-medium text-gray-700 tracking-wide block leading-11 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]">{{ title }}</span>
      <div class="flex items-center gap-0.5">
        <slot name="header-actions"></slot>
        <button class="inline-flex items-center justify-center w-7 h-7 rounded-md cursor-pointer text-gray-400 transition-colors duration-150 hover:bg-slate-100 hover:text-gray-600" @click.stop="handleMinimize" :title="minimized ? '展开' : '最小化'">
          <IconMinimize v-if="!minimized" class="w-3.5 h-3.5" />
          <IconMaximize v-else class="w-3.5 h-3.5" />
        </button>
        <button class="inline-flex items-center justify-center w-7 h-7 rounded-md cursor-pointer text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500" @click.stop="handleClose" title="关闭">
          <IconClose class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    <div v-show="!minimized" class="block h-[1px] bg-slate-200/60"></div>
    <div v-show="!minimized" class="block p-4 h-[calc(100%-52px)] overflow-y-auto text-sm text-gray-700 leading-relaxed box-border select-text">
      <slot></slot>
    </div>
    <!-- 右下角拉伸手柄 -->
    <div
      v-show="!minimized"
      class="group absolute right-0 bottom-0 w-[18px] h-[18px] cursor-nwse-resize flex items-center justify-center p-0.5 rounded-br-2xl"
      @mousedown="onResizeMouseDown"
      @touchstart="onResizeTouchStart"
    >
      <IconResize class="w-2.5 h-2.5 text-gray-300 transition-colors duration-150 group-hover:text-sky-400 group-active:text-sky-500 [&>svg]:fill-current" />
    </div>
  </div>
</template>

