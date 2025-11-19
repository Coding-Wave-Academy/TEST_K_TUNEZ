import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Page, Song, Campaign } from './types'; // Fixed: CampaignData -> Campaign
import BottomNav from './components/BottomNav';
import MiniPlayer from './components/MiniPlayer';
import FullScreenPlayer from './components/FullScreenPlayer';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage';
import CampaignPage from './pages/CampaignPage';
import SongOptionsModal from './components/SongOptionsModal';
import { getSongs, addSong, deleteSong as deleteSongFromDb } from './services/mockSongsDb';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.Home);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreenPlayerOpen, setFullScreenPlayerOpen] = useState(false);
  const [isOptionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedSongForOptions, setSelectedSongForOptions] = useState<Song | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [dailyCredits, setDailyCredits] = useState(5);

  // Centralized Audio Engine
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const userSongs = getSongs();
    setSongs(userSongs);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handlePlaybackEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handlePlaybackEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handlePlaybackEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      isPlaying ? audioRef.current.play().catch(console.error) : audioRef.current.pause();
    }
  }, [isPlaying]);

  const handlePlaySong = useCallback((song: Song) => {
    setCurrentSong(song);
    if (audioRef.current) {
      audioRef.current.src = song.src;
      audioRef.current.load();
      setIsPlaying(true);
    }
  }, []);

  const handleTogglePlay = useCallback(() => currentSong && setIsPlaying(prev => !prev), [currentSong]);

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    setCurrentSong(null);
    setFullScreenPlayerOpen(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const handleOpenOptions = useCallback((song: Song) => {
    setSelectedSongForOptions(song);
    setOptionsModalOpen(true);
  }, []);

  const handleSongAdded = useCallback((newSongData: Omit<Song, 'id'>): Promise<Song> => {
    const newSong = addSong(newSongData);
    setSongs(prev => [newSong, ...prev]);
    return Promise.resolve(newSong);
  }, []);

  const handleDeleteSong = useCallback((songId: string) => {
    deleteSongFromDb(songId);
    setSongs(prev => prev.filter(s => s.id !== songId));
    if (currentSong?.id === songId) handleClosePlayer();
    setOptionsModalOpen(false);
  }, [currentSong, handleClosePlayer]);

  const handleUpdateSong = useCallback((updatedSong: Song) => {
    setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
    setSelectedSongForOptions(updatedSong);
    if (currentSong?.id === updatedSong.id) {
      setCurrentSong(updatedSong);
    }
  }, [currentSong]);

  const handleLaunchCampaign = useCallback((campaignData: Campaign) => {
    setActiveCampaign(campaignData);
    setActivePage(Page.Stats);
  }, []);

  const renderPage = () => {
    const commonProps = {
      playSong: handlePlaySong,
      setActivePage,
      songs,
      openOptions: handleOpenOptions,
    };
    switch (activePage) {
      case Page.Home:
        return <HomePage {...commonProps} />;
      case Page.Create:
        return <CreatePage {...commonProps} onSongAdded={handleSongAdded} dailyCredits={dailyCredits} onUseCredit={() => setDailyCredits(c => Math.max(0, c - 1))} />;
      case Page.Stats:
        return <StatsPage campaignData={activeCampaign} />;
      case Page.Profile:
        return <ProfilePage />;
      case Page.Campaign:
        return <CampaignPage songs={songs} onLaunchCampaign={handleLaunchCampaign} onBack={() => setActivePage(Page.Home)}/>;
      default:
        return <HomePage {...commonProps} />;
    }
  };

  const mainContentPadding = currentSong ? (isFullScreenPlayerOpen ? 'pb-24' : 'pb-44') : 'pb-24';

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      <div className="md:hidden">
        <div className="bg-brand-dark min-h-screen text-white font-sans">
          <main className={`transition-all duration-300 ${mainContentPadding}`}>
            {renderPage()}
          </main>
          
          <AnimatePresence>
            {currentSong && !isFullScreenPlayerOpen && (
               <MiniPlayer 
                  song={{...currentSong, layoutId: `cover-art-${currentSong.id}`}}
                  isPlaying={isPlaying} 
                  onTogglePlay={handleTogglePlay}
                  onClose={handleClosePlayer}
                  onOpenFullScreen={() => setFullScreenPlayerOpen(true)}
                  currentTime={currentTime}
                  duration={duration}
               />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isFullScreenPlayerOpen && currentSong && (
              <FullScreenPlayer
                song={{...currentSong, layoutId: `cover-art-${currentSong.id}`}}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onClose={() => setFullScreenPlayerOpen(false)}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
              {isOptionsModalOpen && selectedSongForOptions && (
                  <SongOptionsModal
                      song={selectedSongForOptions}
                      onClose={() => setOptionsModalOpen(false)}
                      onDelete={handleDeleteSong}
                      onPromote={() => {
                        setOptionsModalOpen(false);
                        setActivePage(Page.Campaign)
                      }}
                      onUpdate={handleUpdateSong}
                  />
              )}
          </AnimatePresence>

          <BottomNav activePage={activePage} setActivePage={setActivePage} />
        </div>
      </div>
      <div className="hidden md:flex flex-col items-center justify-center min-h-screen bg-brand-dark text-white p-8 text-center">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h1 className="text-3xl font-bold mb-2">Optimized for Mobile</h1>
        <p className="text-brand-light-gray max-w-md">
          For the best experience, please open this application on a mobile device. The interface is specifically designed for smaller screens.
        </p>
      </div>
    </>
  );
};

export default App;
