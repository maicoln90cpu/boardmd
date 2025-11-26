import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { CheckCircle2, Sparkles, Zap, Shield, Clock, Brain, Target, TrendingUp, Users, Star, ChevronRight, Smartphone, Bell, Calendar } from "lucide-react";
export default function Landing() {
  const navigate = useNavigate();

  // Parallax scroll effects
  const {
    scrollY
  } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);
  const y3 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.8]);

  // Animation variants
  const fadeInUp = {
    hidden: {
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };
  const fadeIn = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };
  const staggerContainer = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  const scaleIn = {
    hidden: {
      scale: 0.8,
      opacity: 0
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };
  const slideInLeft = {
    hidden: {
      x: -50,
      opacity: 0
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };
  const slideInRight = {
    hidden: {
      x: 50,
      opacity: 0
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };
  const features = [{
    icon: Target,
    title: "Kanban Duplo: Diário + Projetos",
    description: "Separe o que é urgente do que é importante. Gerencie rotinas e grandes metas no mesmo lugar, sem confusão.",
    benefit: "Visão clara e organizada"
  }, {
    icon: Brain,
    title: "Assistente IA Diário",
    description: "Todo dia, a IA analisa suas tarefas e sugere o que fazer primeiro. É como ter um mentor de produtividade ao seu lado.",
    benefit: "Prioridades automáticas"
  }, {
    icon: Sparkles,
    title: "Notas com Formatação IA",
    description: "Escreva livremente e deixe a IA formatar, corrigir e organizar suas anotações. Seus pensamentos, sempre legíveis.",
    benefit: "Clareza sem esforço"
  }, {
    icon: TrendingUp,
    title: "Insights de Produtividade",
    description: "Descubra seus padrões de trabalho, horários mais produtivos e onde você pode melhorar com análises inteligentes.",
    benefit: "Autoconhecimento profundo"
  }, {
    icon: Calendar,
    title: "Recorrências Inteligentes",
    description: "Configure tarefas que se repetem automaticamente. Rotinas, hábitos e rituais nunca mais serão esquecidos.",
    benefit: "Automação de rotinas"
  }, {
    icon: Smartphone,
    title: "PWA Offline First",
    description: "Funciona sem internet. Instale como app no celular. Sincroniza automaticamente quando voltar online.",
    benefit: "Trabalhe de qualquer lugar"
  }];
  const benefits = [{
    emoji: "🧠",
    title: "Mente Limpa",
    description: "Pare de lembrar de tudo. Deixe o sistema guardar e organizar por você."
  }, {
    emoji: "⚡",
    title: "Decisões Rápidas",
    description: "Saiba exatamente o que fazer a seguir sem perder tempo pensando."
  }, {
    emoji: "📈",
    title: "Progresso Visível",
    description: "Veja sua evolução em tempo real e comemore cada conquista."
  }, {
    emoji: "🎯",
    title: "Foco Real",
    description: "Elimine distrações e concentre-se no que realmente importa."
  }, {
    emoji: "🔄",
    title: "Hábitos Consistentes",
    description: "Transforme intenções em ações repetidas com automação inteligente."
  }, {
    emoji: "💪",
    title: "Confiança Profissional",
    description: "Saiba que nada vai cair no esquecimento. Controle total."
  }];
  const testimonials = [{
    name: "Mariana Silva",
    role: "Product Manager",
    content: "Finalmente consigo separar as tarefas urgentes do dia dos meus projetos de longo prazo. O assistente IA me economiza 30 minutos toda manhã.",
    rating: 5
  }, {
    name: "Roberto Alves",
    role: "Freelancer Designer",
    content: "Como freelancer, eu vivia perdido entre projetos de clientes. Agora tenho um sistema que funciona offline e me lembra de tudo. Mudou meu jogo.",
    rating: 5
  }, {
    name: "Ana Beatriz",
    role: "Estudante de Medicina",
    content: "Gerenciar estudos, plantões e vida pessoal era caótico. O sistema de recorrências e notificações inteligentes me deu controle total da minha rotina.",
    rating: 5
  }];
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Animated Background Gradients */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 1
      }} className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <motion.div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3]
      }} transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }} />
        
        <motion.div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" animate={{
        scale: [1.2, 1, 1.2],
        opacity: [0.2, 0.4, 0.2]
      }} transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }} />

        {/* Floating Elements with Parallax */}
        <motion.div style={{
        y: y1,
        opacity
      }} className="absolute top-32 right-1/4 hidden lg:block">
          <motion.div animate={{
          rotate: 360,
          scale: [1, 1.1, 1]
        }} transition={{
          rotate: {
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          },
          scale: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }} className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </motion.div>
        </motion.div>

        <motion.div style={{
        y: y2,
        opacity
      }} className="absolute top-48 left-1/4 hidden lg:block">
          <motion.div animate={{
          rotate: -360,
          y: [0, -20, 0]
        }} transition={{
          rotate: {
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          },
          y: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }} className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary/30 to-secondary/10 backdrop-blur-sm border border-secondary/20 flex items-center justify-center">
            <Brain className="w-10 h-10 text-secondary" />
          </motion.div>
        </motion.div>

        <motion.div style={{
        y: y3,
        opacity
      }} className="absolute bottom-40 left-1/3 hidden lg:block">
          <motion.div animate={{
          rotate: 360,
          scale: [1, 1.2, 1]
        }} transition={{
          rotate: {
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          },
          scale: {
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }} className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </motion.div>
        </motion.div>

        <motion.div style={{
        y: y1,
        opacity,
        scale
      }} className="absolute top-64 right-1/3 hidden md:block">
          <motion.div animate={{
          y: [0, 30, 0],
          rotate: [0, 180, 360]
        }} transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }} className="w-8 h-8 rounded-full bg-primary/40 backdrop-blur-sm" />
        </motion.div>

        <motion.div style={{
        y: y2,
        opacity
      }} className="absolute bottom-32 right-1/2 hidden md:block">
          <motion.div animate={{
          y: [0, -40, 0],
          scale: [1, 1.3, 1]
        }} transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }} className="w-6 h-6 rounded-full bg-secondary/40 backdrop-blur-sm" />
        </motion.div>
        
        <motion.div style={{
        scale,
        opacity
      }} className="relative container mx-auto px-4 py-20 md:py-32 z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.2
          }}>
              <Badge className="mx-auto" variant="secondary">
                <Sparkles className="w-3 h-3 mr-1" />
                Gestão de Tarefas com Inteligência Artificial
              </Badge>
            </motion.div>
            
            <motion.h1 initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.4
          }} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Pare de Gerenciar.
              <br />
              <span className="text-primary">Comece a Realizar.</span>
            </motion.h1>
            
            <motion.p initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.6
          }} className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              O sistema de produtividade que pensa com você. Organização automática, 
              prioridades inteligentes e insights que transformam intenção em resultado.
            </motion.p>
            
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.8
          }} className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <motion.div whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }}>
                <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
                  Começar Gratuitamente
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }}>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => document.getElementById('features')?.scrollIntoView({
                behavior: 'smooth'
              })}>
                  Ver Como Funciona
                </Button>
              </motion.div>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            duration: 0.6,
            delay: 1
          }} className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <motion.div className="flex items-center gap-2" whileHover={{
              y: -2
            }}>
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Sem cartão de crédito</span>
              </motion.div>
              <motion.div className="flex items-center gap-2" whileHover={{
              y: -2
            }}>
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Setup em 2 minutos</span>
              </motion.div>
              <motion.div className="flex items-center gap-2" whileHover={{
              y: -2
            }}>
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Funciona offline</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={staggerContainer} className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Taxa de conclusão</div>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl font-bold text-primary">30min</div>
              <div className="text-sm text-muted-foreground">Economizados/dia</div>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl font-bold text-primary">5.0</div>
              <div className="text-sm text-muted-foreground">Avaliação média</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-16">
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
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <motion.div key={index} variants={fadeInUp} whileHover={{
            y: -8,
            transition: {
              duration: 0.2
            }
          }}>
                <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow h-full">
                  <motion.div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" initial={{
                opacity: 0
              }} whileHover={{
                opacity: 1
              }} transition={{
                duration: 0.3
              }} />
                  <CardHeader>
                    <motion.div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4" whileHover={{
                  rotate: 360,
                  scale: 1.1
                }} transition={{
                  duration: 0.6
                }}>
                      <feature.icon className="w-6 h-6 text-primary" />
                    </motion.div>
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
              </motion.div>)}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-16">
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
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => <motion.div key={index} variants={scaleIn} whileHover={{
            scale: 1.08,
            transition: {
              duration: 0.2
            }
          }}>
                <Card className="text-center h-full">
                  <CardHeader>
                    <motion.div className="text-5xl mb-4" whileHover={{
                  scale: 1.2,
                  rotate: [0, -10, 10, 0]
                }} transition={{
                  duration: 0.5
                }}>
                      {benefit.emoji}
                    </motion.div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                    <CardDescription className="text-base">
                      {benefit.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>)}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-16">
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
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={staggerContainer} className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => <motion.div key={index} variants={index % 2 === 0 ? slideInLeft : slideInRight} whileHover={{
            y: -8,
            transition: {
              duration: 0.2
            }
          }}>
                <Card className="relative h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <motion.div className="flex gap-1 mb-4" initial={{
                  opacity: 0
                }} whileInView={{
                  opacity: 1
                }} transition={{
                  delay: 0.5,
                  duration: 0.5
                }}>
                      {Array.from({
                    length: testimonial.rating
                  }).map((_, i) => <motion.div key={i} initial={{
                    scale: 0
                  }} whileInView={{
                    scale: 1
                  }} transition={{
                    delay: 0.5 + i * 0.1,
                    type: "spring"
                  }}>
                          <Star className="w-4 h-4 fill-primary text-primary" />
                        </motion.div>)}
                    </motion.div>
                    <CardDescription className="text-base italic">
                      "{testimonial.content}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </CardContent>
                </Card>
              </motion.div>)}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <motion.div initial={{
        opacity: 0
      }} whileInView={{
        opacity: 1
      }} viewport={{
        once: true
      }} transition={{
        duration: 1
      }} className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <div className="relative container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{
          once: true,
          margin: "-100px"
        }} variants={scaleIn}>
            <Card className="max-w-4xl mx-auto text-center p-8 md:p-12 shadow-2xl">
              <CardHeader>
                <motion.div className="flex justify-center mb-6" whileHover={{
                scale: 1.2,
                rotate: 360
              }} transition={{
                duration: 0.6
              }}>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                </motion.div>
                <motion.div variants={fadeInUp}>
                  <CardTitle className="text-3xl md:text-5xl font-bold mb-4">
                    Pronto para recuperar seu tempo?
                  </CardTitle>
                </motion.div>
                <motion.div variants={fadeInUp}>
                  <CardDescription className="text-lg md:text-xl">
                    Junte-se a milhares de profissionais que já transformaram sua rotina.
                    <br />
                    Configure em 2 minutos. Sem cartão de crédito. Sem compromisso.
                  </CardDescription>
                </motion.div>
              </CardHeader>
              <CardContent className="space-y-6">
                <motion.div variants={fadeInUp} whileHover={{
                scale: 1.05
              }} whileTap={{
                scale: 0.95
              }}>
                  <Button size="lg" onClick={() => navigate('/auth')} className="py-6 px-[10px] text-lg text-left">
                    <Zap className="mr-2 w-5 h-5" />
                    Começar Agora Gratuitamente
                  </Button>
                </motion.div>
                
                <motion.div variants={staggerContainer} className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
                  <motion.div variants={fadeIn} className="flex items-center gap-2" whileHover={{
                  y: -2
                }}>
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Setup em 2 minutos</span>
                  </motion.div>
                  <motion.div variants={fadeIn} className="flex items-center gap-2" whileHover={{
                  y: -2
                }}>
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Dados criptografados</span>
                  </motion.div>
                  <motion.div variants={fadeIn} className="flex items-center gap-2" whileHover={{
                  y: -2
                }}>
                    <Bell className="w-4 h-4 text-primary" />
                    <span>Suporte prioritário</span>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
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
    </div>;
}