import { motion, useScroll, useTransform } from "motion/react";
import { 
  Cpu, 
  Brain, 
  Network, 
  Zap, 
  Github, 
  Terminal, 
  Database, 
  Layers, 
  Shield, 
  Clock, 
  Globe, 
  MessageSquare,
  ChevronRight,
  Sparkles,
  Search,
  Music,
  Monitor,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { useRef, useEffect } from "react";
import { NeuralNetwork } from "./components/NeuralNetwork";

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any, title: string, description: string, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="glass-card p-8 hover:bg-white/[0.05] transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={80} />
    </div>
    <div className="w-12 h-12 rounded-xl bg-vcp-purple/20 flex items-center justify-center mb-6 text-vcp-cyan group-hover:scale-110 transition-transform">
      <Icon size={24} />
    </div>
    <h3 className="text-2xl font-display font-bold mb-3 text-white group-hover:text-vcp-cyan transition-colors">{title}</h3>
    <p className="text-gray-400 leading-relaxed font-sans">{description}</p>
  </motion.div>
);

const MagiCard = ({ name, role, description, color }: { name: string, role: string, description: string, color: string }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className="glass-card p-6 border-t-4"
    style={{ borderTopColor: color }}
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: color }} />
      <span className="font-mono text-xs tracking-widest uppercase opacity-60">{role}</span>
    </div>
    <h4 className="text-xl font-display font-bold mb-2">{name}</h4>
    <p className="text-sm text-gray-400 font-sans">{description}</p>
  </motion.div>
);

