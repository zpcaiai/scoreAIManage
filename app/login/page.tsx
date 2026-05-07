'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// 页面日志工具
const logPage = (action: string, details?: any) => {
  console.log(`[PAGE] Login - ${new Date().toISOString()} - ${action}`, details);
};

const DEMO_ACCOUNTS = [
  { label: '管理员', username: 'admin', password: 'admin123', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '👑' },
  { label: '教师', username: 'teacher', password: 'teacher123', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '👨‍🏫' },
  { label: '学生', username: 'student', password: 'student123', color: 'bg-green-100 text-green-700 border-green-200', icon: '🎓' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // 页面加载日志
  useEffect(() => {
    logPage('PAGE_LOADED', {
      hasRedirect: searchParams.has('redirect'),
      redirectTo: searchParams.get('redirect')
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    logPage('LOGIN_SUBMIT', { username: username.trim() });
    e.preventDefault();
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      logPage('LOGIN_ATTEMPT', { username: username.trim() });
      const success = await login(username.trim(), password);
      if (success) {
        const redirect = searchParams.get('redirect') || '/grades';
        logPage('LOGIN_SUCCESS', { username: username.trim(), redirectTo: redirect });
        router.push(redirect);
        router.refresh();
      } else {
        logPage('LOGIN_FAILED', { username: username.trim(), reason: 'invalid_credentials' });
        setError('用户名或密码错误，请重试');
      }
    } catch (err) {
      logPage('LOGIN_ERROR', { username: username.trim(), error: err instanceof Error ? err.message : String(err) });
      setError(err instanceof Error ? err.message : '登录时发生错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = useCallback((acc: typeof DEMO_ACCOUNTS[0]) => {
    logPage('DEMO_ACCOUNT_SELECTED', { account: acc.label, username: acc.username });
    setUsername(acc.username);
    setPassword(acc.password);
    setError('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Logo / Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">📊</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          学生成绩管理系统
        </h1>
        <p className="mt-1 text-sm text-gray-500">Student Grade Management System</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">登录您的账号</h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👤</span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-12 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  tabIndex={-1}
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  登录中...
                </>
              ) : '登 录'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-7">
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 whitespace-nowrap">一键填入演示账号</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition hover:shadow-sm active:scale-95 ${acc.color}`}
                >
                  <span className="text-lg">{acc.icon}</span>
                  <span>{acc.label}</span>
                  <span className="opacity-70">{acc.username}</span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-center text-xs text-gray-400">
              点击卡片自动填入账号密码，然后点击登录
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} 学生成绩管理系统 · 未登录用户无法访问任何功能
        </p>
      </div>
    </div>
  );
}
