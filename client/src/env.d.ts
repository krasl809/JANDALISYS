/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_URL: string
  // أضف هنا أي متغيرات بيئة أخرى تبدأ بـ VITE_
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}