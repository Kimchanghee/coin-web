import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { useAuth } from '../context/AuthContext';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError(t('signup.error_password_match'));
    }
    setError('');
    try {
      await signup(email, password);
      // After successful signup, navigate to login modal, replacing the history
      navigate('/login', { replace: true }); 
    } catch (err) {
      setError(t('signup.error_generic'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">{t('signup.title')}</h1>
            <p className="text-gray-300">{t('signup.subtitle')}</p>
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
          <div className="mb-4">
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
          <div className="mb-6">
            <label className="block text-gray-600 dark:text-gray-400 text-sm font-bold mb-2" htmlFor="confirm-password">
              {t('auth.confirm_password')}
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-black dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors focus:outline-none focus:shadow-outline"
            >
              {t('auth.signup')}
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">
            {t('signup.has_account')}{' '}
            <Link to="/login" replace className="font-bold text-yellow-400 hover:text-yellow-300">
              {t('auth.login')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;