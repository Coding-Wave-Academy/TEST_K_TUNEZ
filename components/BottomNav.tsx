
import React from 'react';
import { Page } from '../types';
import { HomeIcon, CreateIcon, StatsIcon, ProfileIcon } from './icons';

interface BottomNavProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{
  page: Page;
  label: string;
  Icon: React.FC<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}> = ({ page, label, Icon, isActive, onClick }) => {
  const activeColor = 'text-brand-green';
  const inactiveColor = 'text-brand-gray hover:text-white';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ease-in-out ${isActive ? activeColor : inactiveColor}`}
    >
      <Icon className="h-6 w-6" />
      {isActive && <span className="text-xs mt-1 font-semibold">{label}</span>}
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage }) => {
  const navItems = [
    { page: Page.Home, label: 'Home', Icon: HomeIcon },
    { page: Page.Create, label: 'Create', Icon: CreateIcon },
    { page: Page.Stats, label: 'Stats', Icon: StatsIcon },
    { page: Page.Profile, label: 'Profile', Icon: ProfileIcon },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-brand-gray/20">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.page}
            page={item.page}
            label={item.label}
            Icon={item.Icon}
            isActive={activePage === item.page}
            onClick={() => setActivePage(item.page)}
          />
        ))}
      </div>
    </footer>
  );
};

export default BottomNav;
