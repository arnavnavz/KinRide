"use client";

interface StarRatingProps {
  rating: number | null;
  size?: "xs" | "sm" | "md";
  showValue?: boolean;
}

export function StarRating({ rating, size = "sm", showValue = true }: StarRatingProps) {
  if (rating === null || rating === undefined) {
    return <span className="text-foreground/40 text-xs">No rating</span>;
  }

  const sizes = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
  };

  return (
    <span className={`flex items-center gap-1 ${textSizes[size]}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizes[size]} ${star <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-foreground/15 fill-foreground/15"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {showValue && (
        <span className="font-medium text-foreground ml-0.5">{rating.toFixed(1)}</span>
      )}
    </span>
  );
}
