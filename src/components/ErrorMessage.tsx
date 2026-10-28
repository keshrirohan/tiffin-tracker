interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="mx-0 my-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
      <p className="text-red-700 dark:text-red-400 text-sm font-medium">⚠️ {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-red-600 dark:text-red-400 text-sm underline">
          Try again
        </button>
      )}
    </div>
  );
}
