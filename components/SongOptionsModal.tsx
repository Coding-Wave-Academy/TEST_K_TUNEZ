import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Song } from '../types';
import { PromoteIcon, DownloadIcon, EditIcon, DeleteIcon } from './icons';

interface SongOptionsModalProps {
  song: Song;
  onClose: () => void;
  onDelete: (songId: string) => void;
  onPromote: () => void;
}

const SongOptionsModal: React.FC<SongOptionsModalProps> = ({ song, onClose, onDelete, onPromote }) => {
    const [isConfirmingDelete, setConfirmingDelete] = useState(false);

    const handleDownload = () => {
        // This is a simplified download simulation.
        // For files from URLs, a simple link is enough. For blobs, it's more complex.
        const link = document.createElement('a');
        link.href = song.src;
        link.download = `${song.title}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    };

    const options = [
        { label: 'Promote', icon: PromoteIcon, action: onPromote },
        { label: 'Download', icon: DownloadIcon, action: handleDownload },
        { label: 'Edit', icon: EditIcon, action: () => alert('Edit functionality coming soon!') },
        { label: 'Delete', icon: DeleteIcon, action: () => setConfirmingDelete(true), color: 'text-red-500' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end"
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-brand-card/80 backdrop-blur-xl p-4 rounded-t-2xl"
            >
                <div className="w-10 h-1.5 bg-brand-gray rounded-full mx-auto mb-4"></div>
                
                <AnimatePresence mode="wait">
                    {isConfirmingDelete ? (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center p-4"
                        >
                            <h3 className="font-bold text-lg text-white">Are you sure?</h3>
                            <p className="text-brand-light-gray text-sm my-2">This action cannot be undone.</p>
                            <div className="flex items-center space-x-4 mt-6">
                                <button onClick={() => setConfirmingDelete(false)} className="w-full bg-brand-gray py-3 rounded-full font-bold">Cancel</button>
                                <button onClick={() => onDelete(song.id)} className="w-full bg-red-600 text-white py-3 rounded-full font-bold">Delete</button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="options">
                            <div className="flex items-center space-x-4 p-2 mb-2">
                                <img src={song.coverArt} alt={song.title} className="w-14 h-14 rounded-md flex-shrink-0" />
                                <div className="flex-grow min-w-0">
                                    <h3 className="font-bold text-white truncate">{song.title}</h3>
                                    <p className="text-sm text-brand-light-gray truncate">{song.description}</p>
                                </div>
                            </div>
                            <div className="border-t border-brand-gray/20 my-2"></div>
                            <div className="space-y-1">
                                {options.map(opt => (
                                    <button
                                        key={opt.label}
                                        onClick={opt.action}
                                        className={`w-full flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 text-left text-white ${opt.color || ''}`}
                                    >
                                        <opt.icon className="h-6 w-6" />
                                        <span className="font-semibold">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </motion.div>
    );
};

export default SongOptionsModal;
