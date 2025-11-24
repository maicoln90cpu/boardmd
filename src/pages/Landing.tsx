import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  Shield, 
  Clock, 
  Brain,
  Target,
  TrendingUp,
  Users,
  Star,
  ChevronRight,
  Smartphone,
  Bell,
  Calendar
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Target,
      title: "Kanban Duplo: Diário + Projetos",
      description: "Separe o que é urgente do que é importante. Gerencie rotinas e grandes metas no mesmo lugar, sem confusão.",
      benefit: "Visão clara e organizada"
    },
    {
      icon: Brain,
      title: "Assistente IA Diário",
      description: "Todo dia, a IA analisa suas tarefas e sugere o que fazer primeiro. É como ter um mentor de produtividade ao seu lado.",
      benefit: "Prioridades automáticas"
    },
    {
      icon: Sparkles,
      title: "Notas com Formatação IA",
      description: "Escreva livremente e deixe a IA formatar, corrigir e organizar suas anotações. Seus pensamentos, sempre legíveis.",
      benefit: "Clareza sem esforço"
    },
    {
      icon: TrendingUp,
      title: "Insights de Produtividade",
      description: "Descubra seus padrões de trabalho, horários mais produtivos e onde você pode melhorar com análises inteligentes.",
      benefit: "Autoconhecimento profundo"
    },
    {
      icon: Calendar,
      title: "Recorrências Inteligentes",
      description: "Configure tarefas que se repetem automaticamente. Rotinas, hábitos e rituais nunca mais serão esquecidos.",
      benefit: "Automação de rotinas"
    },
    {
      icon: Smartphone,
      title: "PWA Offline First",
      description: "Funciona sem internet. Instale como app no celular. Sincroniza automaticamente quando voltar online.",
      benefit: "Trabalhe de qualquer lugar"
    }
  ];

  const benefits = [
    {
      emoji: "🧠",
      title: "Mente Limpa",
      description: "Pare de lembrar de tudo. Deixe o sistema guardar e organizar por você."
    },
    {
      emoji: "⚡",
      title: "Decisões Rápidas",
      description: "Saiba exatamente o que fazer a seguir sem perder tempo pensando."
    },
    {
      emoji: "📈",
      title: "Progresso Visível",
      description: "Veja sua evolução em tempo real e comemore cada conquista."
    },
    {
      emoji: "🎯",
      title: "Foco Real",
      description: "Elimine distrações e concentre-se no que realmente importa."
    },
    {
      emoji: "🔄",
      title: "Hábitos Consistentes",
      description: "Transforme intenções em ações repetidas com automação inteligente."
    },
    {
      emoji: "💪",
      title: "Confiança Profissional",
      description: "Saiba que nada vai cair no esquecimento. Controle total."
    }
  ];

  const testimonials = [
    {
      name: "Mariana Silva",
      role: "Product Manager",
      content: "Finalmente consigo separar as tarefas urgentes do dia dos meus projetos de longo prazo. O assistente IA me economiza 30 minutos toda manhã.",
      rating: 5
    },
    {
      name: "Roberto Alves",
      role: "Freelancer Designer",
      content: "Como freelancer, eu vivia perdido entre projetos de clientes. Agora tenho um sistema que funciona offline e me lembra de tudo. Mudou meu jogo.",
      rating: 5
    },
    {
      name: "Ana Beatriz",
      role: "Estudante de Medicina",
      content: "Gerenciar estudos, plantões e vida pessoal era caótico. O sistema de recorrências e notificações inteligentes me deu controle total da minha rotina.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="mx-auto" variant="secondary">
              <Sparkles className="w-3 h-3 mr-1" />
              Gestão de Tarefas com Inteligência Artificial
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Pare de Gerenciar.
              <br />
              <span className="text-primary">Comece a Realizar.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              O sistema de produtividade que pensa com você. Organização automática, 
              prioridades inteligentes e insights que transformam intenção em resultado.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Começar Gratuitamente
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver Como Funciona
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Setup em 2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Funciona offline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Taxa de conclusão</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">30min</div>
              <div className="text-sm text-muted-foreground">Economizados/dia</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">5.0</div>
              <div className="text-sm text-muted-foreground">Avaliação média</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4" variant="outline">
              <Zap className="w-3 h-3 mr-1" />
              Funcionalidades
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tudo que você precisa para ser produtivo
            </h2>
            <p className="text-lg text-muted-foreground">
              Não é só mais um app de tarefas. É um sistema completo que trabalha para você.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="font-normal">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {feature.benefit}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4" variant="outline">
              <Shield className="w-3 h-3 mr-1" />
              Benefícios Reais
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              O que você realmente ganha
            </h2>
            <p className="text-lg text-muted-foreground">
              Além das funcionalidades, veja como sua vida muda no dia a dia.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:scale-105 transition-transform">
                <CardHeader>
                  <div className="text-5xl mb-4">{benefit.emoji}</div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  <CardDescription className="text-base">
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4" variant="outline">
              <Users className="w-3 h-3 mr-1" />
              Depoimentos
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Quem usa, aprova
            </h2>
            <p className="text-lg text-muted-foreground">
              Veja como profissionais de diferentes áreas estão transformando sua produtividade.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative">
                <CardHeader>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <CardDescription className="text-base italic">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <div className="relative container mx-auto px-4">
          <Card className="max-w-4xl mx-auto text-center p-8 md:p-12 shadow-2xl">
            <CardHeader>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl md:text-5xl font-bold mb-4">
                Pronto para recuperar seu tempo?
              </CardTitle>
              <CardDescription className="text-lg md:text-xl">
                Junte-se a milhares de profissionais que já transformaram sua rotina.
                <br />
                Configure em 2 minutos. Sem cartão de crédito. Sem compromisso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button 
                size="lg" 
                className="text-lg px-12 py-6"
                onClick={() => navigate('/auth')}
              >
                <Zap className="mr-2 w-5 h-5" />
                Começar Agora Gratuitamente
              </Button>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Setup em 2 minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Dados criptografados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span>Suporte prioritário</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">
              © 2025 To do Tasks. Transformando intenção em realização.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
