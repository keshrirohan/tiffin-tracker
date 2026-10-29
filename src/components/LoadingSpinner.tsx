export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      {/* Tiffin box loader */}
      <div className="relative w-16 h-16">
        {/* Lid */}
        <div className="absolute top-0 left-0 right-0 h-5 bg-orange-500 rounded-t-2xl animate-bounce" style={{ animationDuration: "0.8s" }} />
        {/* Body */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-orange-400 rounded-b-2xl opacity-80" />
        {/* Shine */}
        <div className="absolute top-1 left-2 w-3 h-1.5 bg-white rounded-full opacity-40" />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">{message}</p>
    </div>
  );
}
