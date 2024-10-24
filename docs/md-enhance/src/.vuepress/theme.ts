import { theme } from "docs-shared";
import { getDirname, path } from "vuepress/utils";

import { enNavbar, zhNavbar } from "./navbar.js";
import { enSidebar, zhSidebar } from "./sidebar.js";

const __dirname = getDirname(import.meta.url);

export default theme("md-enhance", {
  locales: {
    "/": {
      navbar: enNavbar,
      sidebar: enSidebar,
    },

    "/zh/": {
      navbar: zhNavbar,
      sidebar: zhSidebar,
    },
  },

  plugins: {
    components: {
      components: ["Badge", "VPCard"],
    },

    markdownImage: {
      figure: true,
      lazyload: true,
      mark: true,
    },

    markdownTab: {
      codeTabs: true,
    },

    mdEnhance: {
      chart: true,
      demo: true,
      echarts: true,
      flowchart: true,
      include: {
        resolvePath: (file) => {
          if (file.startsWith("@echarts"))
            return file.replace(
              "@echarts",
              path.resolve(__dirname, "../echarts"),
            );

          return file;
        },
      },
      kotlinPlayground: true,
      markmap: true,
      mermaid: true,
      plantuml: true,
      playground: {
        presets: ["ts", "vue", "unocss"],
      },
      sandpack: true,
      vuePlayground: true,
    },
  },
});
