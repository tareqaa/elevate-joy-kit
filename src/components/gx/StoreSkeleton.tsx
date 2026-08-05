import React from "react";

/**
 * A sleek, gaming-themed skeleton for the store's navbar and layout.
 */
export function StoreSkeleton() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#090b10] flex flex-col animate-pulse">
      {/* Navbar Skeleton */}
      <div className="h-[72px] border-b border-white/5 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="w-24 h-5 rounded-md bg-white/5 hidden sm:block" />
        </div>
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="w-full h-10 rounded-full bg-white/5" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5" />
          <div className="w-10 h-10 rounded-full bg-white/5" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-4 md:p-8 space-y-8 overflow-hidden">
        {/* Hero Section */}
        <div className="w-full h-[300px] md:h-[450px] rounded-3xl bg-white/5" />
        
        {/* Row of Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
