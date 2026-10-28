export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-orange-200 dark:border-orange-900 border-t-orange-500 rounded-full animate-spin" />
      <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    </div>
  );
}
