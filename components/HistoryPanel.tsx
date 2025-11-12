import React, { useState } from 'react';

interface GenerationHistory {
  id: string;
  timestamp: number;
  mode: 'simple' | 'complex';
  images: string[];
  prompt?: string;
}

interface HistoryPanelProps {
  history: GenerationHistory[];
  onClearHistory: () => void;
  onDeleteEntry: (id: string) => void;
  onImageClick: (imageUrl: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onClearHistory,
  onDeleteEntry,
  onImageClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (history.length === 0) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105"
        aria-label="Toggle history panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">History ({history.length})</span>
      </button>

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Generation History</h2>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-md transition-colors"
                aria-label="Clear all history"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              aria-label="Close history panel"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="overflow-y-auto h-[calc(100%-73px)] p-4 space-y-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded">
                      {entry.mode}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(entry.timestamp)}</span>
                  </div>
                  {entry.prompt && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{entry.prompt}</p>
                  )}
                </div>
                <button
                  onClick={() => onDeleteEntry(entry.id)}
                  className="ml-2 p-1 hover:bg-red-500/20 rounded transition-colors"
                  aria-label="Delete this entry"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Image Thumbnails */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                {entry.images.map((image, idx) => (
                  <button
                    key={idx}
                    onClick={() => onImageClick(`data:image/png;base64,${image}`)}
                    className="aspect-square bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-500 transition-all"
                  >
                    <img
                      src={`data:image/png;base64,${image}`}
                      alt={`Generated ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};
