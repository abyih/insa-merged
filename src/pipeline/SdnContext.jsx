import React, { createContext, useContext, useState, useEffect } from "react";

const SdnContext = createContext(null);

export const SdnProvider = ({ children }) => {
  // Read initial controller selection from localStorage, default to 'odl'
  const [activeController, setActiveController] = useState(() => {
    return localStorage.getItem("active_sdn_controller") || "odl";
  });

  // Automatically persist any changes to localStorage
  useEffect(() => {
    localStorage.setItem("active_sdn_controller", activeController);
  }, [activeController]);

  const toggleController = () => {
    setActiveController((prev) => (prev === "odl" ? "onos" : "odl"));
  };

  return (
    <SdnContext.Provider value={{ activeController, setActiveController, toggleController }}>
      {children}
    </SdnContext.Provider>
  );
};

export const useSdn = () => {
  const context = useContext(SdnContext);
  if (!context) {
    throw new Error("useSdn must be used within an SdnProvider");
  }
  return context;
};
