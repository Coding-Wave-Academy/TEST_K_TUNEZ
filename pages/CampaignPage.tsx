import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSongs } from '../services/mockSongsDb';
import { Song, Campaign } from '../types';

interface CampaignPageProps {
  onLaunchCampaign: (data: Campaign) => void;
  onBack: () => void;
}

const GOALS = ["More Streams", "New Followers", "Audience Engagement"];
const BUDGETS = [5000, 10000, 25000, 50000];
const DURATIONS = [3, 7, 14, 30];
const REGIONS = ["Littoral", "Centre", "West", "North West", "South West", "East", "Adamawa", "North", "Far North"];

const CampaignPage: React.FC<CampaignPageProps> = ({ onLaunchCampaign, onBack }) => {
    const [songs, setSongs] = React.useState<Song[]>([]);
    const [step, setStep] = useState(1);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [goal, setGoal] = useState(GOALS[0]);
    const [budget, setBudget] = useState(BUDGETS[0]);
    const [duration, setDuration] = useState(DURATIONS[1]);
    const [targetRegions, setTargetRegions] = useState<string[]>([REGIONS[0], REGIONS[1]]);

    React.useEffect(() => {
        const loadSongs = async () => {
            const loadedSongs = await getSongs();
            setSongs(loadedSongs);
        };
        loadSongs();
    }, []);

    React.useEffect(() => {
        if (songs.length > 0 && !selectedSong) setSelectedSong(songs[0]);
    }, [songs]);

    const toggleRegion = (region: string) => {
        setTargetRegions(prev => 
            prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
        );
    };
    
    const handleSubmit = () => {
        if (!selectedSong) {
            alert("Please select a song to promote.");
            return;
        }
        const campaignData: Campaign = {
            id: Date.now().toString(),
            songId: selectedSong.id,
            artistId: '', // Fill as needed
            name: `${selectedSong.title} Campaign`,
            goal,
            budget,
            duration,
            regions: targetRegions,
            startDate: Date.now(),
            rewardPerStream: 0, // Set as needed
            status: 'draft',
        };
        onLaunchCampaign(campaignData);
    };

    const renderStep = () => {
        switch (step) {
            case 1: // Select Song & Goal
                return (
                    <motion.div key={1} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                        <h2 className="text-xl font-bold mb-4">1. Select Song & Goal</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Which song do you want to promote?</label>
                                <select value={selectedSong?.id || ''} onChange={e => setSelectedSong(songs.find(s => s.id === e.target.value) || null)} className="w-full bg-brand-card p-3 rounded-lg border-2 border-brand-gray focus:border-brand-green focus:outline-none">
                                    {songs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">What's your primary goal?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {GOALS.map(g => <button key={g} onClick={() => setGoal(g)} className={`p-3 rounded-lg text-sm transition-colors ${goal === g ? 'bg-brand-green text-black font-bold' : 'bg-brand-card hover:bg-brand-gray'}`}>{g}</button>)}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 2: // Set Budget & Duration
                return (
                     <motion.div key={2} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                        <h2 className="text-xl font-bold mb-4">2. Set Budget & Duration</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Budget (XAF)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {BUDGETS.map(b => <button key={b} onClick={() => setBudget(b)} className={`p-3 rounded-lg text-sm transition-colors ${budget === b ? 'bg-brand-green text-black font-bold' : 'bg-brand-card hover:bg-brand-gray'}`}>{b.toLocaleString()}</button>)}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Duration (Days)</label>
                                 <div className="grid grid-cols-4 gap-2">
                                    {DURATIONS.map(d => <button key={d} onClick={() => setDuration(d)} className={`p-3 rounded-lg text-sm transition-colors ${duration === d ? 'bg-brand-green text-black font-bold' : 'bg-brand-card hover:bg-brand-gray'}`}>{d}</button>)}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 3: // Targeting
                return (
                    <motion.div key={3} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                        <h2 className="text-xl font-bold mb-4">3. Target Listeners</h2>
                         <p className="text-sm text-brand-light-gray mb-3">Select regions in Cameroon to target.</p>
                        <div className="flex flex-wrap gap-2">
                            {REGIONS.map(r => <button key={r} onClick={() => toggleRegion(r)} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${targetRegions.includes(r) ? 'bg-brand-green text-black font-bold' : 'bg-brand-card hover:bg-brand-gray'}`}>{r}</button>)}
                        </div>
                    </motion.div>
                );
             case 4: // Summary & Payment
                 return (
                     <motion.div key={4} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                         <h2 className="text-xl font-bold mb-4">4. Review & Launch</h2>
                         <div className="bg-brand-dark p-4 rounded-lg space-y-2 text-sm">
                            <p><strong>Song:</strong> {selectedSong?.title}</p>
                            <p><strong>Goal:</strong> {goal}</p>
                            <p><strong>Budget:</strong> {budget.toLocaleString()} XAF</p>
                            <p><strong>Duration:</strong> {duration} days</p>
                            <p><strong>Targets:</strong> {targetRegions.join(', ')}</p>
                         </div>
                         <p className="text-center text-xs text-brand-gray my-4">You will be prompted to pay with Nkwa Pay upon launching.</p>
                     </motion.div>
                 )
        }
    };

    return (
        <div className="p-4 min-h-screen" style={{ background: 'radial-gradient(circle at top, #1DB95430, #0A0F0D 50%)' }}>
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="mr-4 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-3xl font-bold text-white">Create Campaign</h1>
            </div>

            <div className="flex items-center justify-center space-x-2 mb-8">
                {[1,2,3,4].map(s => (
                    <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step >= s ? 'bg-brand-green w-12' : 'bg-brand-gray w-6'}`}></div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {renderStep()}
            </AnimatePresence>
            
            <div className="absolute bottom-24 left-4 right-4 flex items-center space-x-4">
                {step > 1 && <button onClick={() => setStep(s => s - 1)} className="w-full bg-brand-gray py-4 rounded-full font-bold">Back</button>}
                {step < 4 && <button onClick={() => setStep(s => s + 1)} disabled={(step === 1 && !selectedSong) || (step === 3 && targetRegions.length === 0)} className="w-full bg-brand-green text-black py-4 rounded-full font-bold disabled:bg-brand-gray">Next</button>}
                {step === 4 && <button onClick={handleSubmit} className="w-full bg-brand-green text-black py-4 rounded-full font-bold">Launch Campaign</button>}
            </div>
        </div>
    );
};

export default CampaignPage;
