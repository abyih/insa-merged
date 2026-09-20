import React, { createContext, useContext, useState, useEffect } from "react";

const SdnContext = createContext({
  activeController: "onos",
  setActiveController: () => {},
});

export const SdnProvider = ({ children }) => {
  const [activeController, setActiveControllerState] = useState(() => {
    return localStorage.getItem("active_sdn_controller") || "onos";
  });

  const setActiveController = (controller) => {
    const normalized = (controller || "onos").toLowerCase();
    localStorage.setItem("active_sdn_controller", normalized);
    setActiveControllerState(normalized);
  };

  // Listen for storage changes in case of multi-tab or external changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "active_sdn_controller" && e.newValue) {
        setActiveControllerState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <SdnContext.Provider value={{ activeController, setActiveController }}>
      {children}
    </SdnContext.Provider>
  );
};

export const useSdn = () => {
  const context = useContext(SdnContext);
  if (!context) {
    return {
      activeController: "onos",
      setActiveController: () => {},
    };
  }
  return context;
};

export default SdnContext;
