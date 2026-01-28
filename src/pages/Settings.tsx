import { useState, useEffect, useCallback } from "react";
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
  FileX
} from "lucide-react";
import { logError } from "@/lib/logger";
import { profileSchema, passwordSchema } from "@/lib/validation";
import { readFile } from "@/lib/cropImage";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";
import { TermsOfUseDialog } from "@/components/TermsOfUseDialog";
import { formatPhoneBR } from "@/lib/phoneMask";
import qrCodePix from "@/assets/qrcode-pix.jpeg";

const EDUCATION_LEVELS = [
  { value: "ensino_fundamental", label: "Ensino Fundamental" },
  { value: "ensino_medio", label: "Ensino Médio" },
  { value: "cursos_livres", label: "Cursos Livres" },
  { value: "curso_tecnico", label: "Curso Técnico" },
  { value: "ensino_superior", label: "Ensino Superior" },
  { value: "pos_graduacao", label: "Pós-graduação" },
  { value: "outros", label: "Outros" },
];

interface ProfileData {
  full_name: string;
  avatar_url: string | null;
  age: number | null;
  city: string | null;
  phone: string | null;
  education_level: string | null;
  terms_accepted: boolean | null;
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
    age: null,
    city: null,
    phone: null,
    education_level: null,
    terms_accepted: null,
  });
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [copied, setCopied] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  
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
        .select("full_name, avatar_url, age, city, phone, education_level, terms_accepted")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          ...data,
          phone: data.phone ? formatPhoneBR(data.phone) : null,
        });
      }
    } catch (error) {
      logError("Error fetching profile", error);
      toast.error("Erro ao carregar perfil");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = profileSchema.safeParse({ full_name: profile.full_name });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: validation.data.full_name,
          age: profile.age,
          city: profile.city,
          phone: profile.phone?.replace(/\D/g, "") || null,
          education_level: profile.education_level,
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      logError("Error updating profile", error);
      toast.error("Erro ao atualizar perfil");
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
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua conta e preferências do Zenit.
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" /> Aparência
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <Heart className="h-4 w-4" /> Apoie
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
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      placeholder="Como você quer ser chamado?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Idade</Label>
                      <Input
                        id="age"
                        type="number"
                        value={profile.age || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, age: e.target.value ? parseInt(e.target.value, 10) : null })
                        }
                        placeholder="Ex: 18"
                        min={10}
                        max={120}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        type="text"
                        value={profile.city || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, city: e.target.value })
                        }
                        placeholder="Sua cidade"
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
                  <Button 
                    variant="outline" 
                    onClick={() => setShowTermsDialog(true)}
                    className="gap-2"
                  >
                    Ver Termos
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                        Manter os servidores online
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Desenvolver novas funcionalidades (App Mobile!)
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Comprar café para as noites de código
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
