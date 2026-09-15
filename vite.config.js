import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const odlTarget = env.VITE_ODL_HOST || "http://localhost:8181";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api/rests": {
          target: odlTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
          timeout: 5000,
          proxyTimeout: 5000,
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              delete proxyRes.headers["www-authenticate"];
            });
          },
        },
        // Legacy ODL (Carbon/Nitrogen/Oxygen) uses /restconf/operational/
        "/api/restconf": {
          target: odlTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
          timeout: 5000,
          proxyTimeout: 5000,
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              delete proxyRes.headers["www-authenticate"];
            });
          },
        },
        // Dedicated ONOS Slices & Neural Intent Service (server-onos.js on port 5001)
        "/api/onos/slices": {
          target: "http://127.0.0.1:5001",
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
        },
        "/api/onos/intent": {
          target: "http://127.0.0.1:5001",
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
        },
        // Dedicated ONOS & Mininet QoS backend (server-onos.js on port 5001)
        "/api/onos-service": {
          target: "http://127.0.0.1:5001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/onos-service/, "/api/onos"),
          timeout: 10000,
          proxyTimeout: 10000,
        },
        // ONOS Controller proxy with auto-authentication
        "/api/onos": {
          target: odlTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/onos/, "/onos"),
          timeout: 5000,
          proxyTimeout: 5000,
          headers: {
            Authorization: "Basic " + Buffer.from("onos:rocks").toString("base64"),
          },
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              delete proxyRes.headers["www-authenticate"];
            });
          },
        },
        // OpenStack Cloud backend (Node.js proxy on port 5000)
        "/api/openstack": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          timeout: 15000,
          proxyTimeout: 15000,
          configure: (proxy) => {
            proxy.on("error", (err, req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Backend server restarting or unavailable" }));
              }
            });
          },
        },
        // OpenStack Slices management (Node.js on port 5000)
        "/api/slices": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
        },
        "/api/slice-manager": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          timeout: 15000,
          proxyTimeout: 15000,
        },
        "/api/settings": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          timeout: 15000,
          proxyTimeout: 15000,
        },
        "/api/glance": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          timeout: 30000,
          proxyTimeout: 30000,
        },
        "/api/tls": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          timeout: 15000,
          proxyTimeout: 15000,
        },
        "/api/login": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
        },
      },
    },
  };
});
