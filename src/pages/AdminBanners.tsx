import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ImagePlus, Trash2, GripVertical, ShieldCheck, Link as LinkIcon } from "lucide-react";

interface Banner {
  id: string;
  created_at: string;
  image_url: string;
  title: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_banners")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar banners");
    } else {
      setBanners((data as Banner[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erro ao fazer upload da imagem");
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("banners")
      .getPublicUrl(filePath);

    const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.display_order)) + 1 : 0;

    const { error: insertError } = await supabase
      .from("system_banners")
      .insert({
        image_url: publicUrlData.publicUrl,
        title: title || null,
        link_url: linkUrl || null,
        display_order: maxOrder,
      });

    if (insertError) {
      toast.error("Erro ao salvar banner");
    } else {
      toast.success("Banner adicionado!");
      setTitle("");
      setLinkUrl("");
      fetchBanners();
    }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const toggleActive = async (banner: Banner) => {
    const { error } = await supabase
      .from("system_banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    if (error) {
      toast.error("Erro ao atualizar banner");
    } else {
      setBanners(prev =>
        prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b)
      );
    }
  };

  const deleteBanner = async (banner: Banner) => {
    // Extract file path from URL
    const urlParts = banner.image_url.split("/banners/");
    const filePath = urlParts[urlParts.length - 1];

    if (filePath) {
      await supabase.storage.from("banners").remove([filePath]);
    }

    const { error } = await supabase
      .from("system_banners")
      .delete()
      .eq("id", banner.id);

    if (error) {
      toast.error("Erro ao excluir banner");
    } else {
      toast.success("Banner excluído");
      setBanners(prev => prev.filter(b => b.id !== banner.id));
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Gerenciar Banners</h1>
      </div>

      {/* Upload area */}
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Novo Banner</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="banner-title">Título (alt text)</Label>
            <Input
              id="banner-title"
              placeholder="Descrição da imagem..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-link">Link (opcional)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="banner-link"
                placeholder="https://..."
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {uploading ? "Enviando..." : "Arraste uma imagem ou clique para selecionar"}
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Banner list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Banners ({banners.length})</h2>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4">Carregando...</p>
        ) : banners.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Nenhum banner cadastrado.</p>
        ) : (
          banners.map(banner => (
            <div
              key={banner.id}
              className="flex items-center gap-4 rounded-lg border bg-card p-3"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
              <img
                src={banner.image_url}
                alt={banner.title || "Banner"}
                className="h-16 w-28 rounded-md object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {banner.title || "Sem título"}
                </p>
                {banner.link_url && (
                  <p className="text-xs text-muted-foreground truncate">{banner.link_url}</p>
                )}
                <p className="text-xs text-muted-foreground">Ordem: {banner.display_order}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  checked={banner.is_active}
                  onCheckedChange={() => toggleActive(banner)}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir banner</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este banner? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteBanner(banner)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminBanners;
