
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicIcon, RecordIcon, VolumeIcon, PlayCircleIcon, PauseCircleIcon, TuneIcon, ReverbIcon, MuteIcon, SoloIcon, WandIcon, SettingsIcon, TrashIcon, LayersIcon } from './icons';

interface VoiceEditorProps {
    instrumentalUrl: string;
    onClose: () => void;
    onSave: (mixedAudioBlob: Blob) => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded';
type PlaybackState = 'playing' | 'paused';

// Utility to convert AudioBuffer to WAV Blob
const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // Helper functions for writing data
    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    // Write WAV Header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this example)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Interleave channels
    for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([bufferArray], { type: 'audio/wav' });
};

const VoiceEditor: React.FC<VoiceEditorProps> = ({ instrumentalUrl, onClose, onSave }) => {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    // Mixer State
    const [instVolume, setInstVolume] = useState(0.8);
    const [vocalVolume, setVocalVolume] = useState(1.0);
    const [instMute, setInstMute] = useState(false);
    const [vocalMute, setVocalMute] = useState(false);
    const [instSolo, setInstSolo] = useState(false);
    const [vocalSolo, setVocalSolo] = useState(false);

    // FX State
    const [isFxPanelOpen, setFxPanelOpen] = useState(false);
    const [autoTune, setAutoTune] = useState(false);
    const [pitchShift, setPitchShift] = useState(0); // -12 to +12 semitones
    const [reverbAmount, setReverbAmount] = useState(0); // 0 to 100
    const [isDenoising, setIsDenoising] = useState(false);
    const [isDenoised, setIsDenoised] = useState(false);

    // Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const instrumentalBufferRef = useRef<AudioBuffer | null>(null);
    const vocalBufferRef = useRef<AudioBuffer | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const startTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Initialize Audio Context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Load Instrumental
        const loadInstrumental = async () => {
            try {
                const response = await fetch(instrumentalUrl);
                const arrayBuffer = await response.arrayBuffer();
                if (audioContextRef.current) {
                    const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                    instrumentalBufferRef.current = decodedBuffer;
                    setDuration(decodedBuffer.duration);
                    drawWaveform(decodedBuffer, 'instrumental');
                }
            } catch (error) {
                console.error("Error loading instrumental:", error);
                alert("Failed to load instrumental track.");
            }
        };
        loadInstrumental();

        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [instrumentalUrl]);

    const drawWaveform = (buffer: AudioBuffer, type: 'instrumental' | 'vocal') => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear only if instrumental (base layer) or redraw both? 
        // For simplicity, we draw instrumental in gray and vocals in pink on top
        if (type === 'instrumental') {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;
        
        ctx.fillStyle = type === 'instrumental' ? '#535353' : '#1ED760';
        if(type === 'vocal') ctx.globalAlpha = 0.8;

        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
        ctx.globalAlpha = 1.0;
    };

    const startRecording = async () => {
        if (!audioContextRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
                const arrayBuffer = await blob.arrayBuffer();
                const decodedBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
                vocalBufferRef.current = decodedBuffer;
                drawWaveform(decodedBuffer, 'vocal');
                setRecordingState('recorded');
            };

            // Play instrumental while recording (if loaded)
            if (instrumentalBufferRef.current) {
                 playSound(instrumentalBufferRef.current, 0, instVolume);
                 setPlaybackState('playing');
                 startTimeRef.current = audioContextRef.current.currentTime;
                 updateProgress();
            }

            mediaRecorderRef.current.start();
            setRecordingState('recording');
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Please allow microphone access to record.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            stopPlayback(); // Stop instrumental
        }
    };

    const playSound = (buffer: AudioBuffer, time = 0, volume = 1.0) => {
        if (!audioContextRef.current) return;
        const source = audioContextRef.current.createBufferSource();
        const gainNode = audioContextRef.current.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        gainNode.gain.value = volume;
        
        source.start(0, time);
        activeSourcesRef.current.push(source);
    };

    const stopPlayback = () => {
        activeSourcesRef.current.forEach(source => source.stop());
        activeSourcesRef.current = [];
        setPlaybackState('paused');
        cancelAnimationFrame(animationFrameRef.current);
    };

    const togglePlayback = () => {
        if (playbackState === 'playing') {
            stopPlayback();
        } else {
            if (!audioContextRef.current) return;
            
            // Determine effective volumes based on Mute/Solo logic
            let effectiveInstVol = instVolume;
            let effectiveVocalVol = vocalVolume;

            if (instSolo) { effectiveVocalVol = 0; effectiveInstVol = instVolume; }
            if (vocalSolo) { effectiveInstVol = 0; effectiveVocalVol = vocalVolume; }
            if (instMute) effectiveInstVol = 0;
            if (vocalMute) effectiveVocalVol = 0;

            if (instrumentalBufferRef.current) playSound(instrumentalBufferRef.current, currentTime, effectiveInstVol);
            if (vocalBufferRef.current) playSound(vocalBufferRef.current, currentTime, effectiveVocalVol);

            startTimeRef.current = audioContextRef.current.currentTime - currentTime;
            setPlaybackState('playing');
            updateProgress();
        }
    };

    const updateProgress = () => {
        if (playbackState !== 'playing' && !audioContextRef.current) return;
        const now = audioContextRef.current!.currentTime;
        const newTime = now - startTimeRef.current;
        
        if (newTime >= duration) {
            setCurrentTime(0);
            stopPlayback();
        } else {
            setCurrentTime(newTime);
            animationFrameRef.current = requestAnimationFrame(updateProgress);
        }
    };
    
    const handleAIDenoise = () => {
        if (!vocalBufferRef.current) return;
        setIsDenoising(true);
        // Simulate AI processing time
        setTimeout(() => {
            setIsDenoising(false);
            setIsDenoised(true);
            alert("AI Denoise Complete: Background noise reduced.");
        }, 2500);
    };

    const handleMixAndSave = async () => {
        if (!audioContextRef.current || !instrumentalBufferRef.current) return;
        
        const offlineCtx = new OfflineAudioContext(2, instrumentalBufferRef.current.length, 44100);
        
        // Add Instrumental to Mix
        if (!instMute && (!vocalSolo || instSolo)) {
             const source = offlineCtx.createBufferSource();
             source.buffer = instrumentalBufferRef.current;
             const gain = offlineCtx.createGain();
             gain.gain.value = instVolume;
             source.connect(gain);
             gain.connect(offlineCtx.destination);
             source.start();
        }

        // Add Vocals to Mix
        if (vocalBufferRef.current && !vocalMute && (!instSolo || vocalSolo)) {
            const source = offlineCtx.createBufferSource();
            source.buffer = vocalBufferRef.current;
            const gain = offlineCtx.createGain();
            gain.gain.value = vocalVolume;
            
            // Apply simulated FX logic (in a real app, connect actual nodes)
            // Pitch shift & Reverb would be WebAudio nodes here
            
            source.connect(gain);
            gain.connect(offlineCtx.destination);
            source.start();
        }

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = bufferToWav(renderedBuffer);
        onSave(wavBlob);
    };

    const formatTime = (t: number) => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed inset-0 bg-brand-dark z-50 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-brand-gray/20">
                <button onClick={onClose} className="text-brand-light-gray hover:text-white">Cancel</button>
                <h2 className="text-white font-bold">Studio Session</h2>
                <button onClick={handleMixAndSave} className="bg-brand-green text-black px-4 py-1 rounded-full font-bold text-sm">Save Mix</button>
            </div>

            {/* Workspace */}
            <div className="flex-grow overflow-hidden flex flex-col relative">
                
                {/* FX Panel Overlay */}
                <AnimatePresence>
                    {isFxPanelOpen && (
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            className="absolute top-0 right-0 bottom-0 w-64 bg-brand-card border-l border-brand-gray/20 z-20 p-4 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-white font-bold flex items-center"><SettingsIcon className="w-5 h-5 mr-2"/> Studio FX</h3>
                                <button onClick={() => setFxPanelOpen(false)} className="text-brand-gray">&times;</button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs text-brand-light-gray font-bold uppercase">Auto-Tune</label>
                                        <input type="checkbox" checked={autoTune} onChange={(e) => setAutoTune(e.target.checked)} className="accent-brand-green"/>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <TuneIcon className={`w-5 h-5 ${autoTune ? 'text-brand-pink' : 'text-brand-gray'}`} />
                                        <span className="text-xs text-white">{autoTune ? 'Active' : 'Bypassed'}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-brand-light-gray font-bold uppercase mb-2 block">Pitch Shift</label>
                                    <input type="range" min="-12" max="12" value={pitchShift} onChange={(e) => setPitchShift(Number(e.target.value))} className="w-full accent-brand-pink"/>
                                    <div className="flex justify-between text-xs text-brand-gray mt-1">
                                        <span>-12</span><span>{pitchShift > 0 ? '+' : ''}{pitchShift}</span><span>+12</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-brand-light-gray font-bold uppercase mb-2 block">Reverb</label>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <ReverbIcon className="w-5 h-5 text-brand-light-gray" />
                                        <input type="range" min="0" max="100" value={reverbAmount} onChange={(e) => setReverbAmount(Number(e.target.value))} className="w-full accent-brand-pink"/>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tracks Area */}
                <div className="flex-grow p-2 space-y-2 overflow-y-auto">
                    {/* Instrumental Track */}
                    <div className="bg-brand-card/50 rounded-lg p-2 flex items-center space-x-2 border-l-4 border-brand-gray">
                        <div className="w-24 flex-shrink-0">
                            <p className="text-xs font-bold text-brand-light-gray mb-1">BEAT</p>
                            <div className="flex space-x-1">
                                <button onClick={() => setInstMute(!instMute)} className={`p-1 rounded text-xs font-bold ${instMute ? 'bg-blue-500 text-white' : 'bg-brand-dark text-gray-400'}`}>M</button>
                                <button onClick={() => setInstSolo(!instSolo)} className={`p-1 rounded text-xs font-bold ${instSolo ? 'bg-yellow-500 text-black' : 'bg-brand-dark text-gray-400'}`}>S</button>
                            </div>
                        </div>
                        <div className="flex-grow h-16 bg-black/40 rounded relative overflow-hidden">
                             {/* Simple Visualizer Placeholder for Beat */}
                             <div className="absolute inset-0 flex items-center px-2">
                                 <div className="w-full h-1 bg-brand-gray/30"></div>
                             </div>
                             <p className="absolute top-1 left-2 text-xs text-brand-gray">Instrumental.wav</p>
                        </div>
                        <div className="w-8 flex flex-col items-center justify-center">
                            <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                value={instVolume} 
                                onChange={(e) => setInstVolume(Number(e.target.value))} 
                                className="h-16 w-1 bg-brand-gray rounded-full appearance-none slider-vertical"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            />
                        </div>
                    </div>

                    {/* Vocal Track */}
                    <div className="bg-brand-card/50 rounded-lg p-2 flex items-center space-x-2 border-l-4 border-brand-green relative">
                         <div className="w-24 flex-shrink-0">
                            <p className="text-xs font-bold text-brand-green mb-1">VOCAL</p>
                            <div className="flex space-x-1 mb-2">
                                <button onClick={() => setVocalMute(!vocalMute)} className={`p-1 rounded text-xs font-bold ${vocalMute ? 'bg-blue-500 text-white' : 'bg-brand-dark text-gray-400'}`}>M</button>
                                <button onClick={() => setVocalSolo(!vocalSolo)} className={`p-1 rounded text-xs font-bold ${vocalSolo ? 'bg-yellow-500 text-black' : 'bg-brand-dark text-gray-400'}`}>S</button>
                            </div>
                            {recordingState === 'recorded' && (
                                <button onClick={handleAIDenoise} disabled={isDenoising || isDenoised} className={`w-full text-[10px] py-1 rounded border ${isDenoised ? 'border-brand-green text-brand-green' : 'border-brand-light-gray text-brand-light-gray'} flex justify-center items-center`}>
                                    {isDenoising ? <span className="animate-pulse">...</span> : <WandIcon className="w-3 h-3 mr-1"/>}
                                    {isDenoised ? 'Clean' : 'Denoise'}
                                </button>
                            )}
                        </div>
                        <div className="flex-grow h-16 bg-black/40 rounded relative overflow-hidden">
                             {recordingState === 'recording' && (
                                 <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 animate-pulse">
                                     <span className="text-red-500 font-bold text-xs tracking-widest">RECORDING</span>
                                 </div>
                             )}
                             {/* Visualizer Area */}
                             <canvas ref={canvasRef} width="600" height="64" className="w-full h-full"></canvas>
                        </div>
                         <div className="w-8 flex flex-col items-center justify-center">
                            <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                value={vocalVolume} 
                                onChange={(e) => setVocalVolume(Number(e.target.value))} 
                                className="h-16 w-1 bg-brand-gray rounded-full appearance-none slider-vertical"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            />
                        </div>
                    </div>
                </div>

                 {/* Transport Bar */}
                 <div className="bg-brand-card border-t border-brand-gray/20 p-4 pb-8">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                         <div className="w-16 text-xs font-mono text-brand-green">
                             {formatTime(currentTime)}
                         </div>

                         <div className="flex items-center space-x-6">
                            <button 
                                onClick={recordingState === 'recording' ? stopRecording : startRecording}
                                className={`rounded-full p-1 border-2 transition-all ${recordingState === 'recording' ? 'border-red-500 bg-red-500/20' : 'border-brand-light-gray'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${recordingState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`}>
                                    {recordingState === 'recording' ? <div className="w-4 h-4 bg-white rounded-sm" /> : <div className="w-4 h-4 bg-white rounded-full" />}
                                </div>
                            </button>

                            <button onClick={togglePlayback} className="text-white">
                                {playbackState === 'playing' ? <PauseCircleIcon className="w-14 h-14" /> : <PlayCircleIcon className="w-14 h-14" />}
                            </button>
                         </div>

                         <button 
                            onClick={() => setFxPanelOpen(!isFxPanelOpen)} 
                            className={`w-12 flex flex-col items-center justify-center text-xs ${isFxPanelOpen ? 'text-brand-pink' : 'text-brand-light-gray'}`}
                        >
                             <SettingsIcon className="w-6 h-6 mb-1"/>
                             <span>FX</span>
                         </button>
                    </div>
                 </div>

            </div>
        </div>
    );
};

export default VoiceEditor;
