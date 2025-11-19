import { Toaster, toast } from 'react-hot-toast';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Song, Page, FilterType } from '../types';
import { EditIcon, UploadIcon, CreateWithAIIcon, FilterIcon } from '../components/icons';
import UploadSongModal from '../components/UploadSongModal';
import VoiceEditor from '../components/VoiceEditor';
import FilterModal from '../components/FilterModal';
import SongItem from '../components/SongItem';
import { GoogleGenAI, Modality } from '@google/genai';
import { generateMusic } from '../services/kieApi';
import { generateLyrics, generateDescription } from '../services/deepseekApi';
import * as env from '../services/env';

interface CreatePageProps {
  songs: Song[];
  playSong: (song: Song) => void;
  setActivePage: (page: Page) => void;
  openOptions: (song: Song) => void;
  onSongAdded: (song: Omit<Song, 'id'>) => Promise<Song>;
  dailyCredits: number;
  onUseCredit: () => void;
}

const GENRES = ["Makossa", "Bikutsi", "Afrobeat", "Njang", "Ambas-Gida"];
type Mode = 'Instrumental' | 'Lyrics';
type CreateView = 'hub' | 'ai_creation';

const getAiClient = (): GoogleGenAI | null => {
  if (!env.GEMINI_API_KEY) {
    console.warn("Gemini API key is not configured. AI features are disabled.");
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  } catch (error) {
    console.error("Failed to initialize Gemini AI Client:", error);
    alert("Could not initialize AI features. Please check if the API key is valid.");
    return null;
  }
};

