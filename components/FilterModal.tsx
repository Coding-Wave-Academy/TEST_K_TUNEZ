import React from 'react';
import { motion } from 'framer-motion';
import { FilterType } from '../types';

interface FilterModalProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onClose: () => void;
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All Songs', value: 'all' },
  { label: 'AI Generated', value: 'ai' },
  { label: 'Uploaded', value: 'upload' },
  { label: 'My Mixes', value: 'mixed' },
];

const FilterModal: React.FC<FilterModalProps> = ({ currentFilter, onFilterChange, onClose }) => {
  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
        <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-brand-card p-6 rounded-xl w-full max-w-sm text-white"
        >
            <h3 className="font-bold text-lg mb-4 text-center">Filter Songs</h3>
            <div className="space-y-2">
                {FILTERS.map(filter => (
                    <button
                        key={filter.value}
                        onClick={() => {
                            onFilterChange(filter.value);
                            onClose();
                        }}
                        className={`w-full p-3 rounded-lg text-left font-semibold transition-colors ${
                            currentFilter === filter.value
                                ? 'bg-brand-green text-black'
                                : 'bg-brand-dark hover:bg-brand-gray'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
        </motion.div>
    </motion.div>
  );
};

export default FilterModal;
