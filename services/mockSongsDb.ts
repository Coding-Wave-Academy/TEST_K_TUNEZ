import { Song, Stream } from '../types';

const STORAGE_KEY = 'k_tunez_songs';
const STREAMS_STORAGE_KEY = 'k_tunez_streams';

// Initialize songs from localStorage
function initializeSongs(): Song[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load songs from localStorage:', error);
    return [];
  }
}

// Initialize streams from localStorage
function initializeStreams(): { [songId: string]: Stream[] } {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STREAMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load streams from localStorage:', error);
    return {};
  }
}

let songs: Song[] = initializeSongs();
let streams: { [songId: string]: Stream[] } = initializeStreams();

// Persist songs to localStorage
function persistSongs(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    } catch (error) {
      console.error('Failed to save songs to localStorage:', error);
    }
  }
}

// Persist streams to localStorage
function persistStreams(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STREAMS_STORAGE_KEY, JSON.stringify(streams));
    } catch (error) {
      console.error('Failed to save streams to localStorage:', error);
    }
  }
}

export async function getSongs(): Promise<Song[]> {
  return Promise.resolve([...songs]);
}

export async function addSong(song: Omit<Song, 'id'>): Promise<Song> {
  const newSong: Song = {
    ...song,
    id: Date.now().toString(),
    artistId: song.artistId || '',
  };
  songs.push(newSong);
  streams[newSong.id] = [];
  persistSongs();
  persistStreams();
  return Promise.resolve(newSong);
}

export async function deleteSong(songId: string): Promise<void> {
  songs = songs.filter(song => song.id !== songId);
  delete streams[songId];
  persistSongs();
  persistStreams();
  return Promise.resolve();
}

export async function updateSong(songId: string, updates: Partial<Omit<Song, 'id'>>): Promise<Song | undefined> {
  const songIndex = songs.findIndex(song => song.id === songId);
  if (songIndex === -1) return Promise.resolve(undefined);
  
  const updatedSong: Song = {
    ...songs[songIndex],
    ...updates,
    id: songs[songIndex].id,
  };
  songs[songIndex] = updatedSong;
  persistSongs();
  return Promise.resolve(updatedSong);
}

export async function getStreamsForSong(songId: string): Promise<Stream[]> {
  return Promise.resolve(streams[songId] || []);
}

export async function clearSongs(): Promise<void> {
  songs = [];
  streams = {};
  persistSongs();
  persistStreams();
  return Promise.resolve();
}
