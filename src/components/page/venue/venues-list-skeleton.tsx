const VenueCard = () => (
  <div className="rounded-lg bg-white shadow">
    <div className="h-48 animate-pulse rounded-t-lg bg-gray-200" />
    <div className="space-y-4 p-4">
      <div className="h-6 animate-pulse rounded bg-gray-200" />
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-gray-200" />
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  </div>
);

const VenuesListSkeleton = () => (
  <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(5)].map((_, i) => (
        <VenueCard key={i} />
      ))}
    </div>
  </div>
);

export default VenuesListSkeleton;
