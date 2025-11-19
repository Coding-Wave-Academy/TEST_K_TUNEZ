import { Song, User, Campaign, Stream } from '../types';
import { db } from './config';
import { ref, get, push, set, remove, child } from 'firebase/database';

const DEFAULT_ARTIST_ID = 'default-artist';

// Seed data used if the database is empty. This will only be written the first time
// `getSongs` is called and the `/songs` node has no data.
const initialSongs: Omit<Song, 'id'>[] = [
    { artistId: DEFAULT_ARTIST_ID, title: 'Life in the Ghetto', description: 'Describe the style of your song', coverArt: 'https://picsum.photos/seed/song1/100/100', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', origin: 'upload' },
    { artistId: DEFAULT_ARTIST_ID, title: 'Makossa Feelings', description: 'Upbeat and vibrant track', coverArt: 'https://picsum.photos/seed/song2/100/100', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', origin: 'ai' },
    { artistId: DEFAULT_ARTIST_ID, title: 'Bikutsi Night', description: 'Energetic dance rhythm', coverArt: 'https://picsum.photos/seed/song3/100/100', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', origin: 'ai' },
];

const SONGS_PATH = 'songs';

export const getSongs = async (): Promise<Song[]> => {
    try {
        const songsRef = ref(db, SONGS_PATH);
        const snapshot = await get(songsRef);

        if (!snapshot.exists()) {
            // Seed initial songs
            for (const s of initialSongs) {
                const newRef = push(songsRef);
                await set(newRef, s);
            }
            // Re-read after seeding
            const seeded = await get(songsRef);
            const val = seeded.val() || {};
            return Object.keys(val).map(key => ({ id: key, ...(val[key] as Omit<Song, 'id'>) }));
        }

        const val = snapshot.val() || {};
        return Object.keys(val).map(key => ({ id: key, ...(val[key] as Omit<Song, 'id'>) }));
    } catch (error) {
        console.error('Error fetching songs from Realtime Database:', error);
        return [];
    }
};

export const addSong = async (songData: Omit<Song, 'id'>): Promise<Song> => {
    try {
        const songsRef = ref(db, SONGS_PATH);
        const newRef = push(songsRef);
        await set(newRef, songData);
        return { id: newRef.key as string, ...songData };
    } catch (error) {
        console.error('Error adding song to Realtime Database:', error);
        throw error;
    }
};

export const deleteSong = async (songId: string): Promise<void> => {
    try {
        const songRef = child(ref(db), `${SONGS_PATH}/${songId}`);
        await remove(songRef);
    } catch (error) {
        console.error('Error deleting song from Realtime Database:', error);
        throw error;
    }
};

// ------------------------- Users -------------------------
const USERS_PATH = 'users';

const initialUsers: Omit<User, 'id'>[] = [
    { name: 'A Listener', role: 'listener', email: 'listener@example.com', avatar: 'https://i.pravatar.cc/150?u=listener' },
];

export const getUsers = async (): Promise<User[]> => {
    try {
        const usersRef = ref(db, USERS_PATH);
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            // Seed initial users
            const artistRef = child(ref(db, USERS_PATH), DEFAULT_ARTIST_ID);
            await set(artistRef, { name: 'K-Tunez Artist', role: 'artist', email: 'artist@example.com', avatar: 'https://i.pravatar.cc/150?u=artist' });

            for (const user of initialUsers) {
                const newUserRef = push(usersRef);
                await set(newUserRef, user);
            }

            // Re-read after seeding
            const seededSnapshot = await get(usersRef);
            const val = seededSnapshot.val() || {};
            return Object.keys(val).map(key => ({ id: key, ...(val[key] as Omit<User, 'id'>) }));
        }

        const val = snapshot.val() || {};
        return Object.keys(val).map(key => ({ id: key, ...(val[key] as Omit<User, 'id'>) }));
    } catch (error) {
        console.error('Error fetching users from Realtime Database:', error);
        return [];
    }
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    try {
        const usersRef = ref(db, USERS_PATH);
        const newRef = push(usersRef);
        await set(newRef, userData);
        return { id: newRef.key as string, ...userData };
    } catch (error) {
        console.error('Error adding user to Realtime Database:', error);
        throw error;
    }
};

// ------------------------- Campaigns -------------------------
const CAMPAIGNS_PATH = 'campaigns';

export const getCampaigns = async (): Promise<Campaign[]> => {
    try {
        const campaignsRef = ref(db, CAMPAIGNS_PATH);
        const snapshot = await get(campaignsRef);
        const val = snapshot.val() || {};
        return Object.keys(val).map(key => ({ id: key, ...(val[key] as Omit<Campaign, 'id'>) }));
    } catch (error) {
        console.error('Error fetching campaigns from Realtime Database:', error);
        return [];
    }
};

export const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'startDate' | 'status'> & { startDate?: number; status?: Campaign['status'] }): Promise<Campaign> => {
    try {
        const campaignsRef = ref(db, CAMPAIGNS_PATH);
        const newRef = push(campaignsRef);
        const payload: Campaign = {
            id: newRef.key as string,
            startDate: campaignData.startDate ?? Date.now(),
            status: campaignData.status ?? 'draft',
            ...campaignData,
        } as unknown as Campaign;
        // Remove id from payload before set (we'll store it under the key)
        const toSet = { ...payload } as any;
        delete toSet.id;
        await set(newRef, toSet);
        return payload;
    } catch (error) {
        console.error('Error adding campaign to Realtime Database:', error);
        throw error;
    }
};

export const updateCampaignStatus = async (campaignId: string, status: Campaign['status']): Promise<void> => {
    try {
        const campaignRef = child(ref(db), `${CAMPAIGNS_PATH}/${campaignId}`);
        await set(campaignRef, { ...(await (await get(campaignRef)).val()), status });
    } catch (error) {
        console.error('Error updating campaign status:', error);
        throw error;
    }
};

export const getCampaignById = async (campaignId: string): Promise<Campaign | null> => {
    try {
        const campaignRef = child(ref(db), `${CAMPAIGNS_PATH}/${campaignId}`);
        const snap = await get(campaignRef);
        if (!snap.exists()) return null;
        const val = snap.val();
        return { id: campaignId, ...(val as Omit<Campaign, 'id'>) };
    } catch (error) {
        console.error('Error fetching campaign by id:', error);
        return null;
    }
};

// ------------------------- Streams -------------------------
const STREAMS_PATH = 'streams';

export const recordStream = async (streamData: Omit<Stream, 'id' | 'timestamp'>): Promise<Stream> => {
    try {
        const streamsRef = ref(db, STREAMS_PATH);
        const newRef = push(streamsRef);
        const payload: Stream = {
            id: newRef.key as string,
            timestamp: Date.now(),
            ...streamData,
        } as Stream;
        const toSet = { ...payload } as any;
        delete toSet.id;
        await set(newRef, toSet);
        return payload;
    } catch (error) {
        console.error('Error recording stream in Realtime Database:', error);
        throw error;
    }
};

export const getStreamsForCampaign = async (campaignId: string): Promise<Stream[]> => {
    try {
        const streamsRef = ref(db, STREAMS_PATH);
        const snapshot = await get(streamsRef);
        const val = snapshot.val() || {};
        return Object.keys(val)
            .map(key => ({ id: key, ...(val[key] as Omit<Stream, 'id'>) }))
            .filter(s => s.campaignId === campaignId);
    } catch (error) {
        console.error('Error fetching streams for campaign:', error);
        return [];
    }
};

export const getStreamsForSong = async (songId: string): Promise<Stream[]> => {
    try {
        const streamsRef = ref(db, STREAMS_PATH);
        const snapshot = await get(streamsRef);
        const val = snapshot.val() || {};
        return Object.keys(val)
            .map(key => ({ id: key, ...(val[key] as Omit<Stream, 'id'>) }))
            .filter(s => s.songId === songId);
    } catch (error) {
        console.error('Error fetching streams for song:', error);
        return [];
    }
};

export const getStreamsForListener = async (listenerId: string): Promise<Stream[]> => {
    try {
        const streamsRef = ref(db, STREAMS_PATH);
        const snapshot = await get(streamsRef);
        const val = snapshot.val() || {};
        return Object.keys(val)
            .map(key => ({ id: key, ...(val[key] as Omit<Stream, 'id'>) }))
            .filter(s => s.listenerId === listenerId);
    } catch (error) {
        console.error('Error fetching streams for listener:', error);
        return [];
    }
};
