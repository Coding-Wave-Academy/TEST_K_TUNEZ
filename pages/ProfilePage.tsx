
import React from 'react';

const ProfilePage: React.FC = () => {
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
    </div>
  );
};

export default ProfilePage;
