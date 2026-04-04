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
  Monitor
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
          <a href="#architecture" className="hover:text-vcp-cyan transition-colors">Architecture</a>
          <a href="#memory" className="hover:text-vcp-cyan transition-colors">Memory</a>
          <a href="#magi" className="hover:text-vcp-cyan transition-colors">Magi</a>
          <a href="#ecosystem" className="hover:text-vcp-cyan transition-colors">Ecosystem</a>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/lioensky/VCPChat" 
            target="_blank" 
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Github size={20} />
          </a>
          <button className="px-6 py-2 bg-vcp-purple text-white font-display font-bold rounded-full hover:scale-105 transition-transform active:scale-95 neon-border">
            DEPLOY NOW
          </button>
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
            BEYOND <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vcp-cyan via-vcp-purple to-vcp-cyan bg-[length:200%_auto] animate-[gradient_8s_linear_infinite] neon-text">
              INTELLIGENCE
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-2xl mx-auto text-xl text-gray-400 font-sans leading-relaxed mb-12"
          >
            VCP is the middleware that gives AI a soul. Persistent memory, distributed tools, 
            and autonomous consciousness for the next era of human-AI symbiosis.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <a 
              href="https://github.com/lioensky/VCPToolBox" 
              target="_blank"
              className="group flex items-center gap-3 px-8 py-4 glass-card hover:border-vcp-cyan transition-all"
            >
              <Terminal size={20} className="text-vcp-cyan" />
              <div className="text-left">
                <div className="text-[10px] font-mono opacity-50 uppercase">Backend Core</div>
                <div className="font-display font-bold">VCPToolBox</div>
              </div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </a>
            <a 
              href="https://github.com/lioensky/VCPChat" 
              target="_blank"
              className="group flex items-center gap-3 px-8 py-4 glass-card hover:border-vcp-purple transition-all"
            >
              <MessageSquare size={20} className="text-vcp-purple" />
              <div className="text-left">
                <div className="text-[10px] font-mono opacity-50 uppercase">Frontend Client</div>
                <div className="font-display font-bold">VCPChat</div>
              </div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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
            { label: "Neurons Synapsed", value: "10M+" },
            { label: "Active Agents", value: "50k+" },
            { label: "Plugins Integrated", value: "300+" },
            { label: "Latency (RAG)", value: "0.7ms" }
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
                VCP isn't just "enhancing" AI. It's building the infrastructure for AI to exist. 
                By bridging the gap between stateless APIs and persistent reality, we create 
                agents that remember, act, and evolve.
              </p>
              <div className="space-y-6">
                {[
                  { title: "Variable & Command Protocol", desc: "A unified language for AI to interact with any system natively." },
                  { title: "TagMemo Wave RAG V7", desc: "Biomimetic neural memory that simulates human recall and intuition." },
                  { title: "Distributed Node Network", desc: "Scale AI capabilities across GPU, IoT, and edge devices seamlessly." }
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
                    <span className="font-mono text-[10px] uppercase">Frontend</span>
                  </div>
                  <div className="glass-card p-6 flex flex-col items-center justify-center text-vcp-purple border-vcp-purple/30">
                    <Layers size={32} className="mb-2" />
                    <span className="font-mono text-[10px] uppercase">VCP Core</span>
                  </div>
                  <div className="glass-card p-6 flex flex-col items-center justify-center text-white border-white/10 col-span-2">
                    <Brain size={32} className="mb-2" />
                    <span className="font-mono text-[10px] uppercase">Neural Memory</span>
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
                  <div className="text-vcp-cyan font-mono text-xl mb-1">0.7ms</div>
                  <div className="text-[10px] uppercase opacity-50">Retrieval Latency</div>
                </div>
                <div className="p-4 glass-card border-vcp-purple/20">
                  <div className="text-vcp-purple font-mono text-xl mb-1">10M+</div>
                  <div className="text-[10px] uppercase opacity-50">Synaptic Nodes</div>
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

      {/* Call to Action */}
      <section className="py-32 px-8">
        <div className="max-w-5xl mx-auto glass-card p-16 text-center relative overflow-hidden border-vcp-purple/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vcp-cyan via-vcp-purple to-vcp-cyan" />
          <h2 className="text-5xl font-display font-bold mb-8">READY TO GIVE YOUR <br /> AI A <span className="text-vcp-cyan">SOUL</span>?</h2>
          <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto">
            Join the VCP ecosystem today. Deploy the toolbox, connect the client, 
            and experience the next generation of AI interaction.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button className="px-10 py-4 bg-white text-vcp-black font-display font-bold rounded-full hover:bg-vcp-cyan transition-colors">
              GET STARTED
            </button>
            <button className="px-10 py-4 glass-card font-display font-bold rounded-full hover:border-vcp-purple transition-colors">
              DOCUMENTATION
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-vcp-purple rounded-lg flex items-center justify-center">
                <Cpu className="text-vcp-cyan" size={18} />
              </div>
              <span className="text-xl font-display font-bold tracking-tighter">VCP<span className="text-vcp-cyan">.OS</span></span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">
              Variable & Command Protocol. <br />
              Next-gen AI Infrastructure. <br />
              Built for the future of intelligence.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
            <div>
              <h5 className="font-mono text-[10px] uppercase tracking-widest text-vcp-cyan mb-6">Repositories</h5>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="https://github.com/lioensky/VCPToolBox" className="hover:text-white transition-colors">VCPToolBox</a></li>
                <li><a href="https://github.com/lioensky/VCPChat" className="hover:text-white transition-colors">VCPChat</a></li>
                <li><a href="https://github.com/lioensky/VCPDistributedServer" className="hover:text-white transition-colors">Distributed Server</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-mono text-[10px] uppercase tracking-widest text-vcp-purple mb-6">Community</h5>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">VCP Forum</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Task Board</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h5 className="font-mono text-[10px] uppercase tracking-widest text-white mb-6">Connect</h5>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:text-vcp-cyan transition-colors"><Github size={18} /></a>
                <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:text-vcp-cyan transition-colors"><Globe size={18} /></a>
                <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:text-vcp-cyan transition-colors"><MessageSquare size={18} /></a>
              </div>
            </div>
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