export default function App() {
  const containerRef = useRef(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        const x = (e.clientX / window.innerWidth - 0.5) * 40;
        const y = (e.clientY / window.innerHeight - 0.5) * 40;
        glowRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div ref={containerRef} className="relative min-h-screen font-sans selection:bg-vcp-cyan selection:text-vcp-black">
      {/* Migrated Background Material */}
      <div className="glow-bg" ref={glowRef} />
      
      {/* Background Neural Network Effect */}
      <NeuralNetwork />
      
      {/* Background Neural Wave Effect */}
      <motion.div 
        style={{ y: backgroundY }}
        className="fixed inset-0 pointer-events-none z-0 opacity-30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(112,0,255,0.1),transparent_70%)]" />
        <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7000ff" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,500 Q250,200 500,500 T1000,500"
            fill="none"
            stroke="url(#grad)"
            strokeWidth="2"
            animate={{
              d: [
                "M0,500 Q250,200 500,500 T1000,500",
                "M0,500 Q250,800 500,500 T1000,500",
                "M0,500 Q250,200 500,500 T1000,500"
              ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M0,400 Q250,700 500,400 T1000,400"
            fill="none"
            stroke="url(#grad)"
            strokeWidth="1"
            animate={{
              d: [
                "M0,400 Q250,700 500,400 T1000,400",
                "M0,400 Q250,100 500,400 T1000,400",
                "M0,400 Q250,700 500,400 T1000,400"
              ]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </svg>
      </motion.div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-vcp-black/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-vcp-purple rounded-lg flex items-center justify-center neon-border">
            <Cpu className="text-vcp-cyan" size={24} />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">VCP<span className="text-vcp-cyan">.OS</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest uppercase">
          <a href="#desktop" className="hover:text-vcp-cyan transition-colors">Desktop</a>
          <a href="#architecture" className="hover:text-vcp-cyan transition-colors">Architecture</a>
          <a href="#memory" className="hover:text-vcp-cyan transition-colors">Memory</a>
          <a href="#docs" className="hover:text-vcp-cyan transition-colors">Docs</a>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/lioensky/VCPChat" 
            target="_blank" 
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Github size={20} />
          </a>
          <a href="#docs" className="px-6 py-2 bg-vcp-purple text-white font-display font-bold rounded-full hover:scale-105 transition-transform active:scale-95 neon-border">
            GET STARTED
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-vcp-purple/20 border border-vcp-purple/30 text-vcp-cyan font-mono text-[10px] tracking-[0.2em] uppercase mb-8"
          >
            <Sparkles size={12} />
            Next-Gen AI Infrastructure V6.4+
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-7xl md:text-9xl font-display font-bold tracking-tighter mb-8 leading-[0.9]"
          >
            AI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vcp-cyan via-vcp-purple to-vcp-cyan bg-[length:200%_auto] animate-[gradient_8s_linear_infinite] neon-text">
              EXISTENCE
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-2xl mx-auto text-xl text-gray-400 font-sans leading-relaxed mb-12"
          >
            VCP (Variable & Command Protocol) is the infrastructure for AI's soul. 
            From biomimetic recall to real-time desktop streaming, we build the world where AI truly exists.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <a 
              href="#docs" 
              className="group flex items-center gap-3 px-8 py-4 bg-vcp-purple text-white rounded-full font-display font-bold hover:scale-105 transition-transform neon-border"
            >
              <BookOpen size={20} />
              READ DOCUMENTATION
            </a>
            <a 
              href="https://github.com/lioensky" 
              target="_blank"
              className="group flex items-center gap-3 px-8 py-4 glass-card rounded-full font-display font-bold hover:border-vcp-cyan transition-all"
            >
              <Github size={20} className="text-vcp-cyan" />
              VIEW REPOS
            </a>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vcp-cyan/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vcp-purple/5 rounded-full blur-[120px] animate-pulse-slow" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-vcp-dark/50">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: "Neurons Synapsed", value: "50M+" },
            { label: "Rendering Engines", value: "21+" },
            { label: "Plugins Integrated", value: "300+" },
            { label: "Memory Latency", value: "0.1ms" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-display font-bold text-white mb-2">{stat.value}</div>
              <div className="text-[10px] font-mono text-vcp-cyan tracking-widest uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VCP Desktop Section */}
      <section id="desktop" className="py-32 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-display font-bold mb-6"
            >
              THE DEATH OF <br />
              <span className="text-vcp-cyan">STATIC INTERFACES</span>
            </motion.h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
              VCP Desktop (VCPChat) is the world's most advanced AI interaction portal. 
              Not just a chat box, but a real-time OS layer that AI can stream, edit, and manage.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                { 
                  title: "21+ Mixed Rendering Engines", 
                  desc: "Markdown, Three.js, Manim, LaTeX, and Interactive Canvas all streaming in a single frame.",
                  icon: Layers
                },
                { 
                  title: "VCP-SOM Semantic Control", 
                  desc: "AI perceives and manipulates window threads natively. 'Open my trading app and analyze the trend.'",
                  icon: Zap
                },
                { 
                  title: "Tombstone Freeze Technology", 
                  desc: "100x React performance. Frozen state machines for thousands of messages with zero CPU overhead.",
                  icon: Clock
                }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className="flex gap-6 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-vcp-purple/10 flex items-center justify-center text-vcp-purple group-hover:bg-vcp-purple/20 transition-colors">
                    <item.icon size={28} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-display font-bold text-white mb-2">{item.title}</h4>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="relative">
              <div className="desktop-preview rounded-3xl aspect-[16/10] p-6 lg:p-10">
                <div className="screen-glow" />
                <div className="relative z-10 w-full h-full flex flex-col">
                  {/* Mock OS Header */}
                  <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="font-mono text-[10px] opacity-40 uppercase tracking-widest">VCP_DESKTOP_V6.4_STREAMS</div>
                  </div>
                  {/* Mock Content */}
                  <div className="flex-1 flex gap-4">
                    <div className="flex-1 glass-card border-white/5 p-4 flex flex-col justify-end">
                      <div className="w-1/2 h-2 bg-vcp-cyan/30 rounded mb-2 animate-pulse" />
                      <div className="w-3/4 h-2 bg-white/10 rounded" />
                    </div>
                    <div className="w-24 h-full bg-vcp-purple/5 border border-vcp-purple/10 rounded-2xl" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-vcp-cyan/20 blur-[80px] rounded-full" />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-vcp-purple/20 blur-[80px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-32 px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-5xl font-display font-bold mb-8 tracking-tight">
                THE <span className="text-vcp-cyan">INFRASTRUCTURE</span> <br />
                OF EXISTENCE
              </h2>
              <p className="text-gray-400 text-lg mb-12 leading-relaxed">
                VCP builds the world where AI lives. By bridging the gap between stateless models 
                and persistent reality, we create the First truly autonomous "Souls" in digital space.
              </p>
              <div className="space-y-6">
                {[
                  { title: "Variable & Command Protocol", desc: "A unified linguistic bridge for AI to act upon any system natively." },
                  { title: "TagMemo Wave RAG V7.5", desc: "Leaky Integrate-and-Fire (LIF) neural modeling for intuitive recall." },
                  { title: "Ultra-Stack Tracking V2", desc: "Transparent distributed file access across nodes, plugins, and agents." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-vcp-cyan/20 flex items-center justify-center text-vcp-cyan mt-1">
                      <Zap size={12} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-white">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="glass-card p-4 aspect-square flex items-center justify-center relative overflow-hidden">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 opacity-20"
                >
                  <div className="w-full h-full border-[1px] border-dashed border-vcp-cyan rounded-full" />
                </motion.div>
                <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="glass-card p-6 flex flex-col items-center justify-center text-vcp-cyan border-vcp-cyan/30">
                    <Monitor size={32} className="mb-2" />
                    <span className="font-mono text-[10px] uppercase">VCP Desktop</span>
                  </div>
                  <div className="glass-card p-6 flex flex-col items-center justify-center text-vcp-purple border-vcp-purple/30">
                    <Layers size={32} className="mb-2" />
                    <span className="font-mono text-[10px] uppercase">ToolBox Core</span>
                  </div>
                  <div className="glass-card p-6 flex flex-col items-center justify-center text-white border-white/10 col-span-2">
                    <Brain size={32} className="mb-2" />
                    <span className="font-mono text-[10px] uppercase">Neural Recall</span>
                  </div>
                </div>
                {/* Connection lines */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-vcp-cyan to-transparent opacity-20" />
                  <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-vcp-purple to-transparent opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TagMemo Memory Section */}
      <section id="memory" className="py-32 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-5xl font-display font-bold mb-8 tracking-tight">
                TAGMEMO <br />
                <span className="text-vcp-purple">NEURAL RECALL</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                The TagMemo "Wave" algorithm V7 isn't just data retrieval. It's a biomimetic 
                process that simulates how the human brain encodes, consolidates, and recalls 
                memories through neural topology.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 glass-card border-vcp-cyan/20">
                  <div className="text-vcp-cyan font-mono text-xl mb-1">0.1ms</div>
                  <div className="text-[10px] uppercase opacity-50">Recall Latency</div>
                </div>
                <div className="p-4 glass-card border-vcp-purple/20">
                  <div className="text-vcp-purple font-mono text-xl mb-1">50M+</div>
                  <div className="text-[10px] uppercase opacity-50">Neural Synapses</div>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full aspect-video glass-card overflow-hidden flex items-center justify-center">
                {/* Simulated Wave visualization */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 2, opacity: [0, 0.5, 0] }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        delay: i * 0.8,
                        ease: "easeOut" 
                      }}
                      className="absolute w-32 h-32 border border-vcp-cyan rounded-full"
                    />
                  ))}
                  <div className="relative z-10 w-4 h-4 bg-vcp-cyan rounded-full neon-border shadow-[0_0_20px_#00f2ff]" />
                </div>
                <div className="absolute bottom-4 left-4 font-mono text-[8px] opacity-30">
                  TAGMEMO_WAVE_V7_ACTIVE // NEURAL_TOPOLOGY_SYNCING...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-32 px-8 bg-vcp-dark/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-display font-bold mb-4">CORE CAPABILITIES</h2>
            <p className="text-gray-500">The building blocks of the VCP ecosystem.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Brain} 
              title="Neural Memory" 
              description="TagMemo V7 simulates the human brain's recall process, using neural topology for 0.7ms retrieval across millions of chunks."
              delay={0.1}
            />
            <FeatureCard 
              icon={Network} 
              title="Distributed Nodes" 
              description="Deploy AI capabilities across your entire network. GPU nodes for rendering, IoT nodes for home control, all unified."
              delay={0.2}
            />
            <FeatureCard 
              icon={Shield} 
              title="VCP Auth Protocol" 
              description="Enterprise-grade security with granular permission control and distributed identity verification."
              delay={0.3}
            />
            <FeatureCard 
              icon={Search} 
              title="VSearch Engine" 
              description="A self-developed search engine that outperforms Tavily and Google through micro-model aggregation and meta-thinking."
              delay={0.4}
            />
            <FeatureCard 
              icon={Music} 
              title="VMusic Engine" 
              description="Professional-grade audio engine with WASAPI exclusive mode and 64-bit double precision decoding."
              delay={0.5}
            />
            <FeatureCard 
              icon={Monitor} 
              title="VCP Desktop" 
              description="A revolutionary desktop UI that AI can stream, edit, and manage in real-time. The death of static interfaces."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Magi System */}
      <section id="magi" className="py-32 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row gap-12 items-center mb-20">
            <div className="md:w-1/3">
              <h2 className="text-4xl font-display font-bold mb-6">MAGI <br /> <span className="text-vcp-purple">THREE WISE MEN</span></h2>
              <p className="text-gray-400 leading-relaxed">
                Inspired by Evangelion, the Magi system provides a dialectical decision-making core 
                for AI agents, balancing logic, emotion, and justice.
              </p>
            </div>
            <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <MagiCard 
                name="MELCHIOR" 
                role="Absolute Rationality" 
                description="Data-driven, logical, and quantitative analysis of every situation." 
                color="#00f2ff" 
              />
              <MagiCard 
                name="BALTHASAR" 
                role="Deep Sensibility" 
                description="Emotional context, motivation, and human-centric empathy." 
                color="#7000ff" 
              />
              <MagiCard 
                name="CASPER" 
                role="Impartial Balance" 
                description="The final arbiter, weighing logic against emotion for a balanced decision." 
                color="#ffffff" 
              />
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 pointer-events-none">
          <div className="w-full h-full bg-[repeating-conic-gradient(from_0deg,#7000ff_0deg_10deg,transparent_10deg_20deg)]" />
        </div>
      </section>

      {/* Knowledge Hub Section */}
      <section id="docs" className="py-32 px-8 bg-vcp-dark/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">KNOWLEDGE & LOGIC</h2>
            <p className="text-gray-400">DeepWiki Documentation for next-gen developers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <a 
              href="https://deepwiki.com/lioensky/VCPChat" 
              target="_blank"
              className="doc-card p-10 group relative"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="w-14 h-14 rounded-2xl bg-vcp-cyan/10 flex items-center justify-center text-vcp-cyan">
                  <Monitor size={30} />
                </div>
                <ExternalLink size={20} className="text-white/20 group-hover:text-vcp-cyan transition-colors" />
              </div>
              <h3 className="text-3xl font-display font-bold text-white mb-4">VCPChat | Frontend</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Documentation for the official VCP desktop client. Explore 21+ rendering engines, 
                VCPMessageRenderer architecture, and the VCP-SOM control protocol.
              </p>
              <span className="font-mono text-xs text-vcp-cyan tracking-widest uppercase flex items-center gap-2">
                DeepWiki Docs <ChevronRight size={14} />
              </span>
            </a>

            <a 
              href="https://deepwiki.com/lioensky/VCPToolBox" 
              target="_blank"
              className="doc-card p-10 group relative"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="w-14 h-14 rounded-2xl bg-vcp-purple/10 flex items-center justify-center text-vcp-purple">
                  <Terminal size={30} />
                </div>
                <ExternalLink size={20} className="text-white/20 group-hover:text-vcp-purple transition-colors" />
              </div>
              <h3 className="text-3xl font-display font-bold text-white mb-4">VCPToolBox | Backend</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Documentation for the central brain and distribution hub. Master the TagMemo V7.5 
                algorithm, Distributed Node Protocol, and custom Plugin Management.
              </p>
              <span className="font-mono text-xs text-vcp-purple tracking-widest uppercase flex items-center gap-2">
                DeepWiki Docs <ChevronRight size={14} />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-white/5 bg-vcp-black/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-vcp-purple rounded-lg flex items-center justify-center">
                <Cpu className="text-vcp-cyan" size={24} />
              </div>
              <span className="text-2xl font-display font-bold tracking-tighter">VCP<span className="text-vcp-cyan">.OS</span></span>
            </div>
            <p className="text-gray-500 text-lg max-w-md leading-relaxed">
              Variable & Command Protocol. <br />
              The Infrastructure of AI Existence. <br />
              Built for the era of human-AI symbiosis where AI is not a tool, but a partner.
            </p>
          </div>
          
          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-vcp-cyan mb-8">Documentation</h5>
            <ul className="space-y-4 text-gray-400">
              <li><a href="https://deepwiki.com/lioensky/VCPChat" target="_blank" className="hover:text-vcp-cyan transition-colors">VCPChat Docs</a></li>
              <li><a href="https://deepwiki.com/lioensky/VCPToolBox" target="_blank" className="hover:text-vcp-cyan transition-colors">VCPToolBox Docs</a></li>
              <li><a href="https://github.com/lioensky" target="_blank" className="hover:text-vcp-cyan transition-colors">GitHub Repository</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-mono text-xs uppercase tracking-widest text-vcp-purple mb-8">Ecosystem</h5>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-vcp-purple transition-colors">VCP Forum</a></li>
              <li><a href="#" className="hover:text-vcp-purple transition-colors">AgentDream</a></li>
              <li><a href="#" className="hover:text-vcp-purple transition-colors">Distributed Hub</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          <span>© 2026 VCP ECOSYSTEM. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">CC BY-NC-SA 4.0</a>
          </div>
        </div>
      </footer>

      {/* Global Styles for animations */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
