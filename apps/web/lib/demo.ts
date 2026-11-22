export interface DemoPost {
  id: string;
  title: { ru: string; en: string };
  category: { ru: string; en: string };
  author: string;
  gradient: string;
  image: string;
  duration: string;
  score: number;
  comments: number;
  views: number;
}

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const DEMO_POSTS: DemoPost[] = [
  {
    id: 'demo-studio',
    title: {
      ru: 'Как я собрал домашнюю студию за выходные',
      en: 'How I built a home studio in one weekend',
    },
    category: { ru: 'Музыка', en: 'Music' },
    author: 'nova',
    gradient: 'from-violet-500 to-fuchsia-600',
    image: image('photo-1511671782779-c97d3d27a1d4'),
    duration: '12:48',
    score: 1840,
    comments: 128,
    views: 45200,
  },
  {
    id: 'demo-alps',
    title: {
      ru: 'Рассвет над облаками: таймлапс из Альп',
      en: 'Sunrise above the clouds: an Alpine timelapse',
    },
    category: { ru: 'Путешествия', en: 'Travel' },
    author: 'mira',
    gradient: 'from-sky-500 to-cyan-600',
    image: image('photo-1470071459604-3b5ec3a7fe05'),
    duration: '04:21',
    score: 2610,
    comments: 214,
    views: 98000,
  },
  {
    id: 'demo-code',
    title: {
      ru: '5 привычек, которые сделали мой код чище',
      en: '5 habits that made my code cleaner',
    },
    category: { ru: 'Технологии', en: 'Tech' },
    author: 'devmax',
    gradient: 'from-indigo-500 to-blue-600',
    image: image('photo-1498050108023-c5249f4df085'),
    duration: '09:15',
    score: 1320,
    comments: 96,
    views: 31000,
  },
  {
    id: 'demo-pasta',
    title: {
      ru: 'Паста за 15 минут: ужин без лишней суеты',
      en: 'Pasta in 15 minutes: dinner without the fuss',
    },
    category: { ru: 'Еда', en: 'Food' },
    author: 'olive',
    gradient: 'from-amber-500 to-orange-600',
    image: image('photo-1551183053-bf91a1d81141'),
    duration: '07:02',
    score: 980,
    comments: 54,
    views: 22000,
  },
  {
    id: 'demo-drone',
    title: {
      ru: 'Обзор компактного дрона: стоит ли брать?',
      en: 'Reviewing the compact drone: is it worth it?',
    },
    category: { ru: 'Обзоры', en: 'Reviews' },
    author: 'flynn',
    gradient: 'from-slate-500 to-slate-700',
    image: image('photo-1502920917128-1aa500764cbd'),
    duration: '11:36',
    score: 1520,
    comments: 143,
    views: 64000,
  },
  {
    id: 'demo-city',
    title: {
      ru: 'Ночной город на плёнку: 36 кадров',
      en: 'Night city on film: 36 frames',
    },
    category: { ru: 'Фото', en: 'Photo' },
    author: 'lumen',
    gradient: 'from-rose-500 to-pink-600',
    image: image('photo-1449824913935-59a10b8d2000'),
    duration: '06:44',
    score: 2100,
    comments: 187,
    views: 87000,
  },
  {
    id: 'demo-channel',
    title: {
      ru: 'Что я узнал за год ведения канала',
      en: 'What I learned in a year of running a channel',
    },
    category: { ru: 'Креаторам', en: 'Creators' },
    author: 'sasha',
    gradient: 'from-emerald-500 to-teal-600',
    image: image('photo-1519389950473-47ba0277781c'),
    duration: '14:10',
    score: 1760,
    comments: 231,
    views: 73000,
  },
  {
    id: 'demo-forest',
    title: {
      ru: 'Лес после дождя — ASMR для сна',
      en: 'Forest after rain — ASMR for sleep',
    },
    category: { ru: 'Природа', en: 'Nature' },
    author: 'moss',
    gradient: 'from-green-500 to-emerald-700',
    image: image('photo-1441974231531-c6227db76b6e'),
    duration: '20:00',
    score: 3050,
    comments: 172,
    views: 120000,
  },
];
