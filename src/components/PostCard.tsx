import { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PostCardProps {
  post: {
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
  };
  userLiked: boolean;
  onLikeToggle: () => void;
  onDelete?: () => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

const PostCard = ({ post, userLiked, onLikeToggle, onDelete }: PostCardProps) => {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOwnPost = user?.id === post.user_id;

  useEffect(() => {
    if (commentsOpen) {
      fetchComments();
    }
  }, [commentsOpen]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles for each comment
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", comment.user_id)
            .single();
          
          return {
            ...comment,
            profiles: profile || { username: "Unknown", avatar_url: null },
          };
        })
      );
      
      setComments(commentsWithProfiles as any);
    } catch (error: any) {
      toast.error("Error loading comments");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      toast.success("Comment added");
    } catch (error: any) {
      toast.error("Error adding comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!user || isLiking) return;
    
    setIsLiking(true);
    try {
      if (userLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: user.id, post_id: post.id });

        if (error) throw error;
      }
      onLikeToggle();
    } catch (error: any) {
      toast.error(error.message || "Error updating like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwnPost) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post deleted");
      onDelete?.();
    } catch (error: any) {
      toast.error(error.message || "Error deleting post");
    }
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-secondary p-0.5">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              {post.profiles.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">{post.profiles.username[0].toUpperCase()}</span>
              )}
            </div>
          </div>
          <span className="font-semibold text-sm">{post.profiles.username}</span>
        </div>
        
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <img
        src={post.image_url}
        alt="Post"
        className="w-full aspect-square object-cover"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="hover:text-primary transition-colors"
            >
              <Heart
                className={`w-6 h-6 ${userLiked ? "fill-primary text-primary" : ""}`}
              />
            </button>
            <button 
              onClick={() => setCommentsOpen(true)}
              className="hover:text-primary transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
          </div>
          <button className="hover:text-primary transition-colors">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-sm">{post.likes_count} likes</p>
          {post.caption && (
            <p className="text-sm">
              <span className="font-semibold mr-2">{post.profiles.username}</span>
              {post.caption}
            </p>
          )}
          {post.comments_count > 0 && (
            <button
              onClick={() => setCommentsOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all {post.comments_count} comments
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 max-h-96">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-accent to-secondary p-0.5 flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                        {comment.profiles?.avatar_url ? (
                          <img
                            src={comment.profiles.avatar_url}
                            alt={comment.profiles.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {comment.profiles?.username?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {comment.profiles?.username || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleSubmitComment} className="flex gap-2 pt-4 border-t">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 min-h-[60px]"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newComment.trim() || isSubmitting}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostCard;
