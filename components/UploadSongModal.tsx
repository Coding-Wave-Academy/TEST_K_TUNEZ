import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UploadIcon } from './icons';
import { Song } from '../types';

const MAX_SIZE_MB = 10;
const MAX_DURATION_SECONDS = 600; // 10 minutes
const ALLOWED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a', 'audio/amr', 'audio/webm'];

interface UploadSongModalProps {
  onClose: () => void;
  onSongAdded: (song: Omit<Song, 'id'>) => Promise<Song>;
}

type UploadStep = 'select' | 'preview' | 'uploading' | 'promoting' | 'payment' | 'complete';

const UploadSongModal: React.FC<UploadSongModalProps> = ({ onClose, onSongAdded }) => {
    const [step, setStep] = useState<UploadStep>('select');
    const [songFile, setSongFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setSongFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setTitle('');
        setDescription('');
        setUploadProgress(0);
        setError(null);
        setStep('select');
    }, [previewUrl]);

    const handleFileSelect = (file: File) => {
        setError(null);
        if (!ALLOWED_FORMATS.includes(file.type)) {
            setError(`Invalid format. Use MP3, WAV, OGG, AAC, FLAC, M4A, AMR, or WEBM.`);
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
            return;
        }

        const audio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
            if (audio.duration > MAX_DURATION_SECONDS) {
                setError(`Song too long. Max duration is ${MAX_DURATION_SECONDS / 60} minutes.`);
                URL.revokeObjectURL(objectUrl);
            } else {
                setSongFile(file);
                setPreviewUrl(objectUrl);
                setTitle(file.name.replace(/\.[^/.]+$/, ""));
                setStep('preview');
            }
        };
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleUpload = () => {
        if (!previewUrl) return;
        setStep('uploading');
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                const next = prev + 10;
                if (next >= 100) {
                    clearInterval(interval);
                    const newSong: Omit<Song, 'id'> = {
                        title,
                        description,
                        coverArt: 'https://picsum.photos/seed/uploaded/100/100', // Placeholder
                        src: previewUrl,
                        origin: 'upload' as const,
                        artistId: '', // Fill as needed
                    };
                    onSongAdded(newSong);
                    setTimeout(() => setStep('promoting'), 500);
                    return 100;
                }
                return next;
            });
        }, 300);
    };
    
    const handlePromotionChoice = (promote: boolean) => {
        if (promote) {
            setStep('payment');
        } else {
            setStep('complete');
            setTimeout(onClose, 2000);
        }
    };

    const handlePayment = () => {
        setStep('complete');
        setTimeout(onClose, 2000);
    };

    const renderContent = () => {
        switch (step) {
            case 'select': return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Upload your song</h2>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ALLOWED_FORMATS.join(',')} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center border-2 border-dashed border-brand-gray rounded-lg p-10 hover:border-brand-green transition-colors">
                        <UploadIcon className="h-12 w-12 text-brand-gray" />
                        <p className="mt-2 text-brand-light-gray">Tap to select a file</p>
                    </button>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                    <p className="text-xs text-brand-gray mt-4">Max {MAX_SIZE_MB}MB | MP3, WAV, OGG, AAC, FLAC, M4A, AMR, WEBM | Max {MAX_DURATION_SECONDS/60} mins</p>
                </div>
            );
            case 'preview': return (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Song Details</h2>
                    {previewUrl && <audio controls src={previewUrl} className="w-full rounded-lg"></audio>}
                    <div className="space-y-4 mt-4">
                         <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Song Title" className="w-full bg-brand-dark text-white p-3 rounded-lg border-2 border-brand-gray focus:border-brand-green focus:outline-none"/>
                         <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Song Description" rows={3} className="w-full bg-brand-dark text-white p-3 rounded-lg border-2 border-brand-gray focus:border-brand-green focus:outline-none resize-none"/>
                    </div>
                     <div className="flex items-center space-x-4 mt-6">
                        <button onClick={() => { resetState(); setStep('select'); }} className="w-full bg-brand-gray py-3 rounded-full font-bold">Cancel</button>
                        <button onClick={handleUpload} disabled={!title} className="w-full bg-brand-green text-black py-3 rounded-full font-bold disabled:bg-brand-gray">Upload</button>
                    </div>
                </div>
            );
            case 'uploading': return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Uploading...</h2>
                    <div className="w-full bg-brand-gray rounded-full h-2.5">
                        <div className="bg-brand-green h-2.5 rounded-full" style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                    </div>
                    <p className="mt-4 text-white text-lg font-semibold">{uploadProgress}%</p>
                </div>
            );
            case 'promoting': return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Upload Complete!</h2>
                    <p className="text-brand-light-gray mb-6">Promote your song to reach more listeners.</p>
                    <div className="flex items-center space-x-4">
                         <button onClick={() => handlePromotionChoice(false)} className="w-full bg-brand-gray py-3 rounded-full font-bold">Maybe Later</button>
                        <button onClick={() => handlePromotionChoice(true)} className="w-full bg-brand-green text-black py-3 rounded-full font-bold">Promote Now</button>
                    </div>
                </div>
            );
            case 'payment': return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Promote Your Song</h2>
                    <div className="bg-brand-dark p-6 rounded-lg my-4 text-left">
                       <p className="text-brand-light-gray">Service:</p>
                       <p className="text-white font-bold text-lg mb-4">Basic Promotion Package</p>
                       <div className="flex justify-between items-center border-t border-brand-gray pt-4">
                           <p className="text-brand-light-gray">Amount:</p>
                           <p className="text-brand-green font-extrabold text-2xl">5,000 XAF</p>
                       </div>
                    </div>
                    <p className="text-sm text-brand-gray">You will be redirected to Nkwa Pay to complete your payment.</p>
                    <button onClick={handlePayment} className="w-full bg-brand-green text-black py-3 rounded-full font-bold mt-6">Pay with Nkwa Pay</button>
                </div>
            );
            case 'complete': return (
                <div className="text-center">
                     <div className="w-16 h-16 bg-brand-green rounded-full mx-auto flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold">All Done!</h2>
                    <p className="text-brand-light-gray">Your song is now live.</p>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-brand-card w-full max-w-sm p-6 rounded-2xl relative text-white"
            >
                <button onClick={onClose} className="absolute top-3 right-3 text-brand-gray">&times;</button>
                {renderContent()}
            </motion.div>
        </div>
    );
};

export default UploadSongModal;