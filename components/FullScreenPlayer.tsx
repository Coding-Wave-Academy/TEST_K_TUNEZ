
import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Song } from '../types';
import { PreviousIcon, NextIcon, PlayCircleIcon, PauseCircleIcon } from './icons';

interface FullScreenPlayerProps {
    song: Song;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onClose: () => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
}

const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ song, isPlaying, onTogglePlay, onClose, currentTime, duration, onSeek }) => {
    const progressBarRef = useRef<HTMLInputElement>(null);

     const updateProgressBar = useCallback(() => {
        if (progressBarRef.current && duration) {
            const progress = (currentTime / duration) * 100;
            progressBarRef.current.style.backgroundSize = `${progress}% 100%`;
        } else if (progressBarRef.current) {
            progressBarRef.current.style.backgroundSize = `0% 100%`;
        }
    }, [currentTime, duration]);

    useEffect(() => {
        updateProgressBar();
    }, [currentTime, duration, updateProgressBar]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeek(Number(e.target.value));
    };
    
    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 bg-gradient-to-b from-brand-green to-brand-dark z-50 flex flex-col p-4 text-white"
        >
            <div className="flex-shrink-0 flex items-center justify-between">
                <button onClick={onClose}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <p className="font-bold">Now Playing</p>
                <div className="w-6"></div>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
                <motion.img 
                    layoutId={song.layoutId}
                    src={song.coverArt} 
                    alt={song.title} 
                    className="w-full max-w-xs aspect-square rounded-2xl shadow-2xl shadow-black/50 mb-8"
                />
                <h2 className="text-3xl font-extrabold">{song.title}</h2>
                <p className="text-brand-light-gray mt-1">Ribert Kandi Junior</p>
            </div>

            <div className="flex-shrink-0">
                <div className="flex items-center text-xs text-brand-light-gray">
                    <span>{formatTime(currentTime)}</span>
                    <input
                        ref={progressBarRef}
                        type="range"
                        value={currentTime}
                        step="1"
                        min="0"
                        max={duration || 0}
                        onChange={handleSeek}
                        className="w-full h-1 rounded-lg appearance-none cursor-pointer mx-2 progress-slider"
                        style={{backgroundImage: 'linear-gradient(#B91D73, #B91D73)'}}
                    />
                    <span>{formatTime(duration)}</span>
                </div>
                <div className="flex items-center justify-center space-x-6 mt-4">
                    <button className="text-brand-light-gray w-8 h-8"><PreviousIcon /></button>
                    <button onClick={onTogglePlay} className="w-20 h-20">
                        {isPlaying ? <PauseCircleIcon className="text-brand-green w-full h-full"/> : <PlayCircleIcon className="text-brand-green w-full h-full"/>}
                    </button>
                    <button className="text-brand-light-gray w-8 h-8"><NextIcon /></button>
                </div>
            </div>
        </motion.div>
    );
};

export default FullScreenPlayer;
