import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseIntent } from '../utils/intentParser';

const CommandPalette = ({ isOpen, onClose }) => {
    const [input, setInput] = useState('');
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const preview = input.trim() ? parseIntent(input) : null;

    const handleSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!input.trim()) return;

        const result = parseIntent(input);

        if (result.type === 'NAVIGATE') {
            navigate(result.path);
            onClose();
        } else if (result.type === 'SLICE') {
            navigate('/slicing', { state: { intentPayload: result.payload, hostHints: result.hostHints } });
            onClose();
        } else {
            return; 
        }
        setInput('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[101] px-4"
                    >
                        <div className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-white/10">
                            <form onSubmit={handleSubmit} className="relative flex items-center px-6 py-5">
                                <Sparkles className="text-blue-400 mr-4 animate-pulse" size={24} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                                    placeholder="Type a command (e.g. 'Show map' or 'Isolate hospital traffic for HTTP')"
                                    className="w-full bg-transparent text-white text-lg font-medium outline-none placeholder:text-slate-500"
                                    autoComplete="off"
                                />
                                <div className="flex items-center gap-2 text-slate-500 ml-4">
                                    <button type="button" onClick={handleSubmit} className="text-xs font-bold bg-slate-800 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">
                                        ↵ Enter
                                    </button>
                                </div>
                            </form>

                            {preview && preview.type !== 'UNKNOWN' && (
                                <div className="px-6 pb-4">
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/70 border border-blue-500/30">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${preview.type === 'NAVIGATE' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                            {preview.type === 'NAVIGATE' ? 'Navigate' : 'Slice'}
                                        </span>
                                        <span className="text-white text-sm font-medium truncate">{preview.summary}</span>
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-800/50 px-6 py-4 border-t border-slate-700/50 text-xs font-medium text-slate-400 flex justify-between items-center">
                                <span>Powered by Rule-Based NLP</span>
                                <div className="flex gap-4">
                                    <span className="flex items-center gap-1"><Search size={12}/> Navigation</span>
                                    <span className="flex items-center gap-1"><Command size={12}/> Slicing Control</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;