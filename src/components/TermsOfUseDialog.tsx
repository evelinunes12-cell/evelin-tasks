import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsOfUseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsOfUseDialog({ open, onOpenChange }: TermsOfUseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Termos de Uso e Política de Privacidade</DialogTitle>
          <DialogDescription>
            Última atualização: 27 de janeiro de 2026
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <p>
              Bem-vindo ao Zenit. Este documento regula o uso da nossa plataforma de gestão de estudos e produtividade. 
              Ao criar uma conta e utilizar nossos serviços, você confirma que leu, compreendeu e concorda com estes termos.
            </p>

            <section className="space-y-3">
              <h3 className="text-lg font-bold">PARTE I: TERMOS E CONDIÇÕES DE USO</h3>

              <div>
                <h4 className="font-semibold">1. O SERVIÇO</h4>
                <p className="text-muted-foreground mt-1">
                  1.1. O Zenit é uma plataforma SaaS (Software as a Service) destinada a estudantes, oferecendo ferramentas 
                  para organização de tarefas, gestão de tempo (Pomodoro), colaboração em grupos e relatórios de desempenho.
                </p>
                <p className="text-muted-foreground mt-1">
                  1.2. A plataforma é fornecida "como está" (as is), podendo passar por atualizações, inclusão ou remoção 
                  de funcionalidades a critério exclusivo da administração do Zenit.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">2. CADASTRO E ACESSO</h4>
                <p className="text-muted-foreground mt-1">
                  2.1. Para utilizar o Zenit, o usuário deve preencher um cadastro com informações verídicas e atualizadas, 
                  incluindo: Nome, E-mail, Idade, Cidade, Telefone e Nível de Escolaridade.
                </p>
                <p className="text-muted-foreground mt-1">
                  2.2. Menores de Idade: O uso da plataforma é permitido para menores de 18 anos, desde que com o consentimento 
                  e supervisão dos pais ou responsáveis legais.
                </p>
                <p className="text-muted-foreground mt-1">
                  2.3. O usuário é o único responsável pela segurança de sua senha e por qualquer atividade realizada em sua conta.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">3. REGRAS DE CONDUTA E GRUPOS DE TRABALHO</h4>
                <p className="text-muted-foreground mt-1">
                  3.1. A funcionalidade "Grupos de Trabalho" permite a colaboração entre usuários. É estritamente proibido:
                </p>
                <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                  <li>Compartilhar conteúdo ilegal, ofensivo, discriminatório ou pornográfico.</li>
                  <li>Praticar bullying ou assédio contra outros estudantes.</li>
                  <li>Violar direitos autorais de terceiros (ex: upload de livros piratas).</li>
                </ul>
                <p className="text-muted-foreground mt-1">
                  3.2. O Zenit se reserva o direito de suspender ou banir usuários que violem estas regras.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">4. PLANOS E MONETIZAÇÃO</h4>
                <p className="text-muted-foreground mt-1">
                  4.1. O Zenit pode oferecer planos gratuitos e pagos (Premium).
                </p>
                <p className="text-muted-foreground mt-1">
                  4.2. Anúncios: A versão gratuita da plataforma poderá exibir anúncios de terceiros. Ao utilizar a versão 
                  gratuita, você concorda com a exibição de publicidade.
                </p>
                <p className="text-muted-foreground mt-1">
                  4.3. Alterações: Reservamo-nos o direito de alterar preços ou transformar funcionalidades gratuitas em 
                  pagas mediante aviso prévio.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">5. PROPRIEDADE INTELECTUAL</h4>
                <p className="text-muted-foreground mt-1">
                  5.1. Todo o código-fonte, design, logotipos e a marca "Zenit" são propriedade exclusiva dos desenvolvedores da plataforma.
                </p>
                <p className="text-muted-foreground mt-1">
                  5.2. O conteúdo inserido pelo usuário (tarefas, anotações pessoais) pertence ao usuário.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">6. LIMITAÇÃO DE RESPONSABILIDADE</h4>
                <p className="text-muted-foreground mt-1">
                  6.1. O Zenit é uma ferramenta de apoio. Não garantimos aprovação em provas, vestibulares ou concursos, sendo 
                  o resultado acadêmico de total responsabilidade do estudante.
                </p>
                <p className="text-muted-foreground mt-1">
                  6.2. Não nos responsabilizamos por eventuais perdas de dados decorrentes de falhas técnicas, embora realizemos 
                  backups e utilizemos tecnologias seguras.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold">PARTE II: POLÍTICA DE PRIVACIDADE (Em conformidade com a LGPD)</h3>

              <div>
                <h4 className="font-semibold">1. CONTROLADOR DOS DADOS</h4>
                <p className="text-muted-foreground mt-1">
                  A plataforma Zenit é a controladora dos dados pessoais coletados. Para questões sobre privacidade, entre em contato.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">2. DADOS COLETADOS</h4>
                <p className="text-muted-foreground mt-1">Coletamos os seguintes dados para viabilizar o funcionamento do sistema:</p>
                <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                  <li>Dados de Identificação: Nome completo, e-mail, telefone/celular, idade, cidade e foto de perfil.</li>
                  <li>Dados Acadêmicos: Segmento de ensino (ex: Ensino Médio, Superior), disciplinas cadastradas.</li>
                  <li>Dados de Uso: Histórico de tarefas, logs de sessões de foco (Pomodoro), registros de ofensiva e arquivos anexados.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">3. FINALIDADE DO TRATAMENTO</h4>
                <p className="text-muted-foreground mt-1">Utilizamos seus dados para:</p>
                <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                  <li>Personalização: Adaptar a experiência (ex: relatórios comparativos por segmento de ensino).</li>
                  <li>Comunicação: Enviar notificações de tarefas, avisos e novidades do sistema.</li>
                  <li>Melhoria do Serviço: Analisar métricas agregadas para entender como os alunos estudam.</li>
                  <li>Segurança: Prevenção de fraudes e acesso não autorizado.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">4. COMPARTILHAMENTO DE DADOS</h4>
                <p className="text-muted-foreground mt-1">
                  4.1. Não vendemos seus dados pessoais para terceiros.
                </p>
                <p className="text-muted-foreground mt-1">
                  4.2. Seus dados podem ser armazenados em servidores de parceiros tecnológicos que seguem padrões internacionais de segurança.
                </p>
                <p className="text-muted-foreground mt-1">
                  4.3. Em "Grupos de Trabalho", seu Nome e Foto serão visíveis para outros membros do mesmo grupo.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">5. ARMAZENAMENTO E EXCLUSÃO</h4>
                <p className="text-muted-foreground mt-1">
                  5.1. Os dados permanecem armazenados enquanto sua conta estiver ativa.
                </p>
                <p className="text-muted-foreground mt-1">
                  5.2. Arquivamento: Tarefas concluídas há mais de 7 dias são arquivadas automaticamente para limpeza visual, 
                  mas permanecem no banco de dados acessíveis ao usuário.
                </p>
                <p className="text-muted-foreground mt-1">
                  5.3. Você pode solicitar a exclusão definitiva da sua conta e de todos os dados a qualquer momento através 
                  das configurações do perfil.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">6. SEUS DIREITOS (Art. 18 da LGPD)</h4>
                <p className="text-muted-foreground mt-1">Você tem direito a:</p>
                <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                  <li>Confirmar a existência de tratamento de dados.</li>
                  <li>Acessar seus dados.</li>
                  <li>Corrigir dados incompletos ou desatualizados.</li>
                  <li>Solicitar a portabilidade ou eliminação dos dados.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">7. COOKIES E TECNOLOGIAS DE RASTREAMENTO</h4>
                <p className="text-muted-foreground mt-1">
                  Utilizamos cookies e armazenamento local (Local Storage) para manter sua sessão ativa e salvar preferências de interface.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">8. ALTERAÇÕES NA POLÍTICA</h4>
                <p className="text-muted-foreground mt-1">
                  Esta política pode ser atualizada. Notificaremos os usuários sobre mudanças significativas através da plataforma ou e-mail.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Foro</h4>
                <p className="text-muted-foreground mt-1">
                  Fica eleito o foro da comarca de Macapá, Estado do Amapá, para dirimir quaisquer dúvidas oriundas deste documento.
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
