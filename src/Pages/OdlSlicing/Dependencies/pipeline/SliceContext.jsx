import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "sdn_orchestrator_slices";

const SliceContext = createContext(null);

export const SliceProvider = ({ children }) => {
  const [slices, setSlices] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slices));
  }, [slices]);

  return (
    <SliceContext.Provider value={{ slices, setSlices }}>
      {children}
    </SliceContext.Provider>
  );
};

export const useSlices = () => {
  const context = useContext(SliceContext);
  if (!context) {
    throw new Error("useSlices must be used within a SliceProvider");
  }
  return context;
};
