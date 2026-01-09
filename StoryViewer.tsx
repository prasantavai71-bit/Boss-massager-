
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Story } from '../types';
import { Icons } from '../constants';

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, onClose, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showReplies, setShowReplies] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [videoDuration, setVideoDuration] = useState(5000);
  
  const currentStory = stories[currentIndex];
  const videoRef = useRef<HTMLVideoElement>(null);
  const pressTimerRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const isMyStory = currentStory?.userId === 'me';

  // Optimized animation frame for progress bar
  const animate = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time - (pausedAtRef.current || 0);
    
    const duration = currentStory?.mediaType === 'video' ? videoDuration : 5000;
    const elapsed = time - startTimeRef.current;
    const newProgress = Math.min((elapsed / duration) * 100, 100);
    
    setProgress(newProgress);

    if (newProgress < 100) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (currentIndex < stories.length - 1) {
        handleNext();
      } else {
        onClose();
      }
    }
  }, [currentIndex, stories.length, videoDuration, currentStory]);

  const handleNext = useCallback(() => {
    cancelAnimationFrame(requestRef.current);
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
    setCurrentIndex(prev => prev + 1);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (showReplies || isPressed) {
      cancelAnimationFrame(requestRef.current);
      pausedAtRef.current = performance.now() - startTimeRef.current;
      if (videoRef.current) videoRef.current.pause();
    } else {
      startTimeRef.current = 0; // Reset for next frame to calculate correctly
      requestRef.current = requestAnimationFrame(animate);
      if (videoRef.current) videoRef.current.play().catch(() => {});
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [showReplies, isPressed, animate]);

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setVideoDuration(e.currentTarget.duration * 1000);
    setProgress(0);
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPressed(true);
    pressTimerRef.current = Date.now();
  };

  const handlePointerUp = (e: React.PointerEvent, side: 'left' | 'right') => {
    const pressDuration = Date.now() - pressTimerRef.current;
    setIsPressed(false);

    if (pressDuration < 250) {
      if (side === 'left') {
        if (currentIndex > 0) {
          cancelAnimationFrame(requestRef.current);
          startTimeRef.current = 0;
          pausedAtRef.current = 0;
          setCurrentIndex(currentIndex - 1);
          setProgress(0);
        }
      } else {
        handleNext();
      }
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 overflow-hidden select-none touch-none">
      <div className={`absolute top-4 left-4 right-4 flex gap-1.5 z-[210] transition-opacity duration-300 ${isPressed ? 'opacity-0' : 'opacity-100'}`}>
        {stories.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white will-change-transform"
              style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className={`absolute top-8 left-0 right-0 flex items-center justify-between z-[210] text-white bg-gradient-to-b from-black/60 to-transparent p-5 transition-all duration-300 ${isPressed ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center gap-3">
          <img loading="lazy" src={currentStory.userAvatar} className="w-10 h-10 rounded-full border border-white/20 shadow-lg" />
          <div>
            <h3 className="font-semibold text-[15px]">{currentStory.userName} {isMyStory && '(You)'}</h3>
            <p className="text-[11px] opacity-70">
              {new Date(currentStory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isMyStory && onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(currentStory.id); }} className="p-2 hover:bg-white/10 rounded-full text-red-400">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path></svg>
          </button>
        </div>
      </div>

      <div className="w-full h-full flex items-center justify-center relative">
        {currentStory.mediaType === 'video' ? (
          <video 
            ref={videoRef}
            src={currentStory.imageUrl} 
            autoPlay 
            playsInline
            onLoadedMetadata={handleVideoMetadata}
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        ) : (
          <img 
            loading="lazy"
            src={currentStory.imageUrl} 
            className="max-w-full max-h-full object-contain pointer-events-none"
            alt="Story content"
          />
        )}

        {!showReplies && currentStory.caption && (
          <div className={`absolute bottom-24 left-4 right-4 z-[210] flex justify-center transition-all duration-300 ${isPressed ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="bg-black/50 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-center text-[15px] max-w-[90%] shadow-2xl border border-white/10">
              {currentStory.caption}
            </div>
          </div>
        )}
      </div>

      {!showReplies && (
        <div className="absolute inset-0 flex z-[205]">
          <div 
            className="w-1/3 h-full cursor-pointer" 
            onPointerDown={handlePointerDown}
            onPointerUp={(e) => handlePointerUp(e, 'left')}
            onPointerLeave={() => setIsPressed(false)}
          />
          <div 
            className="w-2/3 h-full cursor-pointer" 
            onPointerDown={handlePointerDown}
            onPointerUp={(e) => handlePointerUp(e, 'right')}
            onPointerLeave={() => setIsPressed(false)}
          />
        </div>
      )}

      {isMyStory && (
        <div className={`absolute bottom-0 left-0 right-0 z-[220] flex flex-col items-center transition-all duration-300 ${isPressed ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <button 
            onClick={() => setShowReplies(!showReplies)}
            className="flex flex-col items-center gap-1 text-white mb-6 animate-bounce"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={showReplies ? 'rotate-180' : ''}><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"></path></svg>
            <span className="text-xs font-bold tracking-wider">{currentStory.viewCount || 0} VIEWS</span>
          </button>

          <div className={`w-full max-w-2xl bg-[#111b21] rounded-t-[40px] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden shadow-[0_-10px_50px_rgba(0,0,0,0.5)] border-t border-white/10 ${showReplies ? 'translate-y-0 h-[65vh]' : 'translate-y-full h-0'}`}>
            <div className="p-6 flex justify-between items-center border-b border-white/5 sticky top-0 bg-[#111b21] z-10">
              <h3 className="text-white font-bold text-lg">Status updates ({currentStory.viewCount})</h3>
              <button onClick={() => setShowReplies(false)} className="bg-white/5 p-2 rounded-full text-gray-400 hover:text-white"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path></svg></button>
            </div>
            <div className="overflow-y-auto h-full pb-28 px-4">
              {currentStory.replies && currentStory.replies.length > 0 ? (
                currentStory.replies.map(reply => (
                  <div key={reply.id} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-colors border-b border-white/5">
                    <img loading="lazy" src={reply.userAvatar} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-white font-semibold text-[15px]">{reply.userName}</h4>
                        <span className="text-[10px] text-gray-500 font-medium">{new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-gray-300 text-[14px] leading-relaxed">{reply.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4 opacity-40">
                  <Icons.Status />
                  <p className="italic font-medium">No replies yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
