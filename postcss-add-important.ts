import type { PluginCreator } from "postcss";

/**
 * PostCSS 插件：为所有 CSS 声明自动添加 !important
 * 专为 content script 设计，确保注入到宿主页面的样式权重最高
 */
export const addImportantPlugin: PluginCreator<{}> = () => {
  return {
    postcssPlugin: "postcss-add-important",
    Once(root) {
      root.walkDecls((decl) => {
        if (!decl.important) {
          decl.important = true;
        }
      });
    },
  };
};
addImportantPlugin.postcss = true;
