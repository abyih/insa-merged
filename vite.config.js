// // import { defineConfig } from "vite";
// // import react from "@vitejs/plugin-react";
// // import tailwindcss from "@tailwindcss/vite";

// // export default defineConfig({
// // 	plugins: [react(), tailwindcss()],
// // 	server: {
// // 		proxy: {
// // 			"/api/rests": {
// // 				target: "http://127.0.0.1:8181",
// // 				changeOrigin: true,
// // 				rewrite: (path) => path.replace(/^\/api/, ""),
// // 				timeout: 5000,
// // 				proxyTimeout: 5000,
// // 			},
// // 			// Legacy ODL (Carbon/Nitrogen/Oxygen) uses /restconf/operational/
// // 			"/api/restconf": {
// // 				target: "http://127.0.0.1:8181",
// // 				changeOrigin: true,
// // 				rewrite: (path) => path.replace(/^\/api/, ""),
// // 				timeout: 5000,
// // 				proxyTimeout: 5000,
// // 			},
// // 			// OpenStack Cloud backend (Node.js proxy on port 5000)
// // 			"/api/openstack": {
// // 				target: "http://127.0.0.1:5000",
// // 				changeOrigin: true,
// // 				timeout: 15000,
// // 				proxyTimeout: 15000,
// // 			},
// // 		},
// // 	},
// // });

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";

// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   server: {
//     proxy: {
//       // OpenDaylight (Magnesium+) RESTCONF API
//       "/api/rests": {
//         target: "http://127.0.0.1:8181",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""),
//         timeout: 5000,
//         proxyTimeout: 5000,
//         // Strip basic auth headers to prevent native browser login prompts
//         configure: (proxy) => {
//           proxy.on("proxyRes", (proxyRes) => {
//             delete proxyRes.headers["www-authenticate"];
//           });
//         }
//       },
//       // Legacy ODL uses /restconf/operational/
//       "/api/restconf": {
//         target: "http://127.0.0.1:8181",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""),
//         timeout: 5000,
//         proxyTimeout: 5000,
//         configure: (proxy) => {
//           proxy.on("proxyRes", (proxyRes) => {
//             delete proxyRes.headers["www-authenticate"];
//           });
//         }
//       },
//       // ONOS Northbound REST API 
//       "/api/onos": {
//         target: "http://127.0.0.1:8181",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""),
//         timeout: 5000,
//         proxyTimeout: 5000,
//         configure: (proxy) => {
//           proxy.on("proxyRes", (proxyRes) => {
//             delete proxyRes.headers["www-authenticate"];
//           });
//         }
//       },
//       // OpenStack Cloud backend (Node.js proxy on port 5000)
//       "/api/openstack": {
//         target: "http://127.0.0.1:5000",
//         changeOrigin: true,
//         timeout: 15000,
//         proxyTimeout: 15000,
//       },
//     },
//   },
// });


// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";

// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   server: {
//     proxy: {
//       // OpenDaylight (Magnesium+) RESTCONF API
//       "/api/rests": {
//         target: "http://127.0.0.1:8181",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""),
//         timeout: 5000,
//         proxyTimeout: 5000,
//         // Strip basic auth headers to prevent native browser login prompts
//         configure: (proxy) => {
//           proxy.on("proxyRes", (proxyRes) => {
//             delete proxyRes.headers["www-authenticate"];
//           });
//         }
//       },
//       // Legacy ODL uses /restconf/operational/
//       "/api/restconf": {
//         target: "http://127.0.0.1:8181",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""),
//         timeout: 5000,
//         proxyTimeout: 5000,
//         configure: (proxy) => {
//           proxy.on("proxyRes", (proxyRes) => {
//             delete proxyRes.headers["www-authenticate"];
//           });
//         }
//       },
//       // ONOS Northbound REST API 
//       "/api/onos": {
//         target: "http://127.0.0.1:8181",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""),
//         timeout: 5000,
//         proxyTimeout: 5000,
//         configure: (proxy) => {
//           proxy.on("proxyRes", (proxyRes) => {
//             delete proxyRes.headers["www-authenticate"];
//           });
//         }
//       },
//       // OpenStack Cloud backend (Node.js proxy on port 5000)
//       "/api/openstack": {
//         target: "http://127.0.0.1:5000",
//         changeOrigin: true,
//         timeout: 15000,
//         proxyTimeout: 15000,
//       },
//       "/api/floodlight": {
//         target: "http://127.0.0.1:8080",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api\/floodlight/, ""),
//         timeout: 5000,
//         proxyTimeout: 5000,
//       },
//     },
//   },
// });















// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";

