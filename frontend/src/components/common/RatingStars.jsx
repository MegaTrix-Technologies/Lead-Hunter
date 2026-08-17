import React from 'react';
import { Star } from 'lucide-react';

const RatingStars = ({ rating = 0, reviewCount = 0, size = 'sm' }) => {
  const numRating = Number(rating) || 0;
  const numReviews = Number(reviewCount) || 0;

  return (
    <div className="inline-flex items-center gap-1.5 font-mono">
      <div className="flex items-center text-amber-400">
        <Star className={`${size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill-amber-400 text-amber-400`} />
      </div>
      <span className={`font-semibold text-white ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        {numRating.toFixed(1)}
      </span>
      <span className={`text-zinc-500 ${size === 'lg' ? 'text-xs' : 'text-[11px]'}`}>
        ({numReviews})
      </span>
    </div>
  );
};

export default RatingStars;
