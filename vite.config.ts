import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import Icons from "unplugin-icons/vite";

export default defineConfig({
  // compiler "raw": cada ~icons/* vira a string SVG, que injetamos via innerHTML
  plugins: [Icons({ compiler: "raw", autoInstall: false }), viteSingleFile()],
  build: {
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    reportCompressedSize: false,
  },
});
