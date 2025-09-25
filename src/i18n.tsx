import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en.js';
import ko from './locales/ko.js';
import ja from './locales/ja.js';
import zh from './locales/zh.js';
import th from './locales/th.js';
import vi from './locales/vi.js';

type TranslationResources = Record<string, unknown>;

type TranslationOptions = {
  defaultValue?: string;
} & Record<string, unknown>;

type TranslationContextValue = {
  language: string;
  changeLanguage: (language: string) => Promise<void>;
  translate: (key: string, options?: TranslationOptions) => string;
};

const resources: Record<string, TranslationResources> = {
  en,
  ko,
  ja,
  zh,
  th,
  vi,
};

const STORAGE_KEY = 'i18nextLng';
const DEFAULT_LANGUAGE = 'ko';
const FALLBACK_LANGUAGE = 'en';

const I18nContext = createContext<TranslationContextValue | undefined>(undefined);

const getNestedValue = (resource: TranslationResources | undefined, pathSegments: string[]) => {
  return pathSegments.reduce<unknown>((accumulator, segment) => {
    if (accumulator == null) {
      return undefined;
    }

    if (Array.isArray(accumulator)) {
      const index = Number(segment);
      if (Number.isNaN(index)) {
        return undefined;
      }
      return accumulator[index];
    }

    if (typeof accumulator === 'object') {
      return (accumulator as Record<string, unknown>)[segment];
    }

    return undefined;
  }, resource);
};

const formatValue = (value: unknown, options?: TranslationOptions) => {
  if (typeof value !== 'string') {
    if (value == null) {
      return '';
    }
    return String(value);
  }

  if (!options) {
    return value;
  }

  const { defaultValue: _default, ...replacements } = options;

  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const replacement = (replacements as Record<string, unknown>)[key];
    return replacement == null ? '' : String(replacement);
  });
};

const detectInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && resources[stored]) {
    return stored;
  }

  return DEFAULT_LANGUAGE;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>(() => detectInitialLanguage());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const translate = useCallback((key: string, options?: TranslationOptions) => {
    const segments = key.split('.');
    const languageChain = [language, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE]
      .filter((lng, index, array) => resources[lng] && array.indexOf(lng) === index);

    for (const lng of languageChain) {
      const resource = resources[lng];
      const value = getNestedValue(resource, segments);
      if (value !== undefined) {
        return formatValue(value, options);
      }
    }

    return options?.defaultValue ?? key;
  }, [language]);

  const changeLanguage = useCallback<TranslationContextValue['changeLanguage']>(async nextLanguage => {
    if (!resources[nextLanguage]) {
      console.warn(`Unsupported language requested: ${nextLanguage}`);
      return;
    }
    setLanguage(nextLanguage);
  }, []);

  const contextValue = useMemo<TranslationContextValue>(() => ({
    language,
    changeLanguage,
    translate,
  }), [language, changeLanguage, translate]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

export type TranslationFunction = (key: string, options?: TranslationOptions) => string;

export const useTranslation = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }

  const { translate, language, changeLanguage } = context;

  const t = useCallback<TranslationFunction>((key, options) => translate(key, options), [translate]);

  const i18n = useMemo(() => ({
    language,
    changeLanguage,
  }), [language, changeLanguage]);

  return { t, i18n };
};

export const availableLanguages = Object.keys(resources);
