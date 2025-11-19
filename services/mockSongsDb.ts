import { Song, Stream } from '../types';

let songs: Song[] = [];
let streams: { [songId: string]: Stream[] } = {};

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
  return Promise.resolve(newSong);
}

export async function deleteSong(songId: string): Promise<void> {
  songs = songs.filter(song => song.id !== songId);
  delete streams[songId];
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
  return Promise.resolve(updatedSong);
}

export async function getStreamsForSong(songId: string): Promise<Stream[]> {
  return Promise.resolve(streams[songId] || []);
}

export async function clearSongs(): Promise<void> {
  songs = [];
  streams = {};
  return Promise.resolve();
}
