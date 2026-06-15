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
import { ImagePlus, Trash2, GripVertical, ShieldCheck, Link as LinkIcon, X, Monitor, Tablet, Smartphone, Pencil } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import BannerEditDialog, { type EditableBanner } from "@/components/admin/BannerEditDialog";

interface Banner {
  id: string;
  created_at: string;
  image_url: string;
  image_url_tablet: string | null;
  image_url_mobile: string | null;
  title: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

type DeviceKey = "desktop" | "tablet" | "mobile";

const DEVICE_META: Record<DeviceKey, { label: string; hint: string; icon: typeof Monitor; required: boolean }> = {
  desktop: { label: "Desktop", hint: "Recomendado: 1920 × 384 px (proporção 5:1)", icon: Monitor, required: true },
  tablet: { label: "Tablet", hint: "Recomendado: 1280 × 400 px (proporção ~3:1)", icon: Tablet, required: false },
  mobile: { label: "Celular", hint: "Recomendado: 800 × 400 px (proporção 2:1)", icon: Smartphone, required: false },
};

const DEVICE_ORDER: DeviceKey[] = ["desktop", "tablet", "mobile"];

const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<EditableBanner | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [files, setFiles] = useState<Record<DeviceKey, File | null>>({
    desktop: null,
    tablet: null,
    mobile: null,
  });
  const [previews, setPreviews] = useState<Record<DeviceKey, string | null>>({
    desktop: null,
    tablet: null,
    mobile: null,
  });

  useEffect(() => {
    const urls: string[] = [];
    const next: Record<DeviceKey, string | null> = { desktop: null, tablet: null, mobile: null };
    (Object.keys(files) as DeviceKey[]).forEach(key => {
      const file = files[key];
      if (file) {
        const url = URL.createObjectURL(file);
        urls.push(url);
        next[key] = url;
      }
    });
    setPreviews(next);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

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

  const selectFile = (device: DeviceKey, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas");
      return;
    }
    setFiles(prev => ({ ...prev, [device]: file }));
  };

  const clearFile = (device: DeviceKey) => {
    setFiles(prev => ({ ...prev, [device]: null }));
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from("banners").upload(filePath, file);
    if (error) return null;
    const { data } = supabase.storage.from("banners").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!files.desktop) {
      toast.error("Selecione a imagem de desktop (obrigatória)");
      return;
    }

    const normalizedLink = linkUrl.trim();
    if (normalizedLink && !/^https?:\/\//i.test(normalizedLink)) {
      toast.error("O link deve começar com http:// ou https://");
      return;
    }

    setUploading(true);

    const desktopUrl = await uploadFile(files.desktop);
    if (!desktopUrl) {
      toast.error("Erro ao fazer upload da imagem de desktop");
      setUploading(false);
      return;
    }

    const tabletUrl = files.tablet ? await uploadFile(files.tablet) : null;
    const mobileUrl = files.mobile ? await uploadFile(files.mobile) : null;

    const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.display_order)) + 1 : 0;

    const { error: insertError } = await supabase
      .from("system_banners")
      .insert({
        image_url: desktopUrl,
        image_url_tablet: tabletUrl,
        image_url_mobile: mobileUrl,
        title: title.trim() || null,
        link_url: normalizedLink || null,
        display_order: maxOrder,
      });

    if (insertError) {
      toast.error("Erro ao salvar banner");
    } else {
      toast.success("Banner adicionado!");
      setTitle("");
      setLinkUrl("");
      setFiles({ desktop: null, tablet: null, mobile: null });
      fetchBanners();
    }
    setUploading(false);
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
    const paths: string[] = [];
    [banner.image_url, banner.image_url_tablet, banner.image_url_mobile].forEach(url => {
      if (!url) return;
      const parts = url.split("/banners/");
      const filePath = parts[parts.length - 1];
      if (filePath) paths.push(filePath);
    });

    if (paths.length > 0) {
      await supabase.storage.from("banners").remove(paths);
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
        <SidebarTrigger className="md:hidden" />
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

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Envie uma imagem para cada dispositivo. Tablet e celular são opcionais — se não enviar,
            a imagem de desktop é usada como alternativa.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {DEVICE_ORDER.map(device => {
              const meta = DEVICE_META[device];
              const Icon = meta.icon;
              const preview = previews[device];
              const file = files[device];
              return (
                <div key={device} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {meta.label}
                    {meta.required && <span className="text-destructive">*</span>}
                  </div>
                  <div className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 transition-colors hover:border-primary/50 min-h-[120px]">
                    {preview ? (
                      <>
                        <img
                          src={preview}
                          alt={`Pré-visualização ${meta.label}`}
                          className="max-h-24 w-full rounded-md object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => clearFile(device)}
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive"
                          aria-label={`Remover imagem ${meta.label}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-7 w-7 text-muted-foreground" />
                        <p className="text-center text-xs text-muted-foreground">Selecionar imagem</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) selectFile(device, f);
                        e.target.value = "";
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">{meta.hint}</p>
                  {file && (
                    <p className="truncate text-[11px] text-muted-foreground">{file.name}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={uploading || !files.desktop}>
            {uploading ? "Salvando..." : "Adicionar banner"}
          </Button>
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
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Monitor className="h-3 w-3" /> Desktop</span>
                  {banner.image_url_tablet && <span className="inline-flex items-center gap-1"><Tablet className="h-3 w-3" /> Tablet</span>}
                  {banner.image_url_mobile && <span className="inline-flex items-center gap-1"><Smartphone className="h-3 w-3" /> Celular</span>}
                </div>
                <p className="text-xs text-muted-foreground">Ordem: {banner.display_order}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  checked={banner.is_active}
                  onCheckedChange={() => toggleActive(banner)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingBanner({
                      id: banner.id,
                      image_url: banner.image_url,
                      image_url_tablet: banner.image_url_tablet,
                      image_url_mobile: banner.image_url_mobile,
                      title: banner.title,
                      link_url: banner.link_url,
                    });
                    setEditOpen(true);
                  }}
                  aria-label="Editar banner"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
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

      <BannerEditDialog
        banner={editingBanner}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchBanners}
      />
    </div>
  );
};

export default AdminBanners;
