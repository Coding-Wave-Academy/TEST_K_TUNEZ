import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartData, Campaign, Song, Stream } from '../types';
import { getSongs, getStreamsForSong } from '../firebase/firestore';
import { GEMINI_API_KEY } from '../services/env';

const mockStreams: ChartData[] = [
  { name: 'Mon', value: 2400 },
  { name: 'Tue', value: 1398 },
  { name: 'Wed', value: 9800 },
  { name: 'Thu', value: 3908 },
  { name: 'Fri', value: 4800 },
  { name: 'Sat', value: 3800 },
  { name: 'Sun', value: 4300 },
];

const mockDemographics: ChartData[] = [
  { name: 'Littoral', value: 450 },
  { name: 'Centre', value: 380 },
  { name: 'South West', value: 200 },
  { name: 'North West', value: 150 },
  { name: 'Other', value: 80 },
];
const COLORS = ['#1ED760', '#1DB954', '#158c42', '#0d5d2a', '#083b1b'];

const getAiClient = (): any | null => {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key is not configured.');
        return null;
    }
    // SDK for Gemini isn't bundled in this project. If you add the official
    // SDK, replace this stub with an actual client initializer.
    console.warn('Gemini SDK not installed — AI features disabled in the client.');
    return null;
};

interface StatsPageProps {
    campaignData: Campaign | null;
    artistId: string; // We need to know which artist's stats to show
}

