import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Coffee, Check, Copy, ArrowLeft, Mountain } from "lucide-react";
import { toast } from "sonner";
import qrCodePix from "@/assets/qrcode-pix.jpeg";

const Support = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Pix data
  const pixKey =
    "00020126500014br.gov.bcb.pix0111031539872890213Ajude o Zenit52040000530398654045.005802BR5925EVELIN CRISTINE DE OLIVEI6006MACAPA62580520SAN2026010812431328150300017br.gov.bcb.brcode01051.0.063045C5E";
  const beneficiaryName = "Evelin Cristine de Oliveira Nunes";

  useEffect(() => {
    document.title = "Apoie o Zenit | Doações via Pix";
  }, []);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Chave Pix copiada para a área de transferência!");
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Mountain className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">Zenit</span>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Ajude o Zenit a voar mais alto! 🚀</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Olá! Sou a Evelin, estudante universitária e criadora do Zenit. Este projeto é mantido
              com muito café e dedicação.
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
                    <Check className="h-4 w-4 text-success" />
                    Manter os servidores
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Desenvolver novas funcionalidades
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
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
                    <Input value={pixKey} readOnly className="text-xs font-mono bg-muted" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPix}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
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
      </div>
    </div>
  );
};

export default Support;
