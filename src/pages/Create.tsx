import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Upload, X } from "lucide-react";

const Create = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !image) return;

    setUploading(true);
    try {
      const fileExt = image.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("posts")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          caption: caption || null,
        });

      if (insertError) throw insertError;

      toast.success("Post created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error creating post");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 pb-8 bg-background">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-card rounded-2xl border p-8 shadow-lg">
            <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Create New Post
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImage(null);
                        setPreview("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="image"
                    className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload image
                    </span>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      required
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Textarea
                  id="caption"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary via-accent to-secondary hover:opacity-90 transition-opacity"
                disabled={uploading || !image}
              >
                {uploading ? "Creating..." : "Create Post"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Create;
