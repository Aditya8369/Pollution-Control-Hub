import React from 'react';

export interface InfoCardItem {
  id: string | number;
  title: string;
  description: string;
  category?: string;
  objective?: string;
  impact?: string;
  url?: string;
  source?: string;
  readTime?: string;
  summary?: string;
}

export interface InfoCardGridProps {
  items: InfoCardItem[];
  className?: string;
}

export const InfoCardGrid: React.FC<InfoCardGridProps> = ({ items, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 ${className}`} data-testid="info-card-grid">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-500 dark:hover:border-sky-400 hover:shadow-lg dark:hover:shadow-sky-950/20"
          data-testid={`info-card-${item.id}`}
        >
          {item.category && (
            <span className="inline-block px-2.5 py-0.5 mb-3 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              {item.category}
            </span>
          )}
          <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2 leading-snug">
            {item.title}
          </h3>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
            {item.description}
          </p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline mt-4"
            >
              Learn More ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

export default InfoCardGrid;
