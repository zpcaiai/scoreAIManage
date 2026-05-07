import { redirect } from 'next/navigation';

// 首页日志
console.log(`[PAGE] Home - ${new Date().toISOString()} - Redirecting to /grades`);

export default function Home() {
  console.log(`[PAGE] Home - Rendering redirect component`);
  redirect('/grades');
}
