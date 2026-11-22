'use client';

interface VideoPlayerProps {
  src: string | null;
  poster: string | null;
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  if (!src) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-black shadow-2xl shadow-black/40">
      <video
        className="aspect-video w-full"
        controls
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        src={src}
      />
    </div>
  );
}
