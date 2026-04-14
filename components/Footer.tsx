
import React from 'react';
import { motion } from 'motion/react';
import { Heart, Github, Twitter, Globe, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-6xl mt-12 pb-8 px-4 border-t border-gray-800/50 pt-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Brand Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tight">
              Gemini Creator Studio
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
            The ultimate AI-powered production suite for short-form content creators. 
            From idea to viral script, audio, and visuals in minutes.
          </p>
        </div>

        {/* Quick Links / Features */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-1">
              <li><a href="#" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">Script Engine</a></li>
              <li><a href="#" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">Audio Lab</a></li>
              <li><a href="#" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">Visual Studio</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resources</h4>
            <ul className="space-y-1">
              <li><a href="#" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">API Status</a></li>
              <li><a href="#" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">Community</a></li>
            </ul>
          </div>
        </div>

        {/* Social & Legal */}
        <div className="flex flex-col md:items-end space-y-4">
          <div className="flex items-center gap-4">
            <a href="#" className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
              <Globe className="w-4 h-4" />
            </a>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest flex items-center md:justify-end gap-1">
              Made with <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500" /> for Creators
            </p>
            <p className="text-[9px] text-gray-700 mt-1">
              © {currentYear} Gemini Creator Studio. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-50" />
      <div className="mt-4 flex justify-center">
        <div className="px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10">
          <p className="text-[8px] font-bold text-indigo-400/50 uppercase tracking-[0.2em]">
            Powered by Gemini 2.5 Flash & Pro
          </p>
        </div>
      </div>
    </motion.footer>
  );
};
