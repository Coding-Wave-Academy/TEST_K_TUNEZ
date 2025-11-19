import React from 'react';
import { getSongs } from '../services/mockSongsDb';
import { Song } from '../types';

const ProfilePage: React.FC = () => {
  const [songs, setSongs] = React.useState<Song[]>([]);

  React.useEffect(() => {
    const loadSongs = async () => {
      const loadedSongs = await getSongs();
      setSongs(loadedSongs);
    };
    loadSongs();
  }, []);

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-screen text-center">
      <img src="https://picsum.photos/seed/avatar/120/120" alt="User Avatar" className="w-32 h-32 rounded-full mb-4 border-4 border-brand-green"/>
      <h1 className="text-3xl font-bold text-white">Ribert Kandi Jr</h1>
      <p className="text-brand-light-gray">Artist</p>
      
      <div className="mt-8 w-full max-w-sm">
        <button className="w-full text-left bg-brand-card p-4 rounded-lg mb-2 hover:bg-brand-gray">Account Settings</button>
        <button className="w-full text-left bg-brand-card p-4 rounded-lg mb-2 hover:bg-brand-gray">Subscription</button>
        <button className="w-full text-left bg-brand-card p-4 rounded-lg mb-2 hover:bg-brand-gray">Help & Support</button>
        <button className="w-full text-left text-red-500 bg-brand-card p-4 rounded-lg mt-4 hover:bg-brand-gray">Log Out</button>
      </div>
      <div className="mt-10 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">My Songs</h2>
        {songs.length === 0 ? (
          <p className="text-brand-gray">No songs uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {songs.map(song => (
              <li key={song.id} className="bg-brand-card p-4 rounded-lg flex items-center space-x-4">
                <img src={song.coverArt} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 text-left">
                  <div className="font-bold text-white">{song.title}</div>
                  <div className="text-brand-light-gray text-xs">{song.description}</div>
                </div>
                <audio controls src={song.src} className="w-32" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
