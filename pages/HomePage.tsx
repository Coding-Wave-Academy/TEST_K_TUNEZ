import React, { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Song, Page } from '../types';
import { BellIcon, FilterIcon } from '../components/icons';
import SongItem from '../components/SongItem';

const promoSlides = [
    {
        id: 'promo',
        title: 'PROMO POOL',
        subtitle: 'Create a Campaign',
        description: 'Promote your new songs and get quality insights from your listeners',
        bgColor: 'bg-brand-green',
        textColor: 'text-[#111827]',
        img: 'https://i.ibb.co/FLDZB6FF/woman-wearing-transparent-2.png',
    },
    {
        id: 'creator',
        title: 'SONG MAKER',
        subtitle: 'Create a Song With AI',
        description: 'Create amazing beats and lyrics for your next hit ',
        bgColor: 'bg-brand-pink',
        textColor: 'text-white',
        img: 'https://i.ibb.co/4wmZ7fyy/beautiful-afro-woman-orange-dance-black-happy-glasses-1.png',
    }
];

interface HomePageProps {
  songs: Song[];
  playSong: (song: Song) => void;
  setActivePage: (page: Page) => void;
  openOptions: (song: Song) => void;
}

const Header: React.FC = () => (
    <div className="flex justify-between items-center p-4">
        <div className="flex items-center space-x-3">
            <img src="https://picsum.photos/seed/avatar/40/40" alt="User Avatar" className="w-10 h-10 rounded-full"/>
            <div>
                <p className="text-sm text-brand-light-gray">Hello, Ribert Kandi Junior ✨</p>
                <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            </div>
        </div>
        <button className="relative text-brand-light-gray">
            <BellIcon className="h-6 w-6"/>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-brand-green ring-2 ring-brand-dark"></span>
        </button>
    </div>
);

const PromoCarousel: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % promoSlides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 50) setIndex(p => (p - 1 + promoSlides.length) % promoSlides.length);
        else if (info.offset.x < -50) setIndex(p => (p + 1) % promoSlides.length);
    };
    
    const handleClick = (slideId: string) => {
        if(slideId === 'creator') setActivePage(Page.Create);
        if(slideId === 'promo') setActivePage(Page.Campaign);
    }

    return (
        <div className="mb-8">
            <div className="relative w-full h-48 overflow-hidden">
                {promoSlides.map((slide, i) => (
                    <motion.div
                        key={slide.id}
                        className={`absolute w-full h-full p-4 rounded-2xl flex flex-col justify-between ${slide.bgColor} cursor-pointer`}
                        initial={{ x: '100%', opacity: 0, scale: 0.8 }}
                        animate={{
                            x: `${(i - index) * 100}%`,
                            opacity: i === index ? 1 : 0.5,
                            scale: i === index ? 1 : 0.8,
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleClick(slide.id)}
                    >
                        <div className="z-10">
                            <p className={`text-xs font-bold ${slide.textColor}`}>{slide.title}</p>
                            <h2 className={`text-2xl font-extrabold ${slide.textColor}`}>{slide.subtitle}</h2>
                        </div>
                        <p className={`text-xs w-2/3 z-10 ${slide.textColor}`}>{slide.description}</p>
                        <img src={slide.img} alt={slide.subtitle} className="absolute right-0 bottom-0 w-3/5 h-full object-cover" style={{ objectPosition: '0% 100%'}}/>
                    </motion.div>
                ))}
            </div>
            <div className="flex justify-center space-x-2 mt-3">
                {promoSlides.map((_, i) => (
                    <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full ${i === index ? 'bg-brand-green' : 'bg-brand-gray'}`}></button>
                ))}
            </div>
        </div>
    );
}

const HomePage: React.FC<HomePageProps> = ({ songs, playSong, setActivePage, openOptions }) => {
    return (
        <div className="min-h-screen" style={{ background: 'radial-gradient(circle at top, #1DB95430, #0A0F0D 50%)' }}>
            <Header />
            <div className="p-4">
                <PromoCarousel setActivePage={setActivePage} />
                
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">My Songs</h2>
                    <button onClick={() => setActivePage(Page.Create)} className="flex items-center space-x-2 text-brand-light-gray hover:text-white">
                        <span>Filter</span>
                        <FilterIcon className="h-5 w-5"/>
                    </button>
                </div>

                <div className="space-y-2">
                    {songs.length > 0 ? (
                        songs.map(song => 
                            <SongItem 
                                key={song.id} 
                                song={song} 
                                onPlay={playSong} 
                                onOpenOptions={openOptions} 
                            />)
                    ) : (
                        <p className="text-brand-gray text-center py-8">Your song library is empty. Go to the 'Create' page to make some music!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
