import React from 'react';
import Markdown from 'react-markdown';

interface FormattedAiResponseProps {
  content: string;
}

export const FormattedAiResponse: React.FC<FormattedAiResponseProps> = ({ content }) => {
  return (
    <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-[14px]">
      <Markdown
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900 text-indigo-950">{children}</strong>,
          ul: ({ children }) => <ul className="my-2.5 space-y-1.5 pl-0 list-none">{children}</ul>,
          ol: ({ children }) => <ol className="my-2.5 space-y-1.5 pl-5 list-decimal marker:text-indigo-600 marker:font-semibold">{children}</ol>,
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-slate-700 bg-white/80 border border-slate-200/70 rounded-lg px-3 py-1.5 transition-colors shadow-2xs">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 shrink-0 mt-0.5 text-xs font-bold">
                •
              </span>
              <span className="flex-1 min-w-0">{children}</span>
            </li>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 mt-3 mb-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-1 pb-1 border-b border-slate-100">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold text-slate-900 mt-2 mb-1">{children}</h3>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 shadow-2xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-100/80 text-slate-700 font-semibold">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-slate-700 border-t border-slate-100">{children}</td>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 rounded text-xs font-mono font-medium">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 pl-3 py-1 my-2 text-slate-600 italic bg-indigo-50/40 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
