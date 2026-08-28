import React from 'react';
import { InfoCardGrid } from '../components/InfoCardGrid';
import SolutionsAwareness from '../components/SolutionsAwareness';
import { REDUCTION_TIPS, GOVERNMENT_POLICIES } from '../constants/solutionsData';

export const Homepage: React.FC = () => {
  return (
    <div className="homepage-container max-w-7xl mx-auto px-4 py-8 space-y-12" data-testid="homepage-view">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
          Pollution Control & Environmental Intelligence Hub
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
          Real-time air quality telemetry, actionable community guidelines, and interactive policy frameworks.
        </p>
      </header>

      <section aria-labelledby="solutions-heading" className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 id="solutions-heading" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Ways to Reduce Pollution
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Actionable steps individuals and communities can take to improve ambient air quality.
          </p>
        </div>
        <InfoCardGrid items={REDUCTION_TIPS} />
      </section>

      <section aria-labelledby="policies-heading" className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 id="policies-heading" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Government Policies & Directives
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            National and regional policy standards driving sustainable emission reductions.
          </p>
        </div>
        <InfoCardGrid items={GOVERNMENT_POLICIES} />
      </section>

      <SolutionsAwareness />
    </div>
  );
};

export default Homepage;
