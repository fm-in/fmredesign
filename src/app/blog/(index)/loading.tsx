export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fef7f9] to-[#f5d4e0]">
      <div className="max-w-4xl mx-auto px-6 pt-40 pb-16 animate-pulse">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="h-8 bg-fm-magenta-600/10 rounded-full w-56" />
        </div>

        {/* Headline */}
        <div className="flex justify-center mb-4">
          <div className="h-12 bg-fm-magenta-600/10 rounded-lg w-2/3" />
        </div>
        <div className="flex justify-center mb-10">
          <div className="h-5 bg-fm-magenta-600/10 rounded w-3/4" />
        </div>

        {/* Search bar */}
        <div className="flex justify-center mb-12">
          <div className="h-12 bg-white/60 rounded-xl w-full max-w-md" />
        </div>

        {/* Featured post card */}
        <div className="bg-white/80 rounded-3xl overflow-hidden shadow-sm mb-12">
          <div className="grid lg:grid-cols-2">
            <div className="h-64 bg-fm-magenta-600/10" />
            <div className="p-8 space-y-4">
              <div className="h-6 bg-fm-neutral-200/60 rounded-full w-24" />
              <div className="h-8 bg-fm-neutral-200/60 rounded w-full" />
              <div className="h-4 bg-fm-neutral-200/60 rounded w-full" />
              <div className="h-4 bg-fm-neutral-200/60 rounded w-5/6" />
              <div className="h-10 bg-fm-neutral-200/60 rounded-full w-40 mt-4" />
            </div>
          </div>
        </div>

        {/* Post grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="h-36 bg-fm-magenta-600/10" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-fm-neutral-200/60 rounded w-1/3" />
                <div className="h-6 bg-fm-neutral-200/60 rounded w-full" />
                <div className="h-4 bg-fm-neutral-200/60 rounded w-5/6" />
                <div className="flex gap-2 pt-2">
                  <div className="h-5 bg-fm-neutral-200/60 rounded-full w-16" />
                  <div className="h-5 bg-fm-neutral-200/60 rounded-full w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
