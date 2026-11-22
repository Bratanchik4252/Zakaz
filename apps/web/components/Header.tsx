"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Menu, Search, LogIn, X, Home, Flame, Users, Upload, Globe, Moon, Sun, Monitor, Minus, Plus, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";

const translations = { ru, en };
type Language = "ru" | "en";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [mounted, setMounted] = useState(false);
  
  const [lang, setLang] = useState<Language>("ru");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = translations[lang].menu;
  const tFeed = translations[lang].feed;

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("lang") as Language;
    if (savedLang && (savedLang === "ru" || savedLang === "en")) {
      setLang(savedLang);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    setIsLangOpen(false);
    // Перезагружаем страницу, чтобы обновить ленту (так как она на сервере)
    window.location.reload(); 
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(14, Math.min(20, fontSize + delta));
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  return (
    <>
      <header className="fixed top-0 w-full z-40 glass border-b-0 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-xl glass-button text-slate-700 dark:text-slate-300"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">
            Vid<span className="text-indigo-500">it</span>
          </span>
        </div>

        <div className="flex-1 max-w-xl px-4 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input 
              type="text" 
              placeholder={tFeed.searchPlaceholder}
              className="w-full h-10 pl-10 pr-4 rounded-full glass-button text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white placeholder-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-500/30">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{tFeed.upload}</span>
          </button>
          <button className="p-2 rounded-xl glass-button text-slate-700 dark:text-slate-300" title="Войти">
            <LogIn className="w-5 h-5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 left-0 h-full w-80 glass z-50 p-6 flex flex-col overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{t.title}</span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 glass-button rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-2 flex-1">
                <a href="#" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition text-slate-700 dark:text-slate-300 font-medium">
                  <Home className="w-5 h-5" /> {t.home}
                </a>
                <a href="#" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition text-slate-700 dark:text-slate-300 font-medium">
                  <Flame className="w-5 h-5" /> {t.popular}
                </a>
                <a href="#" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition text-slate-700 dark:text-slate-300 font-medium">
                  <Users className="w-5 h-5" /> {t.subscriptions}
                </a>
              </nav>

              <div className="pt-6 mt-6 border-t border-slate-300/30 dark:border-white/10 flex flex-col gap-6">
                
                {/* КАСТОМНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <Globe className="w-5 h-5" /> {t.language}
                  </div>
                  
                  <div className="relative" ref={langRef}>
                    <button 
                      onClick={() => setIsLangOpen(!isLangOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 glass-button rounded-lg text-sm font-medium transition w-20 justify-between"
                    >
                      {lang.toUpperCase()}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isLangOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isLangOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-36 rounded-xl glass shadow-xl overflow-hidden z-50 border border-white/20 dark:border-white/10 p-1"
                        >
                          <button 
                            onClick={() => changeLanguage("ru")}
                            className="w-full flex items-center justify-between px-2 py-2 text-sm hover:bg-white/10 rounded-lg transition text-slate-700 dark:text-slate-300"
                          >
                            <div className="flex items-center gap-2">
                               <span className="font-bold text-xs opacity-60">RU</span>
                               <span>Русский</span>
                            </div>
                            {lang === "ru" && <Check className="w-4 h-4 text-indigo-500" />}
                          </button>
                          <button 
                            onClick={() => changeLanguage("en")}
                            className="w-full flex items-center justify-between px-2 py-2 text-sm hover:bg-white/10 rounded-lg transition text-slate-700 dark:text-slate-300"
                          >
                            <div className="flex items-center gap-2">
                               <span className="font-bold text-xs opacity-60">EN</span>
                               <span>English</span>
                            </div>
                            {lang === "en" && <Check className="w-4 h-4 text-indigo-500" />}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{t.fontSize}</span>
                  <div className="flex items-center gap-2 glass-button rounded-lg p-1">
                    <button onClick={() => changeFontSize(-1)} className="p-1 hover:bg-white/20 rounded transition"><Minus className="w-4 h-4" /></button>
                    <span className="text-sm w-6 text-center font-medium">{fontSize}</span>
                    <button onClick={() => changeFontSize(1)} className="p-1 hover:bg-white/20 rounded transition"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{t.theme}</span>
                  {mounted && (
                    <div className="flex gap-1 glass-button rounded-lg p-1">
                      <button onClick={() => setTheme("light")} className={`p-2 rounded transition ${resolvedTheme === 'light' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><Sun className="w-4 h-4" /></button>
                      <button onClick={() => setTheme("dark")} className={`p-2 rounded transition ${resolvedTheme === 'dark' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><Moon className="w-4 h-4" /></button>
                      <button onClick={() => setTheme("system")} className={`p-2 rounded transition ${theme === 'system' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><Monitor className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                <button className="flex items-center justify-center gap-3 w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition shadow-lg mt-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  {t.loginGoogle}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}