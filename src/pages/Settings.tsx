import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  QrCode,
  Rocket,
  KeyRound
} from "lucide-react";
import { logError } from "@/lib/logger";
import { profileSchema, passwordSchema } from "@/lib/validation";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  }>({
    full_name: "",
    avatar_url: null,
  });
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [copied, setCopied] = useState(false);

  // Dados do Pix
  const pixKey = "00020126700014br.gov.bcb.pix0123evelin.unes12@gmail.com0221Apoie o Projeto Zenit5204000053039865802BR5925Evelin Cristine De Olivei6009Sao Paulo62290525REC695E7AA18F1543934824326304B1FB";
  const beneficiaryName = "Evelin Cristine de Oliveira Nunes";

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
        .select("full_name, avatar_url")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
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
        .update({ full_name: validation.data.full_name })
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);

    try {
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${user?.id}/${oldPath}`]);
        }
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      logError("Error uploading avatar", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploading(false);
    }
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
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

          {/* ABA PERFIL */}
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
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG ou WEBP. Máximo 2MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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

                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </form>
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

          {/* ABA APARÊNCIA */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tema e Visual</CardTitle>
                <CardDescription>
                  Personalize a experiência do Zenit (Em breve).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Palette className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Modo Escuro / Claro</p>
                      <p className="text-sm text-muted-foreground">
                        O sistema adapta-se automaticamente ao seu dispositivo.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA APOIE */}
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
                  {/* Lado Esquerdo: Benefícios */}
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

                  {/* Lado Direito: Pix Card */}
                  <div className="p-4 rounded-xl border bg-card space-y-4">
                    <div className="text-center">
                      <p className="font-semibold">Pix Copia e Cola</p>
                      <p className="text-xs text-muted-foreground">
                        Qualquer valor ajuda muito! ❤️
                      </p>
                    </div>

                    {/* QR Code Placeholder */}
                    <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg">
                      <QrCode className="h-24 w-24 text-muted-foreground/50" />
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
