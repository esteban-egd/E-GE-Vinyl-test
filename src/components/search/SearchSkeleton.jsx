import React from 'react';

export function SearchSkeleton({ currentTheme }) {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Skeleton Artistes Carrousel */}
      <div className="space-y-3">
        <div className="h-4 w-36 rounded-md shimmer-card" />
        <div className="flex gap-4 overflow-hidden px-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0" style={{ width: '88px' }}>
              <div className="w-20 h-20 rounded-full shimmer-card border border-white/5" />
              <div className="h-3 w-16 rounded shimmer-card" />
              <div className="h-2.5 w-10 rounded shimmer-card opacity-60" />
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton Hero Card + Top 5 Titres */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Skeleton Top Result (Hero Card) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="h-4 w-32 rounded-md shimmer-card" />
          <div className="p-6 rounded-3xl bg-[#14110c] border border-white/5 space-y-4 shadow-xl">
            <div className="flex gap-4">
              <div className="w-28 h-28 rounded-2xl shimmer-card shrink-0 border border-white/5" />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-4 w-20 rounded-full shimmer-card" />
                <div className="h-5 w-3/4 rounded shimmer-card" />
                <div className="h-3.5 w-1/2 rounded shimmer-card opacity-70" />
                <div className="h-3 w-1/3 rounded shimmer-card opacity-50" />
              </div>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
              <div className="h-4 w-24 rounded shimmer-card" />
              <div className="h-8 w-20 rounded-full shimmer-card" />
            </div>
          </div>
        </div>

        {/* Skeleton Top 5 List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="h-4 w-32 rounded-md shimmer-card" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#14110c] border border-white/5">
                <div className="w-5 h-4 rounded shimmer-card opacity-40" />
                <div className="w-12 h-12 rounded-xl shimmer-card shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-4 w-3/5 rounded shimmer-card" />
                  <div className="h-3 w-2/5 rounded shimmer-card opacity-60" />
                </div>
                <div className="w-10 h-4 rounded shimmer-card opacity-40" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton Albums Grid */}
      <div className="space-y-3 pt-4 border-t border-white/5">
        <div className="h-4 w-36 rounded-md shimmer-card" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-[#14110c] border border-white/5 space-y-3">
              <div className="w-full aspect-square rounded-xl shimmer-card" />
              <div className="h-4 w-3/4 rounded shimmer-card" />
              <div className="h-3 w-1/2 rounded shimmer-card opacity-60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