const AICreationView: React.FC<{
    onBack: () => void;
    playSong: (song: Song) => void;
    onSongAdded: (song: Omit<Song, 'id'>) => Promise<Song>;
    dailyCredits: number;
    onUseCredit: () => void;
}> = ({ onBack, playSong, onSongAdded, dailyCredits, onUseCredit }) => {
    const [mode, setMode] = useState<Mode>('Lyrics');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [style, setStyle] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSong, setGeneratedSong] = useState<Song | null>(null);
    const [isLoadingText, setIsLoadingText] = useState(false);
    const [isEditingCover, setIsEditingCover] = useState(false);
    const [coverPrompt, setCoverPrompt] = useState('');
    const [isVoiceEditorOpen, setVoiceEditorOpen] = useState(false);

    useEffect(() => {
        // Cleanup toasts when the view is left
        return () => {
            toast.dismiss();
        };
    }, []);

    const resetForm = () => {
        setGeneratedSong(null);
        setTitle('');
        setDescription('');
        setStyle('');
        setLyrics('');
    };

    const generateWithAI = useCallback(async (field: 'description' | 'lyrics') => {
        setIsLoadingText(true);
        try {
            if (field === 'lyrics') {
                const generated = await generateLyrics(description || `a Cameroonian ${mode.toLowerCase()} song`);
                setLyrics(generated);
            } else {
                 // Use DeepSeek for description generation
                 const prompt = `Generate a short, vibrant song description for a Cameroonian song titled "${title || 'Untitled'}".`;
                 const generatedDesc = await generateDescription(prompt);
                 setDescription(generatedDesc);
            }
        } catch (error) {
             console.error(`Error generating ${field}:`, error);
             alert(`Failed to generate ${field}.`);
        } finally {
             setIsLoadingText(false);
        }
    }, [title, description, mode]);
    
    const handleGenreSelect = (genre: string) => {
        // Append the selected genre to the style field for quick generation
        setStyle(prev => prev ? `${prev}, ${genre}` : genre);
    };
    
    const generateCoverArt = async (artPrompt: string) => {
        const ai = getAiClient();
        if (!ai) return 'https://picsum.photos/seed/no-api-key/512/512';
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: artPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        } catch (error) { console.error("Error generating cover art:", error); }
        return 'https://picsum.photos/seed/error/512/512';
    };

    const handleGenerateMusic = async () => {
        if (dailyCredits <= 0) {
            alert("You've reached your daily generation limit. Please upgrade or wait until tomorrow.");
            return;
        }
        setIsGenerating(true);
        setGeneratedSong(null);
        
        try {
            const promptSource = (style || description).trim();
            const prompt = promptSource ? `${title ? title + ' - ' : ''}${promptSource}` : (title || 'Untitled AI Track');
            const audioUrl = await generateMusic({ prompt });
            const coverDesc = promptSource || description || 'vibrant AI-generated track';
            const artPrompt = `Vibrant, abstract album cover for a song titled "${title}" described as "${coverDesc}". Modern Cameroonian art style.`;
            setCoverPrompt(artPrompt);
            const coverArtUrl = await generateCoverArt(artPrompt);

            const newSongData = {
                title: title || "Untitled AI Track",
                description: description,
                src: audioUrl,
                coverArt: coverArtUrl,
                origin: 'ai' as const,
            };
            
            const newSongInDb = await onSongAdded(newSongData);
            setGeneratedSong(newSongInDb);
            onUseCredit();

        } catch (error) {
             console.error("Music generation failed:", error);
             alert("Sorry, there was an error generating your music. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };
    
     const handleRegenerateCover = async () => {
         if (!generatedSong || !coverPrompt) return;
         setIsLoadingText(true);
         const newCover = await generateCoverArt(coverPrompt);
         setGeneratedSong(prev => prev ? { ...prev, coverArt: newCover } : null);
         setIsLoadingText(false);
         setIsEditingCover(false);
    };
    
    const handleSaveMixedSong = async (mixedAudioBlob: Blob) => {
        if (!generatedSong) return;
        const mixedAudioUrl = URL.createObjectURL(mixedAudioBlob);
        const newSongData = {
            ...generatedSong,
            title: `${generatedSong.title} (Mastered)`,
            src: mixedAudioUrl,
            origin: 'mixed' as const,
            description: `Remixed version of ${generatedSong.title} with vocals.`
        };
        await onSongAdded(newSongData);
        setVoiceEditorOpen(false);
        resetForm();
        alert("Masterpiece saved! Check 'My Songs' to listen to your new mix.");
    };


    return (
        <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0 bg-brand-dark z-10 overflow-y-auto"
            style={{ background: 'radial-gradient(circle at top, #B91D7330, #0A0F0D 50%)' }}
        >
            <Toaster
                position="bottom-center"
                toastOptions={{
                    duration: 5000,
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                }}
            />
            <AnimatePresence>
                {isVoiceEditorOpen && generatedSong && (
                    <VoiceEditor
                        instrumentalUrl={generatedSong.src}
                        onClose={() => setVoiceEditorOpen(false)}
                        onSave={handleSaveMixedSong}
                    />
                )}
            </AnimatePresence>
            <div className="flex items-center p-4">
                <button onClick={onBack} className="mr-4 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-bold">Create with AI</h2>
            </div>
            <div className="p-4 pb-40">
                {isGenerating && (
                    <div className="flex flex-col items-center justify-center my-8">
                        <div className="relative w-32 h-32">
                             <div className="absolute inset-0 bg-brand-pink rounded-full opacity-20 animate-ping"></div>
                             <div className="relative w-32 h-32 bg-brand-pink/30 rounded-full flex items-center justify-center">
                                <div className="w-20 h-20 bg-brand-pink rounded-full"></div>
                             </div>
                        </div>
                        <p className="mt-4 text-white font-semibold animate-pulse">Generating your masterpiece...</p>
                    </div>
                )}
                
                {!isGenerating && generatedSong && (
                     <div className="my-4 text-center">
                        <h2 className="text-2xl font-bold mb-4">Your Instrumental is Ready!</h2>
                        <div className="relative w-64 h-64 mx-auto rounded-xl shadow-lg mb-4">
                            <img src={generatedSong.coverArt} alt="Generated Cover Art" className="w-full h-full object-cover rounded-xl"/>
                            <button onClick={() => setIsEditingCover(true)} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80">
                                <EditIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        <audio controls src={generatedSong.src} className="w-full rounded-lg"></audio>
                         <div className="space-y-4 mt-6">
                             <button onClick={() => setVoiceEditorOpen(true)} className="w-full bg-brand-pink text-white py-3 rounded-full font-bold flex items-center justify-center space-x-2 shadow-lg shadow-brand-pink/30">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
                                 <span>Record Vocals & Mix</span>
                             </button>
                            <div className="flex items-center space-x-4">
                               <button onClick={resetForm} className="w-full bg-brand-gray py-3 rounded-full font-bold">Create More</button>
                               <button onClick={() => playSong(generatedSong)} className="w-full bg-brand-green text-black py-3 rounded-full font-bold">Play Song</button>
                           </div>
                        </div>
                    </div>
                )}

                {!isGenerating && !generatedSong && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Free Trials:</h3>
                            <div className="bg-brand-pink text-white font-bold rounded-full px-4 py-1">{dailyCredits}</div>
                        </div>
                        <div className="bg-brand-card p-1 rounded-full flex items-center max-w-sm mx-auto mb-8">
                            <button onClick={() => setMode('Instrumental')} className={`w-1/2 py-2 rounded-full text-sm font-bold transition-colors ${mode === 'Instrumental' ? 'bg-brand-pink text-white' : 'text-brand-light-gray'}`}>Instrumental</button>
                            <button onClick={() => setMode('Lyrics')} className={`w-1/2 py-2 rounded-full text-sm font-bold transition-colors ${mode === 'Lyrics' ? 'bg-brand-pink text-white' : 'text-brand-light-gray'}`}>Lyrics</button>
                        </div>
                        <div className="space-y-6">
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add your Song's Title" className="w-full bg-brand-card text-white placeholder-brand-light-gray p-4 rounded-lg border-2 border-transparent focus:border-brand-pink focus:outline-none"/>
                            {mode === 'Instrumental' ? (
                                <div className="bg-brand-card p-4 rounded-lg">
                                    <label className="text-white font-bold">Style of Music</label>
                                    <p className="text-sm text-brand-light-gray mt-2 mb-2">Type the musical style (e.g. Makossa, Bikutsi, Assiko,Afrobeat)</p>
                                    <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="" className="w-full bg-transparent text-white p-2 rounded-lg border-2 border-transparent focus:border-brand-pink focus:outline-none" />
                                </div>
                            ) : (
                                <>
                                    <div className="bg-brand-card p-4 rounded-lg">
                                        <label className="text-white font-bold">Song Description</label>
                                        <p className="text-sm text-brand-light-gray mb-2">Type your style and generate quality tracks</p>
                                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full bg-transparent text-white focus:outline-none resize-none"/>
                                        <div className="text-right"><button onClick={() => generateWithAI('description')} disabled={isLoadingText} className="text-brand-pink font-bold text-sm hover:text-red-400 disabled:opacity-50">Auto-generate</button></div>
                                    </div>

                                    <div className="bg-brand-card p-4 rounded-lg">
                                        <label className="text-white font-bold">Lyrics</label>
                                        <p className="text-sm text-brand-light-gray mb-2">Type your lyrics</p>
                                        <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={6} className="w-full bg-transparent text-white focus:outline-none resize-none"/>
                                        <div className="text-right"><button onClick={() => generateWithAI('lyrics')} disabled={isLoadingText} className="text-brand-pink font-bold text-sm hover:text-red-400 disabled:opacity-50">Auto-generate Lyrics</button></div>
                                    </div>

                                    <div>
                                        <label className="text-white font-bold mb-2 block">Genre</label>
                                        <div className="flex flex-wrap gap-2">{GENRES.map(genre => (
                                            <button key={genre} onClick={() => handleGenreSelect(genre)} disabled={isLoadingText} className="bg-brand-card text-white px-3 py-1 rounded-full text-sm hover:bg-brand-gray transition-colors disabled:opacity-50">{genre}</button>
                                        ))}</div>
                                        {style && (
                                            <div className="mt-3 text-sm text-brand-light-gray">Selected style: <span className="text-white font-semibold">{style}</span>
                                                <button onClick={() => setStyle('')} className="ml-3 text-xs text-brand-pink">Clear</button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {!generatedSong && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-brand-dark/80 backdrop-blur-sm border-t border-brand-gray/20">
                    <button onClick={handleGenerateMusic} disabled={isGenerating || isLoadingText || !title || dailyCredits <= 0} className="w-full bg-brand-pink text-white font-bold py-4 rounded-full text-lg disabled:bg-brand-gray disabled:cursor-not-allowed">
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            )}
            
            <AnimatePresence>
                {isEditingCover && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-brand-card p-6 rounded-xl w-full max-w-sm">
                            <h3 className="font-bold text-lg mb-4">Edit Cover Art Prompt</h3>
                            <textarea value={coverPrompt} onChange={(e) => setCoverPrompt(e.target.value)} rows={4} className="w-full bg-brand-dark text-white p-3 rounded-lg border-2 border-brand-gray focus:border-brand-pink focus:outline-none resize-none"/>
                            <div className="flex items-center space-x-4 mt-4">
                                <button onClick={() => setIsEditingCover(false)} className="w-full bg-brand-gray py-2 rounded-full font-bold">Cancel</button>
                                <button onClick={handleRegenerateCover} disabled={isLoadingText} className="w-full bg-brand-pink text-white py-2 rounded-full font-bold disabled:opacity-50">{isLoadingText ? '...' : 'Regenerate'}</button>
                            </div>
                        </motion.div>
                     </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

const CreatePage: React.FC<CreatePageProps> = ({ songs, playSong, setActivePage, openOptions, onSongAdded, dailyCredits, onUseCredit }) => {
    const [view, setView] = useState<CreateView>('hub');
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isFilterModalOpen, setFilterModalOpen] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');

    const filteredSongs = useMemo(() => {
        if (filter === 'all') return songs;
        return songs.filter(song => song.origin === filter);
    }, [songs, filter]);

    if (view === 'ai_creation') {
        return <AICreationView onBack={() => setView('hub')} playSong={playSong} onSongAdded={onSongAdded} dailyCredits={dailyCredits} onUseCredit={onUseCredit}/>;
    }

    return (
        <div className="relative min-h-screen overflow-hidden" style={{ background: 'radial-gradient(circle at top, #1DB95430, #0A0F0D 50%)' }}>
            <div className="p-4">
                <h1 className="text-4xl font-extrabold text-white my-6">Create your masterpiece</h1>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button onClick={() => setUploadModalOpen(true)} className="bg-brand-card p-4 rounded-xl flex flex-col items-start space-y-4 hover:bg-brand-card/70 transition-colors duration-200">
                        <div className="p-2 bg-brand-green rounded-full">
                            <UploadIcon className="h-6 w-6 text-brand-dark" />
                        </div>
                        <div className="text-left">
                            <h2 className="font-bold text-white">Upload Song</h2>
                            <p className="text-xs text-brand-light-gray">Publish your existing or new sound</p>
                        </div>
                    </button>
                    <button onClick={() => setView('ai_creation')} className="bg-brand-pink/20 p-4 rounded-xl flex flex-col items-start space-y-4 border border-brand-pink hover:bg-brand-pink/30">
                        <div className="p-2 bg-brand-pink rounded-full">
                            <CreateWithAIIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left">
                            <h2 className="font-bold text-white">Create with AI</h2>
                            <p className="text-xs text-brand-light-gray">Generate a new track with AI assistance</p>
                        </div>
                    </button>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">My Songs</h2>
                    <button onClick={() => setFilterModalOpen(true)} className="flex items-center space-x-2 text-brand-light-gray hover:text-white">
                        <span>Filter</span>
                        <FilterIcon className="h-5 w-5"/>
                    </button>
                </div>

                <div className="space-y-2">
                     {filteredSongs.length > 0 ? (
                        filteredSongs.map(song => 
                            <SongItem 
                                key={song.id} 
                                song={song} 
                                onPlay={playSong} 
                                onOpenOptions={openOptions}
                            />
                        )
                    ) : (
                        <p className="text-brand-gray text-center py-8">No songs match your filter. Try creating some new music!</p>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {isUploadModalOpen && <UploadSongModal onClose={() => setUploadModalOpen(false)} onSongAdded={onSongAdded} />}
            </AnimatePresence>
            <AnimatePresence>
                {isFilterModalOpen && <FilterModal currentFilter={filter} onFilterChange={setFilter} onClose={() => setFilterModalOpen(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default CreatePage;
