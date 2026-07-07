import { createApp } from "vue";
import { isDev } from "@/config";
import "./styles/tailwind.css";
import App from "./popupView/App.vue";

if (isDev) {
  import("@/contentView/main.ts");
}

createApp(App).mount("#app");