const StatsPage: React.FC<StatsPageProps> = ({ campaignData, artistId }) => {
    const [insights, setInsights] = useState('');
    const [isLoadingInsights, setIsLoadingInsights] = useState(true);
    const [hasPublishedSongs, setHasPublishedSongs] = useState(false);
    const [streamData, setStreamData] = useState<ChartData[]>(mockStreams);
    const [demographicsData] = useState<ChartData[]>(mockDemographics); // No real data source for this yet

    useEffect(() => {
        const fetchData = async () => {
            // Assuming artistId is provided. In a real app, this would come from auth context.
            const allSongs = await getSongs();
            const artistSongs = allSongs.filter(song => song.artistId === artistId);

            if (artistSongs.length > 0) {
                setHasPublishedSongs(true);
                
                // Fetch streams for all songs by this artist
                const streamsPromises = artistSongs.map(song => getStreamsForSong(song.id));
                const streamsBySong = await Promise.all(streamsPromises);
                const allStreams = streamsBySong.flat();
                
                // Process streams for the chart (group by day for the last 7 days)
                const dailyStreams: { [key: string]: number } = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
                const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const today = new Date();
                const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

                allStreams.forEach(stream => {
                    const streamDate = new Date(stream.timestamp);
                    if (streamDate >= sevenDaysAgo) {
                        const dayName = dayNames[streamDate.getDay()];
                        dailyStreams[dayName]++;
                    }
                });

                const formattedStreamData = dayNames.map(name => ({ name, value: dailyStreams[name] }));
                setStreamData(formattedStreamData);
            } else {
                setHasPublishedSongs(false);
                setStreamData(mockStreams); // Fallback to mock data
            }
        };

        fetchData();
    }, [artistId]);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoadingInsights(true);
            const ai = getAiClient();

            if (!ai) {
                setInsights("Could not load AI insights. Gemini API key is not configured.");
                setIsLoadingInsights(false);
                return;
            }

            const dataSummary = {
                weeklyStreams: streamData.reduce((acc, cur) => acc + cur.value, 0),
                topRegion: demographicsData[0].name,
                streamsData: streamData,
                demographicsData: demographicsData,
                activeCampaign: campaignData,
            };

            let campaignPrompt = '';
            if (dataSummary.activeCampaign) {
                campaignPrompt = `
                An active promotion campaign for the song "${dataSummary.activeCampaign.songTitle}" is running with a goal of "${dataSummary.activeCampaign.goal}" targeting the ${dataSummary.activeCampaign.regions.join(', ')} regions.
                Please incorporate this campaign into your analysis and suggestions.
                `;
            }

            const prompt = `
                As an expert music industry analyst for a Cameroonian artist, analyze the following data focusing on performance within Cameroon and provide actionable insights.
                The response should be concise, mobile-friendly, and use markdown for formatting (bolding, lists).

                Data:
                - Total weekly streams: ${dataSummary.weeklyStreams}
                - Top listening region in Cameroon: ${dataSummary.topRegion}
                - Daily streams breakdown: ${JSON.stringify(dataSummary.streamsData)}
                - Listener demographics by region in Cameroon: ${JSON.stringify(dataSummary.demographicsData)}
                ${campaignPrompt}

                Provide:
                1.  **Summary**: A quick overview of the week's performance in Cameroon.
                2.  **Key Insights**: 2-3 bullet points on what the data means (e.g., peak days, regional audience concentration, campaign impact).
                3.  **Growth Plan**: 2-3 actionable suggestions for the artist to grow their audience within Cameroon based on this data. (e.g., target promotions in specific regions, collaborate with artists from those regions).
            `;

            try {
                const model = ai.getGenerativeModel({ model: 'gemini-pro' });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                setInsights(response.text());
            } catch (error) {
                console.error("Error fetching AI insights:", error);
                setInsights("Could not load AI insights. Please check your connection or API key.");
            } finally {
                setIsLoadingInsights(false);
            }
        };

        fetchInsights();
    }, [campaignData, streamData, demographicsData]);

    return (
        <div className="p-4 pb-24" style={{ background: 'radial-gradient(circle at top, #1DB95430, #0A0F0D 50%)' }}>
            <h1 className="text-3xl font-bold text-white my-4">Your Stats</h1>
            
            {!hasPublishedSongs && (
                <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded-xl mb-6">
                    <h2 className="font-bold text-yellow-300 mb-2">Demo Data Active</h2>
                    <p className="text-sm text-yellow-400">
                        You haven't published any songs yet. The charts below are showing sample data. Once you publish your music, your real stats will appear here.
                    </p>
                </div>
            )}

            {campaignData && (
                <div className="bg-brand-pink/20 border border-brand-pink p-4 rounded-xl mb-6">
                    <h2 className="font-bold text-white mb-2">Active Campaign</h2>
                    <p className="text-sm text-brand-light-gray">
                        Promoting "<strong className="text-white">{campaignData.songTitle}</strong>" to increase <strong className="text-white">{campaignData.goal}</strong>.
                    </p>
                </div>
            )}

            <div className="bg-brand-card p-4 rounded-xl mb-6">
                <h2 className="font-bold text-white mb-2">Weekly Streams</h2>
                <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                        <BarChart data={streamData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="#B3B3B3" fontSize={12} />
                            <YAxis stroke="#B3B3B3" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A221F', border: 'none', borderRadius: '8px' }}/>
                            <Bar dataKey="value" fill="#1ED760" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-brand-card p-4 rounded-xl mb-6">
                <h2 className="font-bold text-white mb-2">Cameroon Demographics</h2>
                <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                        <PieChart>
                             <Pie data={demographicsData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                                {demographicsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Legend formatter={(value, entry) => <span className="text-brand-light-gray text-xs">{value}</span>} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A221F', border: 'none', borderRadius: '8px' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-brand-card p-4 rounded-xl">
                <h2 className="font-bold text-white mb-2">AI Growth Coach</h2>
                {isLoadingInsights ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-brand-gray rounded w-1/4"></div>
                        <div className="h-3 bg-brand-gray rounded w-full"></div>
                        <div className="h-3 bg-brand-gray rounded w-5/6"></div>
                         <div className="h-4 bg-brand-gray rounded w-1/3 mt-4"></div>
                        <div className="h-3 bg-brand-gray rounded w-full"></div>
                        <div className="h-3 bg-brand-gray rounded w-4/6"></div>
                    </div>
                ) : (
                    <div className="prose prose-invert prose-sm text-brand-light-gray" dangerouslySetInnerHTML={{ __html: insights.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}/>
                )}
            </div>
        </div>
    );
};

export default StatsPage;