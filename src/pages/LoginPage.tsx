import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(t('login.error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">{t('login.welcome_back')}</h1>
            <p className="text-gray-300">{t('login.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="relative bg-white dark:bg-[#1a1a1a] p-8 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label={t('auth.close')}
          >
            <i className="fas fa-times text-2xl"></i>
          </button>
          
          {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md mb-6 text-sm">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-600 dark:text-gray-400 text-sm font-bold mb-2" htmlFor="email">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-black dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-600 dark:text-gray-400 text-sm font-bold mb-2" htmlFor="password">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-black dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors focus:outline-none focus:shadow-outline"
            >
              {t('auth.login')}
            </button>
          </div>
           <p className="text-center text-gray-500 text-sm mt-6">
            {t('login.no_account')}{' '}
            <Link to="/signup" replace className="font-bold text-yellow-400 hover:text-yellow-300">
              {t('auth.signup')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;