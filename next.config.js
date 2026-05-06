/** @type {import('next').NextConfig} */
const nextConfig = {
  // 输出配置为静态文件，适用于Hugging Face Spaces
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // 环境变量配置
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://scoreaimanage.onrender.com/api',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://huggingface.co/spaces/StephenZao/scoreaimanage',
  },
  // 基础路径配置
  basePath: '',
  // 资源前缀
  assetPrefix: '',
}

module.exports = nextConfig
