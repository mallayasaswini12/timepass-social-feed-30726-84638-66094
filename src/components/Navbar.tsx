import { Link, useNavigate } from "react-router-dom";
import { Camera, Home, Search, PlusSquare, Heart, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${query}%`)
      .limit(10);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            TIMEPASS
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              <Home className="w-6 h-6" />
            </Link>
            <button 
              className="text-foreground hover:text-primary transition-colors"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-6 h-6" />
            </button>
            <Link to="/create" className="text-foreground hover:text-primary transition-colors">
              <PlusSquare className="w-6 h-6" />
            </Link>
            <button className="text-foreground hover:text-primary transition-colors">
              <Heart className="w-6 h-6" />
            </button>
            <Link to={`/profile/${user.id}`} className="text-foreground hover:text-primary transition-colors">
              <User className="w-6 h-6" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Search Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults.map((profile) => (
                <button
                  key={profile.id}
                  className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-lg transition-colors text-left"
                  onClick={() => {
                    navigate(`/profile/${profile.id}`);
                    setSearchOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                    {profile.username?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-medium">{profile.username}</p>
                    {profile.full_name && (
                      <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                    )}
                  </div>
                </button>
              ))}
              {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;
