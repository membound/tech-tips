import { defineConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar';


// https://vitepress.dev/reference/site-config
const vitePressOptions = {
  title: "Technical Tips",
  description: "Tips for IT job interviews",
  srcDir: "./docs",
  base: "/tech-tips/",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: [1,6]  || 'all',
    nav: [],
    search: { provider: 'local' },
    editLink: { pattern: 'https://github.com/membound/tech-tips/edit/master/docs/:path' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/membound/tech-tips' }
    ]
  },
  markdown: {
    math: true  
  }
}

// https://vitepress-sidebar.cdget.com/guide/options
const vitePressSidebarOptions = {
  documentRootPath: '/docs',
  collapsed: false,
  hyphenToSpace: true,
};

export default defineConfig(
  withSidebar(vitePressOptions, vitePressSidebarOptions)
)
