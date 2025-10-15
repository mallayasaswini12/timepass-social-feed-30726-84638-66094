import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Heart, MessageCircle, Bookmark, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { toast } from "sonner";

interface Reel {
  id: string;
  video_url: string;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Reels = () => {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchReels();
      fetchUserLikes();
    }
  }, [user]);

  useEffect(() => {
    // Play current video and pause others
    Object.entries(videoRefs.current).forEach(([index, video]) => {
      if (video) {
        if (parseInt(index) === currentIndex && playing) {
          video.play();
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, playing]);

  const fetchReels = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("type", "reel")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReels(data || []);
    } catch (error) {
      console.error("Error fetching reels:", error);
      toast.error("Error loading reels");
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setLikes(new Set(data?.map((like) => like.post_id) || []));
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const handleLike = async (reelId: string) => {
    if (!user) return;

    try {
      if (likes.has(reelId)) {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", reelId);

        setLikes((prev) => {
          const newLikes = new Set(prev);
          newLikes.delete(reelId);
          return newLikes;
        });

        setReels((prev) =>
          prev.map((reel) =>
            reel.id === reelId
              ? { ...reel, likes_count: reel.likes_count - 1 }
              : reel
          )
        );
      } else {
        await supabase
          .from("likes")
          .insert({ user_id: user.id, post_id: reelId });

        setLikes((prev) => new Set(prev).add(reelId));

        setReels((prev) =>
          prev.map((reel) =>
            reel.id === reelId
              ? { ...reel, likes_count: reel.likes_count + 1 }
              : reel
          )
        );
      }
    } catch (error: any) {
      toast.error("Error updating like");
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollTop;
    const windowHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / windowHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
    }
  };

  const handleDoubleTap = (reelId: string) => {
    if (!likes.has(reelId)) {
      handleLike(reelId);
    }
  };

  if (reels.length === 0) {
    return (
      <>
        <Navbar />
        <div className="h-screen pt-16 flex items-center justify-center bg-background">
          <p className="text-muted-foreground">No reels available yet.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div
        ref={containerRef}
        className="h-screen snap-y snap-mandatory overflow-y-scroll pt-16 bg-background"
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            className="h-[calc(100vh-4rem)] snap-start relative flex items-center justify-center bg-black"
          >
            <video
              ref={(el) => (videoRefs.current[index] = el)}
              src={reel.video_url}
              className="h-full w-auto max-w-full object-contain"
              loop
              muted={muted}
              playsInline
              onDoubleClick={() => handleDoubleTap(reel.id)}
            />

            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-auto">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-secondary p-0.5">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                          {reel.profiles.avatar_url ? (
                            <img
                              src={reel.profiles.avatar_url}
                              alt={reel.profiles.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-white">
                              {reel.profiles.username[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-white">
                        {reel.profiles.username}
                      </span>
                    </div>
                    {reel.caption && (
                      <p className="text-white text-sm">{reel.caption}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col items-center gap-6">
                    <button
                      onClick={() => handleLike(reel.id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <Heart
                        className={`w-7 h-7 ${
                          likes.has(reel.id)
                            ? "fill-primary text-primary"
                            : "text-white"
                        }`}
                      />
                      <span className="text-xs text-white">{reel.likes_count}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1">
                      <MessageCircle className="w-7 h-7 text-white" />
                      <span className="text-xs text-white">{reel.comments_count}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1">
                      <Bookmark className="w-7 h-7 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Top Controls */}
              <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
                <button
                  onClick={() => setMuted(!muted)}
                  className="p-2 bg-black/50 rounded-full backdrop-blur-sm"
                >
                  {muted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  onClick={() => setPlaying(!playing)}
                  className="p-2 bg-black/50 rounded-full backdrop-blur-sm"
                >
                  {playing ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

export default Reels;
