import React from 'react';

export default function Card({ children, className = '', title = '', subtitle = '', action = null }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            {title && <h3 className="font-bold text-slate-800 text-base md:text-lg">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
