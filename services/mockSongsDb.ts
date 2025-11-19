import { Song } from '../types';

let songs: Song[] = [];

export function getSongs(): Song[] {
  return songs;
}

export function addSong(song: Omit<Song, 'id'>): Song {
  const newSong: Song = {
    ...song,
    id: Date.now().toString(),
    artistId: song.artistId || '',
  };
  songs.push(newSong);
  return newSong;
}

export function deleteSong(songId: string): void {
  songs = songs.filter(song => song.id !== songId);
}

export function clearSongs() {
  songs = [];
}
