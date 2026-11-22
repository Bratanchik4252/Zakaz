"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";

const translations = { ru, en };

const MOCK_POSTS = [
  { id: "1", title: "Как создать современный сайт за 1 день", author: "Иван Иванов", thumb: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80", views: "15K", duration: "12:45" },
  { id: "2", title: "Мой опыт разработки видеоплатформы с нуля", author: "Кодер", thumb: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80", views: "3.2K", duration: "8:20" },
  { id: "3", title: "Обзор нового MacBook Pro для монтажа", author: "TechGuru", thumb: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80", views: "45K", duration: "15:10" },
  { id: "4", title: "Топ-10 ошибок начинающего разработчика", author: "SeniorDev", thumb: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", views: "120K", duration: "22:00" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [lang, setLang] = useState<"ru" | "en">("ru");

  // Считываем язык при загрузке
  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as "ru" | "en";
    if (savedLang && (savedLang === "ru" || savedLang === "en")) {
      setLang(savedLang);
    }
  }, []);

  const t = translations[lang].feed;
  const tabs = [t.hot, t.new, t.top, t.subs];

  return (
    <>
      <Header />
      <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        {/* Фильтры */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tabName, i) => (
            <button 
              key={tabName}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === i 
                  ? "bg-indigo-600 text-white" // Убрал тень (shadow-lg shadow-indigo-500/30)
                  : "glass-button text-slate-700 dark:text-slate-300 hover:bg-white/10"
              }`}
            >
              {tabName}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MOCK_POSTS.map((post) => (
            <div key={post.id} className="group cursor-pointer flex flex-col gap-3">
              <div className="aspect-video rounded-2xl overflow-hidden relative glass">
                <img 
                  src={post.thumb} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs font-medium text-white backdrop-blur-md">
                  {post.duration}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0 mt-0.5 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                  {post.author[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base line-clamp-2 leading-snug group-hover:text-indigo-500 transition">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{post.author}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{post.views} просмотров</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}