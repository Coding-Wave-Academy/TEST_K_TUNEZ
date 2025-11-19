import React from 'react';
import { Song } from '../types';
import { MoreIcon } from './icons';

interface SongItemProps {
    song: Song;
    onPlay: (song: Song) => void;
    onOpenOptions: (song: Song) => void;
}

const SongItem: React.FC<SongItemProps> = ({ song, onPlay, onOpenOptions }) => {
    return (
        <div className="w-full flex items-center space-x-4 p-2 rounded-lg hover:bg-brand-card/50 text-left">
            <button onClick={() => onPlay(song)} className="flex items-center space-x-4 flex-grow min-w-0">
                <img src={song.coverArt} alt={song.title} className="w-14 h-14 rounded-md flex-shrink-0" />
                <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-white truncate">{song.title}</h3>
                    <p className="text-sm text-brand-light-gray truncate">{song.description}</p>
                </div>
            </button>
            <button onClick={() => onOpenOptions(song)} className="text-brand-light-gray p-2 flex-shrink-0">
                <MoreIcon className="h-6 w-6"/>
            </button>
        </div>
    );
};

export default SongItem;