// export default defineConfig({
// 	plugins: [react(), tailwindcss()],
// 	server: {
// 		proxy: {
// 			// OpenDaylight (Magnesium+) RESTCONF API
// 			"/api/rests": {
// 				target: "http://127.0.0.1:8181",
// 				changeOrigin: true,
// 				rewrite: (path) => path.replace(/^\/api/, ""),
// 				timeout: 5000,
// 				proxyTimeout: 5000,
// 				// Strip basic auth headers to prevent native browser login prompts
// 				configure: (proxy) => {
// 					proxy.on("proxyRes", (proxyRes) => {
// 						delete proxyRes.headers["www-authenticate"];
// 					});
// 				}
// 			},
// 			// Legacy ODL uses /restconf/operational/
// 			"/api/restconf": {
// 				target: "http://127.0.0.1:8181",
// 				changeOrigin: true,
// 				rewrite: (path) => path.replace(/^\/api/, ""),
// 				timeout: 5000,
// 				proxyTimeout: 5000,
// 				configure: (proxy) => {
// 					proxy.on("proxyRes", (proxyRes) => {
// 						delete proxyRes.headers["www-authenticate"];
// 					});
// 				}
// 			},
// 			// ONOS Northbound REST API 
// 			"/api/onos": {
// 				target: "http://127.0.0.1:8181",
// 				changeOrigin: true,
// 				rewrite: (path) => path.replace(/^\/api/, ""),
// 				timeout: 5000,
// 				proxyTimeout: 5000,
// 				configure: (proxy) => {
// 					proxy.on("proxyRes", (proxyRes) => {
// 						delete proxyRes.headers["www-authenticate"];
// 					});
// 				}
// 			},
// 			// OpenStack Cloud backend (Node.js proxy on port 5000)
// 			"/api/openstack": {
// 				target: "http://127.0.0.1:5000",
// 				changeOrigin: true,
// 				timeout: 15000,
// 				proxyTimeout: 15000,
// 			},
// 			"/api/floodlight": {
// 				target: "http://127.0.0.1:8080",
// 				changeOrigin: true,
// 				rewrite: (path) => path.replace(/^\/api\/floodlight/, ""),
// 				timeout: 5000,
// 				proxyTimeout: 5000,
// 			},
// 		},
// 	},
// });





















import { readFileSync } from "node:fs";
import { Agent as HttpsAgent } from "node:https";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// ODL's northbound RESTCONF now serves TLS on 8443 with a self-signed cert
// (etc/odl-tls-keystore.jks in the Karaf install, exported here as
// odl-tls-cert.pem). The proxy validates against that specific cert rather
// than skipping verification outright.
const odlHttpsAgent = new HttpsAgent({ ca: readFileSync("./odl-tls-cert.pem") });

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 5175,      // <--- This changes the port to 5175
		strictPort: true, // <--- This prevents it from switching back to 5173 if busy
		proxy: {
			// OpenDaylight (Magnesium+) RESTCONF API
			"/api/rests": {
				target: "https://127.0.0.1:8443",
				agent: odlHttpsAgent,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
				timeout: 5000,
				proxyTimeout: 5000,
				configure: (proxy) => {
					proxy.on("proxyRes", (proxyRes) => {
						delete proxyRes.headers["www-authenticate"];
					});
				}
			},
			// Legacy ODL uses /restconf/operational/
			"/api/restconf": {
				target: "https://127.0.0.1:8443",
				agent: odlHttpsAgent,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
				timeout: 5000,
				proxyTimeout: 5000,
				configure: (proxy) => {
					proxy.on("proxyRes", (proxyRes) => {
						delete proxyRes.headers["www-authenticate"];
					});
				}
			},
			// Dedicated ONOS Slices, Capacity & Verification Backend (server.js on port 5050)
			"/api/onos/slices": {
				target: "http://127.0.0.1:5050",
				changeOrigin: true,
				timeout: 10000,
				proxyTimeout: 10000,
			},
			"/api/onos/intent": {
				target: "http://127.0.0.1:5050",
				changeOrigin: true,
				timeout: 10000,
				proxyTimeout: 10000,
			},
			"/api/onos/qos": {
				target: "http://127.0.0.1:5050",
				changeOrigin: true,
				timeout: 10000,
				proxyTimeout: 10000,
			},
			"/api/onos/summary": {
				target: "http://127.0.0.1:5050",
				changeOrigin: true,
				timeout: 10000,
				proxyTimeout: 10000,
			},
			// Live verification test endpoints (ping, iperf, queue stats, DSCP check)
			"/api/onos/verify": {
				target: "http://127.0.0.1:5050",
				changeOrigin: true,
				timeout: 30000,
				proxyTimeout: 30000,
			},
			// Dedicated ONOS & Mininet QoS backend (server.js on port 5050)
			"/api/onos-service": {
				target: "http://127.0.0.1:5050",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/onos-service/, "/api/onos"),
				timeout: 10000,
				proxyTimeout: 10000,
			},
			// LinkGuard Security Telemetry & Control (server.js on port 5050)
			"/api/security": {
				target: "http://127.0.0.1:5050",
				changeOrigin: true,
				timeout: 10000,
				proxyTimeout: 10000,
			},
			// ONOS Northbound REST API — container port 8183, remapped from 8181
			// to avoid colliding with ODL, which owns 6653/8181/8101 on this host.
			"/api/onos": {
				target: "http://127.0.0.1:8183",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
				timeout: 5000,
				proxyTimeout: 5000,
				configure: (proxy) => {
					proxy.on("proxyRes", (proxyRes) => {
						delete proxyRes.headers["www-authenticate"];
					});
				}
			},
			// OpenStack Cloud backend
			"/api/openstack": {
				target: "http://127.0.0.1:5000",
				changeOrigin: true,
				timeout: 15000,
				proxyTimeout: 15000,
			},
			"/api/floodlight": {
				target: "http://127.0.0.1:8080",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/floodlight/, ""),
				timeout: 5000,
				proxyTimeout: 5000,
			},
		},
	},
});