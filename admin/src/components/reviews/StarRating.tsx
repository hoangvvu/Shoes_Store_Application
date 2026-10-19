export function StarRating({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'star star--on' : 'star'}>★</span>
      ))}
    </span>
  );
}
