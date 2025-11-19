
import React from 'react';
import { motion } from 'framer-motion';
import { Song } from '../types';
import { PreviousIcon, NextIcon, PlayCircleIcon, PauseCircleIcon } from './icons';

interface MiniPlayerProps {
    song: Song;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onClose: () => void;
    onOpenFullScreen: () => void;
    currentTime: number;
    duration: number;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ song, isPlaying, onTogglePlay, onClose, onOpenFullScreen, currentTime, duration }) => {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <motion.div 
            className="fixed bottom-[68px] left-0 right-0 p-2 z-40"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="bg-brand-card/90 backdrop-blur-md rounded-lg p-2 flex items-center space-x-3 relative overflow-hidden">
                 <div className="absolute bottom-0 left-0 h-0.5 bg-brand-pink" style={{ width: `${progress}%` }}></div>
                <div className="absolute bottom-0 h-0.5 bg-brand-gray/50" style={{ left: `${progress}%`, right: 0 }}></div>
                
                <div className="flex-grow flex items-center space-x-3 min-w-0 cursor-pointer" onClick={onOpenFullScreen}>
                    <motion.img 
                        layoutId={song.layoutId}
                        src={song.coverArt} 
                        alt={song.title} 
                        className="w-12 h-12 rounded-md flex-shrink-0" 
                    />
                    <div className="flex-grow min-w-0">
                        <p className="text-white font-bold truncate">{song.title}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 text-white flex-shrink-0">
                    <button onClick={(e) => e.stopPropagation()} className="w-6 h-6 hidden sm:block"><PreviousIcon /></button>
                    <button onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} className="w-10 h-10">
                        {isPlaying ? <PauseCircleIcon className="text-brand-green w-full h-full" /> : <PlayCircleIcon className="text-brand-green w-full h-full" />}
                    </button>
                    <button onClick={(e) => e.stopPropagation()} className="w-6 h-6 hidden sm:block"><NextIcon /></button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        className="w-8 h-8 flex items-center justify-center text-brand-light-gray hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default MiniPlayer;
