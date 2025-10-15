import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

interface Post {
  id: string;
  image_url: string;
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

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchUserLikes();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
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

  const handleLikeToggle = (postId: string) => {
    setLikes((prev) => {
      const newLikes = new Set(prev);
      if (newLikes.has(postId)) {
        newLikes.delete(postId);
      } else {
        newLikes.add(postId);
      }
      return newLikes;
    });

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes_count: likes.has(postId)
                ? post.likes_count - 1
                : post.likes_count + 1,
            }
          : post
      )
    );
  };

  if (loading) {
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
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Create your first post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userLiked={likes.has(post.id)}
                onLikeToggle={() => handleLikeToggle(post.id)}
                onDelete={() => setPosts(posts.filter((p) => p.id !== post.id))}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Feed;
