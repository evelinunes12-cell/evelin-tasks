import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Loader2, 
  Upload, 
  RotateCcw, 
  User, 
  Palette, 
  Heart, 
  Copy, 
  Check, 
  Coffee, 
  Rocket,
  KeyRound,
  Sun,
  Moon,
  Monitor,
  FileCheck,
  FileX,
  CalendarIcon,
  Link2,
  Sparkles,
  Bell,
} from "lucide-react";
import { logError } from "@/lib/logger";
import { profileSchema, passwordSchema } from "@/lib/validation";
import { readFile } from "@/lib/cropImage";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";
import { TermsOfUseDialog } from "@/components/TermsOfUseDialog";
import { CitySearchInput } from "@/components/CitySearchInput";
import { formatPhoneBR } from "@/lib/phoneMask";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import qrCodePix from "@/assets/qrcode-pix.jpeg";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AchievementsList } from "@/components/AchievementsList";
import { EDUCATION_LEVELS } from "@/lib/constants";
import { lovable } from "@/integrations/lovable/index";
import { UsernameInput } from "@/components/UsernameInput";
import { USERNAME_REGEX, formatUsername } from "@/lib/username";
import PushNotificationToggle from "@/components/PushNotificationToggle";

interface ProfileData {
  full_name: string;
  avatar_url: string | null;
  birth_date: string | null;
  city: string | null;
  phone: string | null;
  education_level: string | null;
  terms_accepted: boolean | null;
  username: string;
  last_username_update: string | null;
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    avatar_url: null,
    birth_date: null,
    city: null,
    phone: null,
    education_level: null,
    terms_accepted: null,
    username: "",
    last_username_update: null,
  });
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [copied, setCopied] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const profileDataRef = useRef<string>("");
  
  // Image cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Pix data
  const pixKey = "00020126500014br.gov.bcb.pix0111031539872890213Ajude o Zenit52040000530398654045.005802BR5925EVELIN CRISTINE DE OLIVEI6006MACAPA62580520SAN2026010812431328150300017br.gov.bcb.brcode01051.0.063045C5E";
  const beneficiaryName = "Evelin Cristine de Oliveira Nunes";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, birth_date, city, phone, education_level, terms_accepted, username, last_username_update")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      if (data) {
        profileDataRef.current = data.username || "";
        setProfile({
          full_name: data.full_name || "",
          avatar_url: data.avatar_url,
          birth_date: data.birth_date,
          city: data.city,
          phone: data.phone ? formatPhoneBR(data.phone) : null,
          education_level: data.education_level,
          terms_accepted: data.terms_accepted,
          username: data.username || "",
          last_username_update: data.last_username_update,
        });
      }
    } catch (error) {
      logError("Error fetching profile", error);
      toast.error("Erro ao carregar perfil");
    }
  };

  const usernameCooldownEnd = profile.last_username_update
    ? addDays(new Date(profile.last_username_update), 14)
    : null;
  const isUsernameInCooldown = usernameCooldownEnd ? usernameCooldownEnd > new Date() : false;
  const remainingCooldownDays = usernameCooldownEnd
    ? Math.max(0, Math.ceil((usernameCooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = profileSchema.safeParse({ full_name: profile.full_name });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    
    if (!USERNAME_REGEX.test(profile.username)) {
      toast.error("Username inválido");
      return;
    }

    const usernameChanged = profile.username !== profileDataRef.current;
    if (usernameChanged && usernameAvailable !== true) {
      toast.error("Esse username já está em uso");
      return;
    }

    setLoading(true);

    try {
      const updates: any = { 
          full_name: validation.data.full_name,
          birth_date: profile.birth_date,
          city: profile.city,
          phone: profile.phone?.replace(/\D/g, "") || null,
          education_level: profile.education_level,
          username: profile.username,
        };

      if (usernameChanged) {
        if (isUsernameInCooldown) {
          toast.error(`Você poderá alterar o username em ${remainingCooldownDays} dia(s).`);
          setLoading(false);
          return;
        }
        updates.last_username_update = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user?.id);

      if (error) throw error;
      profileDataRef.current = profile.username;
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      logError("Error updating profile", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ terms_accepted: true })
        .eq("id", user?.id);

      if (error) throw error;
      setProfile({ ...profile, terms_accepted: true });
      toast.success("Termos de uso aceitos com sucesso!");
    } catch (error) {
      logError("Error accepting terms", error);
      toast.error("Erro ao aceitar os termos");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    const validation = passwordSchema.safeParse(passwords.newPassword);
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Senha inválida");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      logError("Error updating password", error);
      toast.error("Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    try {
      const imageDataUrl = await readFile(file);
      setSelectedImage(imageDataUrl);
      setCropperOpen(true);
    } catch (error) {
      logError("Error reading file", error);
      toast.error("Erro ao carregar a imagem");
    }
  };

  const handleCroppedImageUpload = useCallback(async (croppedBlob: Blob) => {
    if (!user?.id) return;

    setUploading(true);

    try {
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
        }
      }

      const fileName = `${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      setCropperOpen(false);
      setSelectedImage(null);
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      logError("Error uploading avatar", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploading(false);
    }
  }, [user?.id, profile]);

  const handleCropperClose = useCallback((open: boolean) => {
    if (!open) {
      setCropperOpen(false);
      setSelectedImage(null);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, phone: formatPhoneBR(e.target.value) });
  };

  const getInitials = () => {
    if (!profile.full_name) return user?.email?.substring(0, 2).toUpperCase() || "U";
    return profile.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Chave Pix copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getEducationLevelLabel = (value: string | null) => {
    if (!value) return null;
    return EDUCATION_LEVELS.find(l => l.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 flex-1">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie sua conta e preferências do Zenit.
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> <span className="hidden sm:inline">Alertas</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2">
              <Link2 className="h-4 w-4" /> <span className="hidden sm:inline">Contas</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" /> <span className="hidden sm:inline">Aparência</span>
            </TabsTrigger>
            <TabsTrigger
              value="support"
              className="gap-2 animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/30"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline font-semibold">Apoie</span>
            </TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-6">
            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
                <CardDescription>
                  Adicione ou altere sua foto de perfil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploading}
                          asChild
                        >
                          <span>
                            {uploading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {uploading ? "Enviando..." : "Alterar Foto"}
                          </span>
                        </Button>
                      </div>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG ou WEBP. Máximo 10MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image Cropper Dialog */}
            {selectedImage && (
              <ImageCropperDialog
                open={cropperOpen}
                onOpenChange={handleCropperClose}
                imageSrc={selectedImage}
                onCropComplete={handleCroppedImageUpload}
                uploading={uploading}
              />
            )}

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize como você aparece para outros usuários nos ambientes compartilhados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      O e-mail não pode ser alterado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Como você quer ser chamado?"
                    />
                  </div>

                  <UsernameInput
                    value={profile.username}
                    currentUsername={profileDataRef.current}
                    disabled={isUsernameInCooldown}
                    onAvailabilityChange={setUsernameAvailable}
                    onChange={(username) => setProfile({ ...profile, username })}
                    label="@username"
                  />
                  {isUsernameInCooldown && (
                    <p className="text-sm text-amber-600">
                      Você poderá alterar seu username novamente em {remainingCooldownDays} dia(s).
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !profile.birth_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {profile.birth_date 
                              ? format(parseISO(profile.birth_date), "dd/MM/yyyy", { locale: ptBR }) 
                              : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={profile.birth_date ? parseISO(profile.birth_date) : undefined}
                            onSelect={(date) => 
                              setProfile({ ...profile, birth_date: date ? format(date, "yyyy-MM-dd") : null })
                            }
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className="pointer-events-auto"
                            captionLayout="dropdown-buttons"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <CitySearchInput
                        id="city"
                        value={profile.city || ""}
                        onChange={(value) => setProfile({ ...profile, city: value })}
                        placeholder="Buscar cidade..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Celular</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone || ""}
                      onChange={handlePhoneChange}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="education_level">Segmento de Ensino</Label>
                    <Select 
                      value={profile.education_level || ""} 
                      onValueChange={(value) => setProfile({ ...profile, education_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu segmento" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {EDUCATION_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Terms Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {profile.terms_accepted ? (
                    <FileCheck className="h-5 w-5 text-green-500" />
                  ) : (
                    <FileX className="h-5 w-5 text-amber-500" />
                  )}
                  Termos de Uso
                </CardTitle>
                <CardDescription>
                  Status do aceite dos termos de uso e política de privacidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      {profile.terms_accepted ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                          <Check className="h-3 w-3 mr-1" />
                          Aceitos
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {profile.terms_accepted 
                        ? "Você já aceitou os termos de uso do Zenit." 
                        : "Você ainda não aceitou os termos de uso."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTermsDialog(true)}
                      className="gap-2"
                    >
                      Ver Termos
                    </Button>
                    {!profile.terms_accepted && (
                      <Button 
                        onClick={handleAcceptTerms}
                        disabled={loading}
                        className="gap-2"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Aceitar Termos
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <AchievementsList userName={formatUsername(profile.username)} />

            {/* Password Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Atualize sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, newPassword: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo 8 caracteres com letras maiúsculas, minúsculas, números e caracteres especiais
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      minLength={8}
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Atualizar Senha
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Onboarding Section */}
            <OnboardingResetCard />
          </TabsContent>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications" className="space-y-6">
            <PushNotificationToggle />
          </TabsContent>

          {/* ACCOUNTS & INTEGRATIONS TAB */}
          <TabsContent value="accounts" className="space-y-6">
            <GoogleAccountCard />
          </TabsContent>

          {/* APPEARANCE TAB */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tema</CardTitle>
                <CardDescription>
                  Escolha como o Zenit deve aparecer para você.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mounted && (
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "light" 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="p-3 rounded-full bg-amber-100">
                        <Sun className="h-6 w-6 text-amber-600" />
                      </div>
                      <span className="text-sm font-medium">Claro</span>
                    </button>

                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "dark" 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="p-3 rounded-full bg-slate-800">
                        <Moon className="h-6 w-6 text-slate-200" />
                      </div>
                      <span className="text-sm font-medium">Escuro</span>
                    </button>

                    <button
                      onClick={() => setTheme("system")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "system" 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-slate-800">
                        <Monitor className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Sistema</span>
                    </button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  O tema "Sistema" segue automaticamente as preferências do seu dispositivo.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUPPORT TAB */}
          <TabsContent value="support" className="space-y-6">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Ajude o Zenit a voar mais alto! 🚀</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Olá! Sou a Evelin, estudante universitária e criadora do Zenit. 
                  Este projeto é mantido com muito café e dedicação.
                </p>
              </div>

              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Coffee className="h-5 w-5 text-primary" />
                      Por que apoiar?
                    </div>
                    <p className="text-sm text-muted-foreground">
                      O Zenit é gratuito e sempre será para estudantes. Sua contribuição ajuda a:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Manter os servidores
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Desenvolver novas funcionalidades 
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Comprar café para continuar o projeto
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border bg-card space-y-4">
                    <div className="text-center">
                      <p className="font-semibold">Pix - Valor Fixo de R$ 5,00</p>
                      <p className="text-xs text-muted-foreground">
                        Cada contribuição faz a diferença! ❤️
                      </p>
                    </div>

                    <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                      <img 
                        src={qrCodePix} 
                        alt="QR Code Pix para doação de R$ 5,00" 
                        className="w-40 h-40 object-contain"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={pixKey}
                          readOnly
                          className="text-xs font-mono bg-muted"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={handleCopyPix}
                          className="shrink-0"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Beneficiário: {beneficiaryName}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Terms Dialog */}
      <TermsOfUseDialog open={showTermsDialog} onOpenChange={setShowTermsDialog} />
    </div>
  );
}

function OnboardingResetCard() {
  const navigate = useNavigate();
  const { isOnboardingCompleted, resetOnboarding } = useOnboarding();

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast.success("Onboarding resetado! Redirecionando...");
    setTimeout(() => {
      navigate("/onboarding");
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Tour do Zenit
        </CardTitle>
        <CardDescription>
          Veja novamente a apresentação dos recursos do Zenit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {isOnboardingCompleted 
                ? "Você já completou o tour de boas-vindas." 
                : "Você ainda não completou o tour."}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleResetOnboarding}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Ver novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoogleAccountCard() {
  const { user } = useAuth();
  const [linking, setLinking] = useState(false);

  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === "google"
  );
  const isGoogleLinked = !!googleIdentity;
  const googleEmail = googleIdentity?.identity_data?.email as string | undefined;

  const handleLinkGoogle = async () => {
    setLinking(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/settings",
        extraParams: {
          access_type: "offline",
          scope: "https://www.googleapis.com/auth/calendar.events",
        },
      });
      if (result?.error) {
        toast.error("Erro ao vincular conta Google: " + String(result.error));
      }
    } catch {
      toast.error("Não foi possível conectar com o Google.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Contas e Integrações
        </CardTitle>
        <CardDescription>
          Gerencie as contas vinculadas ao seu perfil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white dark:bg-white shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Google</p>
              {isGoogleLinked ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Conectada
                  </Badge>
                  {googleEmail && (
                    <span className="text-xs text-muted-foreground">{googleEmail}</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Conta não vinculada</p>
              )}
            </div>
          </div>
          {!isGoogleLinked && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLinkGoogle}
              disabled={linking}
              className="gap-2"
            >
              {linking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Vincular
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
