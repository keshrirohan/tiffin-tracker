export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl mb-4">📡</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">You&apos;re Offline</h1>
        <p className="text-gray-500 mb-6">
          Please check your internet connection and try again.
        </p>
        <p className="text-sm text-gray-400">
          Your data is safe. Once you&apos;re back online, everything will sync.
        </p>
      </div>
    </div>
  );
}
