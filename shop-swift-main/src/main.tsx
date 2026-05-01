import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/index";

// 🌍 language direction
const savedLang = localStorage.getItem("shopswift_lang") || "fr";
document.documentElement.setAttribute("dir", savedLang === "ar" ? "rtl" : "ltr");
document.documentElement.setAttribute("lang", savedLang);

// 🔥 FORCE favicon (IMPORTANT FIX CACHE)
const setFavicon = () => {
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.type = "image/png";
  link.href = "/logo.jpg?v=" + Date.now();
};

setFavicon();

// render app
createRoot(document.getElementById("root")!).render(<App />);

// service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("✅ Service Worker enregistré"))
      .catch((err) => console.warn("SW non enregistré:", err));
  });
}