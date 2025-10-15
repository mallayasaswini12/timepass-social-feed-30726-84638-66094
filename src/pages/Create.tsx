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
import { Upload, X, Image as ImageIcon, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Create = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [contentType, setContentType] = useState<"post" | "reel">("post");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setVideo(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideo(file);
      setImage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = contentType === "post" ? image : video;
    if (!user || !file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("posts")
        .getPublicUrl(fileName);

      const postData: any = {
        user_id: user.id,
        caption: caption || null,
        type: contentType,
      };

      if (contentType === "post") {
        postData.image_url = publicUrl;
      } else {
        postData.video_url = publicUrl;
        postData.image_url = publicUrl; // Placeholder, ideally would be a thumbnail
      }

      const { error: insertError } = await supabase
        .from("posts")
        .insert(postData);

      if (insertError) throw insertError;

      toast.success(`${contentType === "post" ? "Post" : "Reel"} created successfully!`);
      navigate(contentType === "post" ? "/" : "/reels");
    } catch (error: any) {
      toast.error(error.message || `Error creating ${contentType}`);
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
              Create New Content
            </h1>

            <Tabs value={contentType} onValueChange={(v) => setContentType(v as "post" | "reel")} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="post" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Post
                </TabsTrigger>
                <TabsTrigger value="reel" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Reel
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="media">{contentType === "post" ? "Image" : "Video"}</Label>
                {preview ? (
                  <div className="relative">
                    {contentType === "post" ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full aspect-square object-cover rounded-xl"
                      />
                    ) : (
                      <video
                        src={preview}
                        className="w-full aspect-square object-cover rounded-xl"
                        controls
                      />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImage(null);
                        setVideo(null);
                        setPreview("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="media"
                    className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload {contentType === "post" ? "image" : "video"}
                    </span>
                    <Input
                      id="media"
                      type="file"
                      accept={contentType === "post" ? "image/*" : "video/*"}
                      onChange={contentType === "post" ? handleImageChange : handleVideoChange}
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
                disabled={uploading || (!image && !video)}
              >
                {uploading ? "Creating..." : `Create ${contentType === "post" ? "Post" : "Reel"}`}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Create;
