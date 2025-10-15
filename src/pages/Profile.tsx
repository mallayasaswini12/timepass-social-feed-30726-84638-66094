import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Grid, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
}

interface Post {
  id: string;
  image_url: string;
  likes_count: number;
}

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchPosts();
      if (user && !isOwnProfile) {
        checkFollowStatus();
      }
    }
  }, [userId, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, image_url, likes_count, type")
        .eq("user_id", userId)
        .eq("type", "post")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        if (error) throw error;
        setIsFollowing(false);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count - 1 } : null
        );
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: userId });

        if (error) throw error;
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count + 1 } : null
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating follow status");
    }
  };

  if (loading || !profile) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 pb-8 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8 mb-12">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-accent to-secondary p-1">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold">
                      {profile.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.username}</h1>
                {!isOwnProfile && (
                  <Button
                    onClick={handleFollowToggle}
                    variant={isFollowing ? "outline" : "default"}
                    className={
                      !isFollowing
                        ? "bg-gradient-to-r from-primary via-accent to-secondary"
                        : ""
                    }
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
              </div>

              <div className="flex gap-8">
                <div className="text-center">
                  <p className="font-bold text-lg">{posts.length}</p>
                  <p className="text-sm text-muted-foreground">posts</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{profile.followers_count}</p>
                  <p className="text-sm text-muted-foreground">followers</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{profile.following_count}</p>
                  <p className="text-sm text-muted-foreground">following</p>
                </div>
              </div>

              {profile.full_name && (
                <p className="font-semibold">{profile.full_name}</p>
              )}
              {profile.bio && <p className="text-sm">{profile.bio}</p>}
            </div>
          </div>

          <div className="border-t pt-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Grid className="w-4 h-4" />
              <span className="font-semibold text-sm">POSTS</span>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square overflow-hidden rounded-md cursor-pointer group relative"
                  >
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {post.likes_count} likes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
