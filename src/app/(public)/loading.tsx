export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900">
        <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-4">
            <div className="h-5 w-48 bg-white/10 rounded-full" />
            <div className="h-12 w-96 bg-white/10 rounded-lg" />
            <div className="h-12 w-80 bg-white/10 rounded-lg" />
            <div className="h-5 w-64 bg-white/5 rounded" />
            <div className="flex gap-4 mt-6">
              <div className="h-11 w-36 bg-amber-600/30 rounded-lg" />
              <div className="h-11 w-36 bg-white/10 rounded-lg" />
            </div>
          </div>
          <div className="flex-1 hidden md:flex justify-center">
            <div className="w-72 h-72 rounded-full bg-white/5" />
          </div>
        </div>
      </section>

      {/* Stats skeleton */}
      <section className="bg-amber-600/80">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-10 w-20 mx-auto bg-white/20 rounded" />
              <div className="h-4 w-24 mx-auto bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Features skeleton */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12 space-y-3">
          <div className="h-8 w-64 mx-auto bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-96 mx-auto bg-gray-100 dark:bg-gray-800/50 rounded" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-800/50 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800/50 rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
