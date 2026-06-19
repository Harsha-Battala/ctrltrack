import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — CtrlTrack" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [career, setCareer] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? "");
    setCareer(profile.career_goal ?? "");
    if (profile.avatar_url) {
      if (profile.avatar_url.startsWith("http")) {
        setAvatarUrl(profile.avatar_url);
      } else {
        supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 60 * 60).then(({ data }) => {
          if (data) setAvatarUrl(data.signedUrl);
        });
      }
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name, career_goal: career,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
    if (data) setAvatarUrl(data.signedUrl);
    toast.success("Avatar updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your profile</h1>
        <p className="text-muted-foreground">A bit about you. This stays private.</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/40">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gradient-primary text-lg font-bold text-primary-foreground">
                {(name || user?.email || "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Camera className="mr-1 h-4 w-4" /> Change avatar
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, up to a few MB.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="career">Career goal</Label>
            <Textarea id="career" value={career} onChange={(e) => setCareer(e.target.value)} rows={3} placeholder="What are you working toward?" />
          </div>

          <Button onClick={save} disabled={busy} className="bg-gradient-primary shadow-elegant">
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}