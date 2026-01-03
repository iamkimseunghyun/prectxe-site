export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 h-8 w-56 rounded bg-gray-100" />
      <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100" />
      <div className="space-y-3">
        <div className="h-5 w-1/2 rounded bg-gray-100" />
        <div className="h-4 w-2/3 rounded bg-gray-100" />
        <div className="h-4 w-2/5 rounded bg-gray-100" />
      </div>
    </div>
  );
}
