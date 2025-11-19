export enum Page {
  Home = 'Home',
  Create = 'Create',
  Stats = 'Stats',
  Profile = 'Profile',
  Campaign = 'Campaign',
}

export type SongOrigin = 'ai' | 'upload' | 'mixed';
export type FilterType = 'all' | SongOrigin;

export type UserRole = 'artist' | 'listener';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  avatar: string;
  socials?:{
    titkok?:string;
    instagram?:string;
    x?:string;
    facebook?:string;
    youtube?:string;
  }

  // Other profile information like avatar, bio, etc. can be added here.
}

export interface Song {
  id: string;
  artistId: string; // Link to the User (artist)
  title: string;
  description: string;
  coverArt: string;
  src: string; // Instrumental source
  vocalsSrc?: string; // Optional vocals source
  origin: SongOrigin;
  layoutId?: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface Campaign {
  id: string;
  songId: string;
  artistId: string;
  name: string;
  goal: string;
  budget: number; // Total budget for the campaign
  duration: number; // in days
  regions: string[];
  startDate: number; // as a timestamp
  rewardPerStream: number; // Amount earned by a listener per stream
  status: 'active' | 'completed' | 'draft';
}

export interface Stream {
  id: string;
  songId: string;
  listenerId: string;
  campaignId?: string; // Optional: if the stream is part of a campaign
  timestamp: number;
  earned: number; // Amount earned from this stream, if part of a campaign
}
