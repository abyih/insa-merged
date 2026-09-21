<button 
  onClick={toggleTheme}
  className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-yellow-400 flex items-center justify-center"
  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
>
  {isDark ? <FaSun size={18} /> : <FaMoon size={18} />}
</button>