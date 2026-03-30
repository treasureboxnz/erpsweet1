import { Star } from "lucide-react";

interface StarRatingProps {
  /**
   * The rating level as a string (e.g., "1星", "2星", "3星", "4星", "5星")
   * or legacy values ("low", "medium", "high", "vip")
   */
  level: string;
  /**
   * Size of the stars in pixels
   */
  size?: number;
  /**
   * Whether to show the text label alongside stars
   */
  showLabel?: boolean;
}

/**
 * StarRating component for displaying customer volume level as stars
 * Supports both new format ("1星", "2星", etc.) and legacy format ("low", "medium", "high", "vip")
 */
export function StarRating({ level, size = 16, showLabel = false }: StarRatingProps) {
  // Map level string to number of stars
  const getStarCount = (level: string): number => {
    if (!level) return 0;
    
    // New format: "1星", "2星", "3星", "4星", "5星"
    const starMatch = level.match(/(\d+)星/);
    if (starMatch) {
      return parseInt(starMatch[1], 10);
    }
    
    // Legacy format mapping
    const legacyMap: Record<string, number> = {
      low: 1,
      medium: 3,
      high: 4,
      vip: 5,
    };
    
    return legacyMap[level.toLowerCase()] || 0;
  };

  const starCount = getStarCount(level);

  if (starCount === 0) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${
            index < starCount
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
          size={size}
        />
      ))}
      {showLabel && <span className="ml-1 text-sm text-gray-600">{level}</span>}
    </div>
  );
}
