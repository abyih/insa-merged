// // import dotenv from "dotenv";
// // dotenv.config();
// // import express from "express";
// // import cors from "cors";
// // import bodyParser from "body-parser";
// // import { execFile } from "child_process";
// // //new added line for socket.io
// // import { Server } from "socket.io";
// // import http from "http";
// // import axios from "axios";
// // import linkguardRouter, { startPolling } from './routes/linkguard.js';

// // const app = express();
// // // 2. NOW CREATE THE SERVER USING APP
// // const server = http.createServer(app);

// // // 3. NOW INITIALIZE SOCKET.IO
// // const io = new Server(server, {
// //   cors: { origin: "http://localhost:5173" }
// // });
// // const port = 5000;

// // const KEYSTONE_URL = process.env.KEYSTONE_URL;
// // let NEUTRON_URL = process.env.NEUTRON_URL;
// // let NOVA_URL = process.env.NOVA_URL;
// // let GLANCE_URL = process.env.GLANCE_URL;

// // const OS_USERNAME = process.env.OS_USERNAME || "admin";
// // const OS_PASSWORD = process.env.OS_PASSWORD || "secret";
// // const OS_PROJECT_NAME = process.env.OS_PROJECT_NAME || "admin";
// // const OS_USER_DOMAIN_NAME = process.env.OS_USER_DOMAIN_NAME || "default";
// // const OS_PROJECT_DOMAIN_NAME = process.env.OS_PROJECT_DOMAIN_NAME || "default";

// // let tokenCache = {
// //   token: null,
// //   expiresAt: 0,
// // };

// // app.use(
// //   cors({
// //     origin: "http://localhost:5173",
// //     methods: "GET,POST",
// //     allowedHeaders: "Content-Type, Authorization",
// //   })
// // );

// // app.use(bodyParser.json());


// // // Insa-dluxf original node endpoint
// // app.get("/api/nodes", (req, res) => {
// //   res.json({
// //     nodes: [
// //       { id: 1, name: "Node1" },
// //       { id: 2, name: "Node2" },
// //     ],
// //   });
// // });

// // /* =========================
// //    HELPER: NORMALIZE PROTOCOL (NO CRASH FOR ICMP)
// //    ========================= */
// // const normalizeProtocol = (protocol) => {
// //   if (!protocol) return "icmp";
// //   return protocol.toLowerCase();
// // };

// // /* Removed hardcoded resolveLogicalSwitch - now using dynamic findNetwork */

// // /* =========================
// //    TOKEN MANAGEMENT
// //    ========================= */
// // const getToken = async () => {
// //   const now = Date.now();
// //   if (tokenCache.token && tokenCache.expiresAt > now + 30000) {
// //     return tokenCache.token;
// //   }

// //   const response = await fetch(`${KEYSTONE_URL}/auth/tokens`, {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Accept: "application/json",
// //     },
// //     body: JSON.stringify({
// //       auth: {
// //         identity: {
// //           methods: ["password"],
// //           password: {
// //             user: {
// //               name: OS_USERNAME,
// //               password: OS_PASSWORD,
// //               domain: { name: OS_USER_DOMAIN_NAME },
// //             },
// //           },
// //         },
// //         scope: {
// //           project: {
// //             name: OS_PROJECT_NAME,
// //             domain: { name: OS_PROJECT_DOMAIN_NAME },
// //           },
// //         },
// //       },
// //     }),
// //   });

// //   if (!response.ok) {
// //     const text = await response.text();
// //     throw new Error(`Keystone token request failed ${response.status}: ${text}`);
// //   }

// //   const token = response.headers.get("x-subject-token");
// //   const payload = await response.json();
// //   const expiresAt = Date.parse(payload.token.expires_at);

// //   // -- DYNAMIC SERVICE DISCOVERY (LEARNING PHASE) --
// //   const catalog = payload.token.catalog;
// //   if (catalog) {
// //     const keystoneUrlObj = new URL(KEYSTONE_URL);
// //     const keystoneHost = keystoneUrlObj.hostname;
// //     const isLocalKeystone = keystoneHost === '127.0.0.1' || keystoneHost === 'localhost';

// //     const getUrl = (type) => {
// //       const service = catalog.find((s) => s.type === type);
// //       if (service && service.endpoints && service.endpoints.length > 0) {
// //         // Prefer public interface, fallback to whatever is available
// //         const endpoint = service.endpoints.find((e) => e.interface === "public") || service.endpoints[0];
// //         let serviceUrl = endpoint.url;

// //         // If we are accessing Keystone locally (e.g. via port forwarding/tunneling),
// //         // OpenStack will likely still return its internal network IP (e.g., 172.x.x.x)
// //         // We must rewrite the hostname to match our local Keystone host to maintain connectivity.
// //         if (isLocalKeystone) {
// //           try {
// //             const urlObj = new URL(serviceUrl);
// //             urlObj.hostname = keystoneHost;
// //             serviceUrl = urlObj.toString();
// //           } catch (e) {
// //             // ignore
// //           }
// //         }
// //         return serviceUrl;
// //       }
// //       return null;
// //     };

// //     let nova = getUrl("compute");
// //     if (nova) NOVA_URL = nova;

// //     let neutron = getUrl("network");
// //     if (neutron) NEUTRON_URL = neutron.includes("/v2.0") ? neutron : `${neutron.replace(/\/$/, '')}/v2.0`;

// //     let glance = getUrl("image");
// //     if (glance) GLANCE_URL = glance.includes("/v2") ? glance : `${glance.replace(/\/$/, '')}/v2`;
// //   }
// //   // ------------------------------------------------

// //   tokenCache = { token, expiresAt };
// //   return token;
// // };

// // const osFetch = async (url, options = {}) => {
// //   const token = await getToken();
// //   const headers = {
// //     Accept: "application/json",
// //     "X-Auth-Token": token,
// //     ...(options.headers || {}),
// //   };
// //   return fetch(url, { ...options, headers });
// // };

// // const osJson = async (url, options = {}) => {
// //   const response = await osFetch(url, options);
// //   if (!response.ok) {
// //     const text = await response.text();
// //     throw new Error(`OpenStack request failed ${response.status}: ${text}`);
// //   }
// //   return response.json();
// // };

// // /* =========================
// //    FIX: DEFINE findServerByName — WAS MISSING, CAUSING ReferenceError CRASH
// //    ========================= */
// // async function findServerByName(name) {
// //   const data = await osJson(`${NOVA_URL}/servers?name=${encodeURIComponent(name)}`);
// //   const servers = data.servers || [];
// //   if (servers.length === 0) {
// //     throw new Error(`Server not found: ${name}`);
// //   }
// //   // Get full server details to access security groups
// //   const detail = await osJson(`${NOVA_URL}/servers/${servers[0].id}`);
// //   return detail.server;
// // }

// // /* =========================
// //    FIX: DEFINE findNetwork — WAS MISSING, CAUSING ReferenceError CRASH
// //    ========================= */
// // async function findNetwork(nameOrId) {
// //   const data = await osJson(
// //     `${NEUTRON_URL}/networks?name=${encodeURIComponent(nameOrId)}`
// //   );
// //   const networks = data.networks || [];
// //   if (networks.length === 0) {
// //     throw new Error(`Network not found: ${nameOrId}`);
// //   }
// //   const net = networks[0];
// //   // Get subnet CIDR
// //   if (net.subnets && net.subnets.length > 0) {
// //     try {
// //       const subnetData = await osJson(`${NEUTRON_URL}/subnets/${net.subnets[0]}`);
// //       net.cidr = subnetData.subnet?.cidr || "0.0.0.0/0";
// //     } catch (_) {
// //       net.cidr = "0.0.0.0/0";
// //     }
// //   } else {
// //     net.cidr = "0.0.0.0/0";
// //   }
// //   return net;
// // }

// // /* =========================
// //    FIX: ADD MISSING /api/openstack/cloud-summary ENDPOINT
// //    Cloud.jsx line 59 calls this — it was COMPLETELY MISSING from server.js
// //    ========================= */
// // app.get("/api/openstack/cloud-summary", async (req, res) => {
// //   try {
// //     const token = await getToken();

// //     // Fetch servers (VMs) from Nova
// //     const [serversData, networksData, routersData, portsData] = await Promise.all([
// //       osJson(`${NOVA_URL}/servers/detail`),
// //       osJson(`${NEUTRON_URL}/networks`),
// //       osJson(`${NEUTRON_URL}/routers`),
// //       osJson(`${NEUTRON_URL}/ports`),
// //     ]);

// //     const servers = serversData.servers || [];
// //     const networks = networksData.networks || [];
// //     const routers = routersData.routers || [];
// //     const ports = portsData.ports || [];

// //     // Get subnets for CIDR info
// //     let subnets = [];
// //     try {
// //       const subnetData = await osJson(`${NEUTRON_URL}/subnets`);
// //       subnets = subnetData.subnets || [];
// //     } catch (_) { }

// //     // Map subnet id -> cidr
// //     const subnetMap = {};
// //     subnets.forEach((s) => {
// //       subnetMap[s.id] = s;
// //     });

// //     // Build port map: server_id -> port info
// //     const portByServer = {};
// //     ports.forEach((port) => {
// //       if (port.device_owner === "compute:nova" && port.device_id) {
// //         if (!portByServer[port.device_id]) {
// //           portByServer[port.device_id] = port;
// //         }
// //       }
// //     });

// //     // Build virtualMachines list matching what Cloud.jsx expects
// //     const virtualMachines = servers.map((server) => {
// //       const port = portByServer[server.id];
// //       const fixedIp = port?.fixed_ips?.[0];
// //       const ipAddr = fixedIp?.ip_address || Object.values(server.addresses || {})?.[0]?.[0]?.addr || "N/A";
// //       const networkName = Object.keys(server.addresses || {})?.[0] || port?.network_id || "N/A";
// //       const subnetInfo = fixedIp ? subnetMap[fixedIp.subnet_id] : null;

// //       return {
// //         id: server.id,
// //         name: server.name,
// //         status: server.status,
// //         ip: ipAddr,
// //         network: networkName,
// //         zone: server["OS-EXT-AZ:availability_zone"] || "nova",
// //         logicalPort: port?.id || null,
// //         logicalSwitch: port ? `neutron-${port.network_id}` : null,
// //       };
// //     });

// //     // Count tunnels (VXLAN/Geneve) from network segmentation
// //     const tunnelNetworks = networks.filter(
// //       (n) => n.provider_network_type === "vxlan" || n.provider_network_type === "geneve"
// //     );

// //     // Build stats for the dashboard cards
// //     const stats = [
// //       {
// //         title: "Active Instances",
// //         value: servers.filter((s) => s.status === "ACTIVE").length,
// //         icon: "🖥️",
// //       },
// //       {
// //         title: "OVN Logical Switches",
// //         value: networks.length,
// //         icon: "🌐",
// //       },
// //       {
// //         title: "Routers",
// //         value: routers.length,
// //         icon: "📡",
// //       },
// //       {
// //         title: "VXLAN/Geneve Tunnels",
// //         value: tunnelNetworks.length || networks.length,
// //         icon: "🔗",
// //       },
// //     ];

// //     // Build OVN networks for Cloud.jsx OVN Networks panel
// //     const ovnNetworks = networks.map((net) => {
// //       const subnetId = net.subnets?.[0];
// //       const subnet = subnetId ? subnetMap[subnetId] : null;
// //       const segId = net.provider_segmentation_id;
// //       const netType = (net.provider_network_type || "vxlan").toUpperCase();

// //       return {
// //         name: net.name,
// //         type: "OVN Logical Switch",
// //         cidr: subnet?.cidr || "N/A",
// //         segmentation: segId ? `${netType}-${segId}` : netType,
// //         status: net.admin_state_up ? "ACTIVE" : "DOWN",
// //         id: net.id,
// //       };
// //     });

// //     // Infrastructure status — check OVN/OVS health via ovn-nbctl
// //     const infrastructureStatus = await checkInfrastructureStatus();

// //     // Security rules — fetch existing security group rules
// //     let securityRules = [];
// //     try {
// //       const sgData = await osJson(`${NEUTRON_URL}/security-group-rules?limit=20`);
// //       securityRules = (sgData.security_group_rules || []).slice(0, 10).map((r) => ({
// //         id: r.id,
// //         protocol: r.protocol || "any",
// //         port: r.port_range_min ? `${r.port_range_min}-${r.port_range_max}` : "any",
// //         direction: r.direction,
// //         action: "ALLOW",
// //       }));
// //     } catch (_) { }

// //     res.json({
// //       stats,
// //       virtualMachines,
// //       networks: ovnNetworks,
// //       routers,
// //       ports,
// //       flows: [], // Live flows come from OVN southbound; placeholder for now
// //       securityRules,
// //       infrastructureStatus,
// //     });
// //   } catch (error) {
// //     console.error("Cloud summary error:", error.message);

// //     // Return a descriptive error — not a crash
// //     res.status(500).json({
// //       error: "OpenStack unreachable",
// //       details: error.message,
// //       stats: [],
// //       virtualMachines: [],
// //       networks: [],
// //       flows: [],
// //       securityRules: [],
// //     });
// //   }
// // });

// // /* =========================
// //    HELPER: CHECK OVN/OVS INFRASTRUCTURE STATUS
// //    ========================= */
// // async function checkInfrastructureStatus() {
// //   const status = {
// //     ovnNbDb: { status: "Unknown", health: 0 },
// //     ovnSbDb: { status: "Unknown", health: 0 },
// //     neutronApi: { status: "Unknown", health: 0 },
// //     ovsBridges: { status: "Unknown", health: 0 },
// //   };

// //   // Check Neutron API
// //   try {
// //     await osJson(`${NEUTRON_URL}/networks?limit=1`);
// //     status.neutronApi = { status: "Healthy", health: 90 };
// //   } catch (_) {
// //     status.neutronApi = { status: "Unreachable", health: 0 };
// //   }

// //   // Check OVN Northbound DB
// //   await new Promise((resolve) => {
// //     execFile("sudo", ["ovn-nbctl", "show"], { timeout: 5000 }, (error) => {
// //       if (!error) {
// //         status.ovnNbDb = { status: "Healthy", health: 95 };
// //         status.ovnSbDb = { status: "Connected", health: 88 };
// //         status.ovsBridges = { status: "Operational", health: 92 };
// //       } else {
// //         status.ovnNbDb = { status: "Not Available", health: 20 };
// //         status.ovnSbDb = { status: "Not Available", health: 20 };
// //         status.ovsBridges = { status: "Not Available", health: 20 };
// //       }
// //       resolve();
// //     });
// //   });

// //   return status;
// // }

// // /* =========================
// //    FIX: SECURITY RULE CREATION (ICMP SAFE + findServerByName/findNetwork NOW DEFINED)
// //    ========================= */
// // app.post("/api/openstack/security-groups/rules", async (req, res) => {
// //   const rule = req.body;

// //   if (
// //     !rule ||
// //     !rule.source ||
// //     !rule.destination ||
// //     (!rule.protocol || (rule.protocol.toUpperCase() !== "ICMP" && !rule.port))
// //   ) {
// //     return res.status(400).json({
// //       error: "Source, destination, and port are required.",
// //     });
// //   }

// //   if (rule.action && rule.action.toUpperCase() !== "ALLOW") {
// //     return res.status(400).json({
// //       error: "OpenStack security groups only support ALLOW rules.",
// //     });
// //   }

// //   try {
// //     const server = await findServerByName(rule.source);
// //     const securityGroupName = server.security_groups?.[0]?.name;

// //     if (!securityGroupName) {
// //       return res.status(400).json({
// //         error: "Source VM has no security group attached.",
// //       });
// //     }

// //     const network = await findNetwork(rule.destination);

// //     const groupResponse = await osJson(
// //       `${NEUTRON_URL}/security-groups?name=${encodeURIComponent(securityGroupName)}`
// //     );

// //     const securityGroup = (groupResponse.security_groups || [])[0];

// //     if (!securityGroup) {
// //       return res.status(400).json({
// //         error: `Security group not found: ${securityGroupName}`,
// //       });
// //     }

// //     const cidr = network.cidr || "0.0.0.0/0";
// //     const ethertype = cidr.includes(":") ? "IPv6" : "IPv4";
// //     const reqProtocol = normalizeProtocol(rule.protocol);

// //     const rulesToCreate = [];

// //     if (reqProtocol === "icmp") {
// //       // Create BOTH IPv4 and IPv6 ICMP rules to support NAT64/IPv6 instances
// //       rulesToCreate.push({
// //         security_group_rule: {
// //           security_group_id: securityGroup.id,
// //           direction: "ingress",
// //           ethertype: "IPv4",
// //           protocol: "icmp",
// //           remote_ip_prefix: cidr.includes(":") ? "0.0.0.0/0" : cidr,
// //         },
// //       });
// //       rulesToCreate.push({
// //         security_group_rule: {
// //           security_group_id: securityGroup.id,
// //           direction: "ingress",
// //           ethertype: "IPv6",
// //           protocol: "ipv6-icmp",
// //           // Use ::/0 for IPv6 if the provided CIDR was IPv4
// //           remote_ip_prefix: cidr.includes(":") ? cidr : "::/0",
// //         },
// //       });
// //     } else {
// //       // TCP / UDP
// //       rulesToCreate.push({
// //         security_group_rule: {
// //           security_group_id: securityGroup.id,
// //           direction: "ingress",
// //           ethertype,
// //           protocol: reqProtocol,
// //           remote_ip_prefix: cidr,
// //           port_range_min: Number(rule.port),
// //           port_range_max: Number(rule.port),
// //         },
// //       });
// //     }

// //     const createdRules = await Promise.all(
// //       rulesToCreate.map((body) =>
// //         osJson(`${NEUTRON_URL}/security-group-rules`, {
// //           method: "POST",
// //           headers: { "Content-Type": "application/json" },
// //           body: JSON.stringify(body),
// //         }).catch((err) => {
// //           // If the rule already exists, OpenStack throws a 409 Conflict.
// //           // We can safely ignore this and pretend it succeeded.
// //           if (err.message && err.message.includes("409")) {
// //             return { security_group_rule: { id: "existing-rule" } };
// //           }
// //           throw err;
// //         })
// //       )
// //     );

// //     const firstRuleId = createdRules[0]?.security_group_rule?.id;

// //     res.json({
// //       success: true,
// //       acl: {
// //         id: firstRuleId,
// //         source: rule.source,
// //         destination: network.name,
// //         protocol: rule.protocol,
// //         port: rule.port,
// //         action: "ALLOW",
// //       },
// //       message: "Security group rule created successfully.",
// //     });
// //   } catch (error) {
// //     console.error("Security rule creation error:", error);

// //     if (error.message.includes("409")) {
// //       return res.status(409).json({
// //         error: "Security group rule already exists.",
// //       });
// //     }

// //     res.status(500).json({
// //       error: error.message || "Failed to create security group rule",
// //     });
// //   }
// // });

// // /* =========================
// //    FIX: ACL LIST (OVN switch name resolution)
// //    ========================= */
// // app.get("/api/openstack/acl-list/:logicalSwitch", async (req, res) => {
// //   let logicalSwitch = req.params.logicalSwitch;

// //   if (!logicalSwitch) {
// //     return res.status(400).json({ error: "Logical switch is required." });
// //   }

// //   try {
// //     if (!logicalSwitch.startsWith("neutron-")) {
// //       const network = await findNetwork(logicalSwitch);
// //       logicalSwitch = `neutron-${network.id}`;
// //     }
// //   } catch (error) {
// //     return res.status(404).json({ error: `Could not resolve network name ${logicalSwitch} to OVN logical switch.` });
// //   }

// //   execFile("sudo", ["-n", "ovn-nbctl", "acl-list", logicalSwitch], (error, stdout, stderr) => {
// //     if (error) {
// //       return res.status(500).json({
// //         error: stderr || error.message,
// //         message: "Failed to verify ACLs (OVN permission or switch mismatch).",
// //         available: false,
// //       });
// //     }

// //     let acls = stdout
// //       .split("\n")
// //       .map((line) => line.trim())
// //       .filter(Boolean);

// //     // If no ACLs on the switch directly, query all ACLs (as OpenStack uses Port Groups)
// //     if (acls.length === 0) {
// //       execFile("sudo", ["-n", "ovn-nbctl", "list", "acl"], (err2, stdout2) => {
// //         if (!err2 && stdout2) {
// //           acls = stdout2
// //             .split("\n")
// //             .filter((line) => line.includes("match") || line.includes("action") || line.includes("direction"))
// //             .map((line) => line.trim())
// //             .slice(0, 15); // limit output to keep it readable

// //           if (acls.length > 0) {
// //             acls.unshift("--- Port Group ACLs found in OVN DB ---");
// //           }
// //         }
// //         res.json({ logicalSwitch, acls, available: true });
// //       });
// //       return;
// //     }

// //     res.json({ logicalSwitch, acls, available: true });
// //   });
// // });

// // /* =========================
// //    FIX: ADD MISSING /api/openstack/create-vm ENDPOINT
// //    ========================= */
// // app.post("/api/openstack/create-vm", async (req, res) => {
// //   const { name, flavor, image, network } = req.body;

// //   if (!name || !flavor || !image || !network) {
// //     return res.status(400).json({ error: "name, flavor, image, and network are required." });
// //   }

// //   try {
// //     // Resolve flavor ID
// //     const flavorsData = await osJson(`${NOVA_URL}/flavors`);
// //     const flavorObj = (flavorsData.flavors || []).find(
// //       (f) => f.name === flavor || f.id === flavor
// //     );
// //     if (!flavorObj) {
// //       return res.status(400).json({ error: `Flavor not found: ${flavor}` });
// //     }

// //     // Resolve image ID
// //     const imagesData = await osJson(`${GLANCE_URL}/images?name=${encodeURIComponent(image)}`);
// //     const imageObj = (imagesData.images || [])[0];
// //     if (!imageObj) {
// //       return res.status(400).json({ error: `Image not found: ${image}` });
// //     }

// //     // Resolve network ID
// //     const networksData = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`);
// //     const networkObj = (networksData.networks || [])[0];
// //     if (!networkObj) {
// //       return res.status(400).json({ error: `Network not found: ${network}` });
// //     }

// //     // Create the server
// //     const serverBody = {
// //       server: {
// //         name,
// //         flavorRef: flavorObj.id,
// //         imageRef: imageObj.id,
// //         networks: [{ uuid: networkObj.id }],
// //       },
// //     };

// //     const created = await osJson(`${NOVA_URL}/servers`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify(serverBody),
// //     });

// //     res.json({
// //       success: true,
// //       server: created.server,
// //       message: `VM "${name}" created successfully.`,
// //     });
// //   } catch (error) {
// //     console.error("Create VM error:", error);
// //     res.status(500).json({ error: error.message || "Failed to create VM" });
// //   }
// // });

// // /* =========================
// //    FIX: ADD MISSING /api/openstack/create-network ENDPOINT
// //    ========================= */
// // app.post("/api/openstack/create-network", async (req, res) => {
// //   const { name, cidr, segmentation } = req.body;

// //   if (!name || !cidr) {
// //     return res.status(400).json({ error: "name and cidr are required." });
// //   }

// //   try {
// //     // Create network (let Neutron auto-assign type based on tenant config)
// //     const networkBody = {
// //       network: {
// //         name,
// //         admin_state_up: true,
// //       },
// //     };

// //     const createdNetwork = await osJson(`${NEUTRON_URL}/networks`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify(networkBody),
// //     });

// //     const networkId = createdNetwork.network.id;

// //     // Create subnet
// //     const subnetBody = {
// //       subnet: {
// //         network_id: networkId,
// //         ip_version: 4,
// //         cidr,
// //         name: `${name}-subnet`,
// //       },
// //     };

// //     const createdSubnet = await osJson(`${NEUTRON_URL}/subnets`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify(subnetBody),
// //     });

// //     res.json({
// //       success: true,
// //       network: createdNetwork.network,
// //       subnet: createdSubnet.subnet,
// //       message: `Network "${name}" created successfully.`,
// //     });
// //   } catch (error) {
// //     console.error("Create network error:", error);
// //     res.status(500).json({ error: error.message || "Failed to create network" });
// //   }
// // });

// // /* =========================
// //    FIX: ADD MISSING /api/openstack/launch-instance ENDPOINT
// //    (Same as create-vm but named differently for the Launch Instance modal)
// //    ========================= */
// // app.post("/api/openstack/launch-instance", async (req, res) => {
// //   const { name, flavor, image, network } = req.body;

// //   if (!name || !flavor || !image || !network) {
// //     return res.status(400).json({ error: "name, flavor, image, and network are required." });
// //   }

// //   try {
// //     const flavorsData = await osJson(`${NOVA_URL}/flavors`);
// //     const flavorObj = (flavorsData.flavors || []).find(
// //       (f) => f.name === flavor || f.id === flavor
// //     );
// //     if (!flavorObj) {
// //       return res.status(400).json({ error: `Flavor not found: ${flavor}` });
// //     }

// //     const imagesData = await osJson(`${GLANCE_URL}/images?name=${encodeURIComponent(image)}`);
// //     const imageObj = (imagesData.images || [])[0];
// //     if (!imageObj) {
// //       return res.status(400).json({ error: `Image not found: ${image}` });
// //     }

// //     const networksData = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`);
// //     const networkObj = (networksData.networks || [])[0];
// //     if (!networkObj) {
// //       return res.status(400).json({ error: `Network not found: ${network}` });
// //     }

// //     const serverBody = {
// //       server: {
// //         name,
// //         flavorRef: flavorObj.id,
// //         imageRef: imageObj.id,
// //         networks: [{ uuid: networkObj.id }],
// //       },
// //     };

// //     const created = await osJson(`${NOVA_URL}/servers`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify(serverBody),
// //     });

// //     res.json({
// //       success: true,
// //       server: created.server,
// //       message: `Instance "${name}" launched successfully.`,
// //     });
// //   } catch (error) {
// //     console.error("Launch instance error:", error);
// //     res.status(500).json({ error: error.message || "Failed to launch instance" });
// //   }
// // });

// // const bootstrap = async () => {
// //   console.log("--- BEGINNING LEARNING PHASE (SERVICE DISCOVERY) ---");
// //   try {
// //     // Calling getToken forces the backend to query Keystone and learn the dynamic IPs
// //     await getToken();
// //     console.log("--- LEARNING PHASE COMPLETE: STARTING APIS ---");
// //     console.log(`LEARNED IP ADDRESSES:`);
// //     console.log(`  Keystone (Registry): ${KEYSTONE_URL}`);
// //     console.log(`  Neutron  (Network):  ${NEUTRON_URL}`);
// //     console.log(`  Nova     (Compute):  ${NOVA_URL}`);
// //     console.log(`  Glance   (Image):    ${GLANCE_URL}`);
// //   } catch (error) {
// //     console.error("Warning: Failed to learn OpenStack environment addresses at startup:", error.message);
// //     console.error("The backend will still start, but OpenStack API calls may fail until Keystone is reachable.");
// //   }
// //   app.set('io', io);
// // app.use('/api/security', linkguardRouter);
// // startPolling(app);

// // server.listen(port, () => {
// //   console.log(`\nDashboard backend + Sockets listening on Port ${port}`);
// // });

// //   //app.listen(port, () => {
// //    // console.log(`\nDashboard backend is now listening on Port ${port}`);
// //   //});
// // };

// // bootstrap();

// import dotenv from "dotenv";
// dotenv.config();
// import express from "express";
// import cors from "cors";
// import bodyParser from "body-parser";
// import { execFile } from "child_process";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import pool from "./db.js";
// import fs from "fs";
// import path from "path";
// import { exec } from "child_process";
// import os from "os";
// import http from "http";
// import { Server } from "socket.io";

// // Import modularized TLS config helpers
// import { updateOdlTlsConfig, updateOnosTlsConfig } from "./tlsOrchestrator.js";
// // Import unified LinkGuard router and poller daemon
// import securityRoutes, { startPolling } from "./linkguard.js";

// const app = express();
// const port = 5000;

// // Wrap express app inside native HTTP server to support Socket.io WebSockets
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type", "Authorization"]
//     credentials: true
//   }
// });

// // Expose the Socket.io instance globally inside the app context
// app.set("io", io);

// const KEYSTONE_URL = process.env.KEYSTONE_URL;
// let NEUTRON_URL = process.env.NEUTRON_URL;
// let NOVA_URL = process.env.NOVA_URL;
// let GLANCE_URL = process.env.GLANCE_URL;

// const OS_USERNAME = process.env.OS_USERNAME || "admin";
// const OS_PASSWORD = process.env.OS_PASSWORD || "secret";
// const OS_PROJECT_NAME = process.env.OS_PROJECT_NAME || "admin";
// const OS_USER_DOMAIN_NAME = process.env.OS_USER_DOMAIN_NAME || "default";
// const OS_PROJECT_DOMAIN_NAME = process.env.OS_PROJECT_DOMAIN_NAME || "default";

// let tokenCache = {
//   token: null,
//   expiresAt: 0,
// };

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     methods: "GET,POST",
//     allowedHeaders: "Content-Type, Authorization",
//     credentials: true 
//   })
// );

// app.use(bodyParser.json());

// /**
//  * Portability Helper: Resolves VM user environments dynamically
//  */
// function resolvePortablePath(rawPath) {
//   if (!rawPath) return "";
//   const systemUser = process.env.VM_USER || os.userInfo().username;
//   return rawPath
//     .replace(/\${VM_USER}/g, systemUser)
//     .replace(/\$VM_USER/g, systemUser)
//     .replace(/^~/, os.homedir());
// }

// // Node inventory endpoint
// app.get("/api/nodes", (req, res) => {
//   res.json({
//     nodes: [
//       { id: 1, name: "Node1" },
//       { id: 2, name: "Node2" },
//     ],
//   });
// });

// // Register unified LinkGuard security routes
// app.use('/api/security', securityRoutes);

// /* ==========================================
//    USER AUTHENTICATION ROUTING (MYSQL + BCRYPT)
//    ========================================== */

// app.post("/api/openstack/auth/register", async (req, res) => {
//   const { username, password } = req.body;

//   if (!username || !password) {
//     return res.status(400).json({ error: "Username and password are required" });
//   }

//   try {
//     const [existing] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
//     if (existing.length > 0) {
//       return res.status(409).json({ error: "Username already exists" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     await pool.query(
//       "INSERT INTO users (username, password_hash) VALUES (?, ?)",
//       [username, hashedPassword]
//     );

//     res.status(201).json({ message: "User registered successfully" });
//   } catch (err) {
//     console.error("Registration error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.post("/api/openstack/auth/login", async (req, res) => {
//   const { username, password } = req.body;

//   if (!username || !password) {
//     return res.status(400).json({ error: "Username and password are required" });
//   }

//   try {
//     const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
//     const user = rows[0];

//     if (!user) {
//       return res.status(401).json({ error: "Wrong username or password" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password_hash);
//     if (!isMatch) {
//       return res.status(401).json({ error: "Wrong username or password" });
//     }

//     const token = jwt.sign(
//       { userId: user.id, username: user.username },
//       process.env.JWT_SECRET || "fallback_secret_key",
//       { expiresIn: "8h" }
//     );

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       username: user.username
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// /* =========================
//    HELPER: NORMALIZE PROTOCOL (NO CRASH FOR ICMP)
//    ========================= */
// const normalizeProtocol = (protocol) => {
//   if (!protocol) return "icmp";
//   return protocol.toLowerCase();
// };

// /* =========================
//    TOKEN MANAGEMENT
//    ========================= */
// const getToken = async () => {
//   const now = Date.now();
//   if (tokenCache.token && tokenCache.expiresAt > now + 30000) {
//     return tokenCache.token;
//   }

//   const response = await fetch(`${KEYSTONE_URL}/auth/tokens`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Accept: "application/json",
//     },
//     body: JSON.stringify({
//       auth: {
//         identity: {
//           methods: ["password"],
//           password: {
//             user: {
//               name: OS_USERNAME,
//               password: OS_PASSWORD,
//               domain: { name: OS_USER_DOMAIN_NAME },
//             },
//           },
//         },
//         scope: {
//           project: {
//             name: OS_PROJECT_NAME,
//             domain: { name: OS_PROJECT_DOMAIN_NAME },
//           },
//         },
//       },
//     }),
//   });

//   if (!response.ok) {
//     const text = await response.text();
//     throw new Error(`Keystone token request failed ${response.status}: ${text}`);
//   }

//   const token = response.headers.get("x-subject-token");
//   const payload = await response.json();
//   const expiresAt = Date.parse(payload.token.expires_at);

//   // -- DYNAMIC SERVICE DISCOVERY --
//   const catalog = payload.token.catalog;
//   if (catalog) {
//     const keystoneUrlObj = new URL(KEYSTONE_URL);
//     const keystoneHost = keystoneUrlObj.hostname;
//     const isLocalKeystone = keystoneHost === '127.0.0.1' || keystoneHost === 'localhost';

//     const getUrl = (type) => {
//       const service = catalog.find((s) => s.type === type);
//       if (service && service.endpoints && service.endpoints.length > 0) {
//         const endpoint = service.endpoints.find((e) => e.interface === "public") || service.endpoints[0];
//         let serviceUrl = endpoint.url;

//         if (isLocalKeystone) {
//           try {
//             const urlObj = new URL(serviceUrl);
//             urlObj.hostname = keystoneHost;
//             serviceUrl = urlObj.toString();
//           } catch (e) {
//             // ignore
//           }
//         }
//         return serviceUrl;
//       }
//       return null;
//     };

//     let nova = getUrl("compute");
//     if (nova) NOVA_URL = nova;

//     let neutron = getUrl("network");
//     if (neutron) NEUTRON_URL = neutron.includes("/v2.0") ? neutron : `${neutron.replace(/\/$/, '')}/v2.0`;

//     let glance = getUrl("image");
//     if (glance) GLANCE_URL = glance.includes("/v2") ? glance : `${glance.replace(/\/$/, '')}/v2`;
//   }

//   tokenCache = { token, expiresAt };
//   return token;
// };

// const osFetch = async (url, options = {}) => {
//   const token = await getToken();
//   const headers = {
//     Accept: "application/json",
//     "X-Auth-Token": token,
//     ...(options.headers || {}),
//   };
//   return fetch(url, { ...options, headers });
// };

// const osJson = async (url, options = {}) => {
//   const response = await osFetch(url, options);
//   if (!response.ok) {
//     const text = await response.text();
//     throw new Error(`OpenStack request failed ${response.status}: ${text}`);
//   }
//   return response.json();
// };

// async function findServerByName(name) {
//   const data = await osJson(`${NOVA_URL}/servers?name=${encodeURIComponent(name)}`);
//   const servers = data.servers || [];
//   if (servers.length === 0) {
//     throw new Error(`Server not found: ${name}`);
//   }
//   const detail = await osJson(`${NOVA_URL}/servers/${servers[0].id}`);
//   return detail.server;
// }

// async function findNetwork(nameOrId) {
//   const data = await osJson(
//     `${NEUTRON_URL}/networks?name=${encodeURIComponent(nameOrId)}`
//   );
//   const networks = data.networks || [];
//   if (networks.length === 0) {
//     throw new Error(`Network not found: ${nameOrId}`);
//   }
//   const net = networks[0];
//   if (net.subnets && net.subnets.length > 0) {
//     try {
//       const subnetData = await osJson(`${NEUTRON_URL}/subnets/${net.subnets[0]}`);
//       net.cidr = subnetData.subnet?.cidr || "0.0.0.0/0";
//     } catch (_) {
//       net.cidr = "0.0.0.0/0";
//     }
//   } else {
//     net.cidr = "0.0.0.0/0";
//   }
//   return net;
// }

// app.get("/api/openstack/cloud-summary", async (req, res) => {
//   try {
//     const token = await getToken();

//     const [serversData, networksData, routersData, portsData] = await Promise.all([
//       osJson(`${NOVA_URL}/servers/detail`),
//       osJson(`${NEUTRON_URL}/networks`),
//       osJson(`${NEUTRON_URL}/routers`),
//       osJson(`${NEUTRON_URL}/ports`),
//     ]);

//     const servers = serversData.servers || [];
//     const networks = networksData.networks || [];
//     const routers = routersData.routers || [];
//     const ports = portsData.ports || [];

//     let subnets = [];
//     try {
//       const subnetData = await osJson(`${NEUTRON_URL}/subnets`);
//       subnets = subnetData.subnets || [];
//     } catch (_) { }

//     const subnetMap = {};
//     subnets.forEach((s) => {
//       subnetMap[s.id] = s;
//     });

//     const portByServer = {};
//     ports.forEach((port) => {
//       if (port.device_owner === "compute:nova" && port.device_id) {
//         if (!portByServer[port.device_id]) {
//           portByServer[port.device_id] = port;
//         }
//       }
//     });

//     const virtualMachines = servers.map((server) => {
//       const port = portByServer[server.id];
//       const fixedIp = port?.fixed_ips?.[0];
//       const ipAddr = fixedIp?.ip_address || Object.values(server.addresses || {})?.[0]?.[0]?.addr || "N/A";
//       const networkName = Object.keys(server.addresses || {})?.[0] || port?.network_id || "N/A";

//       return {
//         id: server.id,
//         name: server.name,
//         status: server.status,
//         ip: ipAddr,
//         network: networkName,
//         zone: server["OS-EXT-AZ:availability_zone"] || "nova",
//         logicalPort: port?.id || null,
//         logicalSwitch: port ? `neutron-${port.network_id}` : null,
//       };
//     });

//     const tunnelNetworks = networks.filter(
//       (n) => n.provider_network_type === "vxlan" || n.provider_network_type === "geneve"
//     );

//     const stats = [
//       {
//         title: "Active Instances",
//         value: servers.filter((s) => s.status === "ACTIVE").length,
//         icon: "🖥️",
//       },
//       {
//         title: "OVN Logical Switches",
//         value: networks.length,
//         icon: "🌐",
//       },
//       {
//         title: "Routers",
//         value: routers.length,
//         icon: "📡",
//       },
//       {
//         title: "VXLAN/Geneve Tunnels",
//         value: tunnelNetworks.length || networks.length,
//         icon: "🔗",
//       },
//     ];

//     const ovnNetworks = networks.map((net) => {
//       const subnetId = net.subnets?.[0];
//       const subnet = subnetId ? subnetMap[subnetId] : null;
//       const segId = net.provider_segmentation_id;
//       const netType = (net.provider_network_type || "vxlan").toUpperCase();

//       return {
//         name: net.name,
//         type: "OVN Logical Switch",
//         cidr: subnet?.cidr || "N/A",
//         segmentation: segId ? `${netType}-${segId}` : netType,
//         status: net.admin_state_up ? "ACTIVE" : "DOWN",
//         id: net.id,
//       };
//     });

//     const infrastructureStatus = await checkInfrastructureStatus();

//     let securityRules = [];
//     try {
//       const sgData = await osJson(`${NEUTRON_URL}/security-group-rules?limit=20`);
//       securityRules = (sgData.security_group_rules || []).slice(0, 10).map((r) => ({
//         id: r.id,
//         protocol: r.protocol || "any",
//         port: r.port_range_min ? `${r.port_range_min}-${r.port_range_max}` : "any",
//         direction: r.direction,
//         action: "ALLOW",
//       }));
//     } catch (_) { }

//     res.json({
//       stats,
//       virtualMachines,
//       networks: ovnNetworks,
//       routers,
//       ports,
//       flows: [], 
//       securityRules,
//       infrastructureStatus,
//     });
//   } catch (error) {
//     console.error("Cloud summary error:", error.message);
//     res.status(500).json({
//       error: "OpenStack unreachable",
//       details: error.message,
//       stats: [],
//       virtualMachines: [],
//       networks: [],
//       flows: [],
//       securityRules: [],
//     });
//   }
// });

// async function checkInfrastructureStatus() {
//   const status = {
//     ovnNbDb: { status: "Unknown", health: 0 },
//     ovnSbDb: { status: "Unknown", health: 0 },
//     neutronApi: { status: "Unknown", health: 0 },
//     ovsBridges: { status: "Unknown", health: 0 },
//   };

//   try {
//     await osJson(`${NEUTRON_URL}/networks?limit=1`);
//     status.neutronApi = { status: "Healthy", health: 90 };
//   } catch (_) {
//     status.neutronApi = { status: "Unreachable", health: 0 };
//   }

//   await new Promise((resolve) => {
//     execFile("sudo", ["ovn-nbctl", "show"], { timeout: 5000 }, (error) => {
//       if (!error) {
//         status.ovnNbDb = { status: "Healthy", health: 95 };
//         status.ovnSbDb = { status: "Connected", health: 88 };
//         status.ovsBridges = { status: "Operational", health: 92 };
//       } else {
//         status.ovnNbDb = { status: "Not Available", health: 20 };
//         status.ovnSbDb = { status: "Not Available", health: 20 };
//         status.ovsBridges = { status: "Not Available", health: 20 };
//       }
//       resolve();
//     });
//   });

//   return status;
// }

// app.post("/api/openstack/security-groups/rules", async (req, res) => {
//   const rule = req.body;

//   if (
//     !rule ||
//     !rule.source ||
//     !rule.destination ||
//     (!rule.protocol || (rule.protocol.toUpperCase() !== "ICMP" && !rule.port))
//   ) {
//     return res.status(400).json({
//       error: "Source, destination, and port are required.",
//     });
//   }

//   if (rule.action && rule.action.toUpperCase() !== "ALLOW") {
//     return res.status(400).json({
//       error: "OpenStack security groups only support ALLOW rules.",
//     });
//   }

//   try {
//     const server = await findServerByName(rule.source);
//     const securityGroupName = server.security_groups?.[0]?.name;

//     if (!securityGroupName) {
//       return res.status(400).json({
//         error: "Source VM has no security group attached.",
//       });
//     }

//     const network = await findNetwork(rule.destination);

//     const groupResponse = await osJson(
//       `${NEUTRON_URL}/security-groups?name=${encodeURIComponent(securityGroupName)}`
//     );

//     const securityGroup = (groupResponse.security_groups || [])[0];

//     if (!securityGroup) {
//       return res.status(400).json({
//         error: `Security group not found: ${securityGroupName}`,
//       });
//     }

//     const cidr = network.cidr || "0.0.0.0/0";
//     const ethertype = cidr.includes(":") ? "IPv6" : "IPv4";
//     const reqProtocol = normalizeProtocol(rule.protocol);

//     const rulesToCreate = [];

//     if (reqProtocol === "icmp") {
//       rulesToCreate.push({
//         security_group_rule: {
//           security_group_id: securityGroup.id,
//           direction: "ingress",
//           ethertype: "IPv4",
//           protocol: "icmp",
//           remote_ip_prefix: cidr.includes(":") ? "0.0.0.0/0" : cidr,
//         },
//       });
//       rulesToCreate.push({
//         security_group_rule: {
//           security_group_id: securityGroup.id,
//           direction: "ingress",
//           ethertype: "IPv6",
//           protocol: "ipv6-icmp",
//           remote_ip_prefix: cidr.includes(":") ? cidr : "::/0",
//         },
//       });
//     } else {
//       rulesToCreate.push({
//         security_group_rule: {
//           security_group_id: securityGroup.id,
//           direction: "ingress",
//           ethertype,
//           protocol: reqProtocol,
//           remote_ip_prefix: cidr,
//           port_range_min: Number(rule.port),
//           port_range_max: Number(rule.port),
//         },
//       });
//     }

//     const createdRules = await Promise.all(
//       rulesToCreate.map((body) =>
//         osJson(`${NEUTRON_URL}/security-group-rules`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(body),
//         }).catch((err) => {
//           if (err.message && err.message.includes("409")) {
//             return { security_group_rule: { id: "existing-rule" } };
//           }
//           throw err;
//         })
//       )
//     );

//     const firstRuleId = createdRules[0]?.security_group_rule?.id;

//     res.json({
//       success: true,
//       acl: {
//         id: firstRuleId,
//         source: rule.source,
//         destination: network.name,
//         protocol: rule.protocol,
//         port: rule.port,
//         action: "ALLOW",
//       },
//       message: "Security group rule created successfully.",
//     });
//   } catch (error) {
//     console.error("Security rule creation error:", error);

//     if (error.message.includes("409")) {
//       return res.status(409).json({
//         error: "Security group rule already exists.",
//       });
//     }

//     res.status(500).json({
//       error: error.message || "Failed to create security group rule",
//     });
//   }
// });

// app.get("/api/openstack/acl-list/:logicalSwitch", async (req, res) => {
//   let logicalSwitch = req.params.logicalSwitch;

//   if (!logicalSwitch) {
//     return res.status(400).json({ error: "Logical switch is required." });
//   }

//   try {
//     if (!logicalSwitch.startsWith("neutron-")) {
//       const network = await findNetwork(logicalSwitch);
//       logicalSwitch = `neutron-${network.id}`;
//     }
//   } catch (error) {
//     return res.status(404).json({ error: `Could not resolve network name ${logicalSwitch} to OVN logical switch.` });
//   }

//   execFile("sudo", ["-n", "ovn-nbctl", "acl-list", logicalSwitch], (error, stdout, stderr) => {
//     if (error) {
//       return res.status(500).json({
//         error: stderr || error.message,
//         message: "Failed to verify ACLs (OVN permission or switch mismatch).",
//         available: false,
//       });
//     }

//     let acls = stdout
//       .split("\n")
//       .map((line) => line.trim())
//       .filter(Boolean);

//     if (acls.length === 0) {
//       execFile("sudo", ["-n", "ovn-nbctl", "list", "acl"], (err2, stdout2) => {
//         if (!err2 && stdout2) {
//           acls = stdout2
//             .split("\n")
//             .filter((line) => line.includes("match") || line.includes("action") || line.includes("direction"))
//             .map((line) => line.trim())
//             .slice(0, 15);

//           if (acls.length > 0) {
//             acls.unshift("--- Port Group ACLs found in OVN DB ---");
//           }
//         }
//         res.json({ logicalSwitch, acls, available: true });
//       });
//       return;
//     }

//     res.json({ logicalSwitch, acls, available: true });
//   });
// });

// app.post("/api/openstack/create-vm", async (req, res) => {
//   const { name, flavor, image, network } = req.body;

//   if (!name || !flavor || !image || !network) {
//     return res.status(400).json({ error: "name, flavor, image, and network are required." });
//   }

//   try {
//     const flavorsData = await osJson(`${NOVA_URL}/flavors`);
//     const flavorObj = (flavorsData.flavors || []).find(
//       (f) => f.name === flavor || f.id === flavor
//     );
//     if (!flavorObj) {
//       return res.status(400).json({ error: `Flavor not found: ${flavor}` });
//     }

//     const imagesData = await osJson(`${GLANCE_URL}/images?name=${encodeURIComponent(image)}`);
//     const imageObj = (imagesData.images || [])[0];
//     if (!imageObj) {
//       return res.status(400).json({ error: `Image not found: ${image}` });
//     }

//     const networksData = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`);
//     const networkObj = (networksData.networks || [])[0];
//     if (!networkObj) {
//       return res.status(400).json({ error: `Network not found: ${network}` });
//     }

//     const serverBody = {
//       server: {
//         name,
//         flavorRef: flavorObj.id,
//         imageRef: imageObj.id,
//         networks: [{ uuid: networkObj.id }],
//       },
//     };

//     const created = await osJson(`${NOVA_URL}/servers`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(serverBody),
//     });

//     res.json({
//       success: true,
//       server: created.server,
//       message: `VM "${name}" created successfully.`,
//     });
//   } catch (error) {
//     console.error("Create VM error:", error);
//     res.status(500).json({ error: error.message || "Failed to create VM" });
//   }
// });

// app.post("/api/openstack/create-network", async (req, res) => {
//   const { name, cidr, segmentation } = req.body;

//   if (!name || !cidr) {
//     return res.status(400).json({ error: "name and cidr are required." });
//   }

//   try {
//     const networkBody = {
//       network: {
//         name,
//         admin_state_up: true,
//       },
//     };

//     const createdNetwork = await osJson(`${NEUTRON_URL}/networks`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(networkBody),
//     });

//     const networkId = createdNetwork.network.id;

//     const subnetBody = {
//       subnet: {
//         network_id: networkId,
//         ip_version: 4,
//         cidr,
//         name: `${name}-subnet`,
//       },
//     };

//     const createdSubnet = await osJson(`${NEUTRON_URL}/subnets`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(subnetBody),
//     });

//     res.json({
//       success: true,
//       network: createdNetwork.network,
//       subnet: createdSubnet.subnet,
//       message: `Network "${name}" created successfully.`,
//     });
//   } catch (error) {
//     console.error("Create network error:", error);
//     res.status(500).json({ error: error.message || "Failed to create network" });
//   }
// });

// app.post("/api/openstack/launch-instance", async (req, res) => {
//   const { name, flavor, image, network } = req.body;

//   if (!name || !flavor || !image || !network) {
//     return res.status(400).json({ error: "name, flavor, image, and network are required." });
//   }

//   try {
//     const flavorsData = await osJson(`${NOVA_URL}/flavors`);
//     const flavorObj = (flavorsData.flavors || []).find(
//       (f) => f.name === flavor || f.id === flavor
//     );
//     if (!flavorObj) {
//       return res.status(400).json({ error: `Flavor not found: ${flavor}` });
//     }

//     const imagesData = await osJson(`${GLANCE_URL}/images?name=${encodeURIComponent(image)}`);
//     const imageObj = (imagesData.images || [])[0];
//     if (!imageObj) {
//       return res.status(400).json({ error: `Image not found: ${image}` });
//     }

//     const networksData = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`);
//     const networkObj = (networksData.networks || [])[0];
//     if (!networkObj) {
//       return res.status(400).json({ error: `Network not found: ${network}` });
//     }

//     const serverBody = {
//       server: {
//         name,
//         flavorRef: flavorObj.id,
//         imageRef: imageObj.id,
//         networks: [{ uuid: networkObj.id }],
//       },
//     };

//     const created = await osJson(`${NOVA_URL}/servers`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(serverBody),
//     });

//     res.json({
//       success: true,
//       server: created.server,
//       message: `Instance "${name}" launched successfully.`,
//     });
//   } catch (error) {
//     console.error("Launch instance error:", error);
//     res.status(500).json({ error: error.message || "Failed to launch instance" });
//   }
// });

// /* ==========================================
//    SDN TLS CONFIGURATION ROUTING (DYNAMIC ENVIRONMENT)
//    ========================================== */
// app.get(["/api/tls/status", "/api/openstack/tls/status"], async (req, res) => {
//   const { controller } = req.query;
//   if (!controller) return res.status(400).json({ error: "Controller parameter is required." });
//   const target = controller.toLowerCase();

//   try {
//     if (target === "odl") {
//       try {
//         const authHeader = "Basic " + Buffer.from("admin:admin").toString("base64");
//         const restconfRes = await fetch("http://127.0.0.1:8181/rests/data/openflow-switch-connection-config:switch-connection-config=openflow-switch-connection-provider-default-impl", {
//           headers: { "Authorization": authHeader, "Accept": "application/json" }
//         });
//         if (restconfRes.ok) {
//           const payload = await restconfRes.json();
//           const provider = payload["openflow-switch-connection-config:switch-connection-config"]?.[0];
//           const isEnabled = provider?.["transport-protocol"] === "TLS";
//           return res.json({ isEnabled });
//         }
//       } catch (e) {
//         console.warn("[Server Status Check] RESTCONF down, falling back to disk CFG scan...");
//       }

//       const vmUser = process.env.VM_USER || os.userInfo().username;
//       const rawEtcPath = process.env.ODL_ETC_PATH || `/home/${vmUser}/karaf-0.23.0/etc`;
//       const odlEtcPath = resolvePortablePath(rawEtcPath);
//       const ofPluginPath = path.join(odlEtcPath, "org.opendaylight.openflowplugin.cfg");
      
//       if (fs.existsSync(ofPluginPath)) {
//         const content = fs.readFileSync(ofPluginPath, "utf8");
//         const isEnabled = content.includes("use-transport-tls=true");
//         return res.json({ isEnabled });
//       }
//       return res.json({ isEnabled: false });

//     } else if (target === "onos") {
//       const isDocker = process.env.ONOS_RUNNING_IN_DOCKER === "true";
//       const containerName = process.env.ONOS_CONTAINER_NAME || "onos";
//       const defaultEtc = isDocker ? "/root/onos/apache-karaf-4.2.14/etc" : "/opt/onos/apache-karaf/etc";
//       const etcPath = process.env.ONOS_ETC_PATH || defaultEtc;
//       const ofFileName = "org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg";

//       if (isDocker) {
//         const checkCommand = `docker exec ${containerName} cat ${etcPath}/${ofFileName}`;
//         exec(checkCommand, (error, stdout) => {
//           if (error || !stdout) return res.json({ isEnabled: false });
//           const isEnabled = stdout.includes("tlsMode = enabled");
//           return res.json({ isEnabled });
//         });
//       } else {
//         const targetOfFile = path.join(etcPath, ofFileName);
//         if (fs.existsSync(targetOfFile)) {
//           const content = fs.readFileSync(targetOfFile, "utf8");
//           const isEnabled = content.includes("tlsMode = enabled");
//           return res.json({ isEnabled });
//         }
//         return res.json({ isEnabled: false });
//       }
//     } else {
//       return res.status(400).json({ error: "Unsupported controller." });
//     }
//   } catch (error) {
//     res.status(500).json({ error: "Failed to read configuration status.", details: error.message });
//   }
// });

// app.post(["/api/tls/toggle", "/api/openstack/tls/toggle"], async (req, res) => {
//   const { controller, enable } = req.body;
//   if (!controller || typeof enable !== "boolean") {
//     return res.status(400).json({ error: "Invalid request payload parameters." });
//   }
//   const target = controller.toLowerCase();

//   try {
//     if (target === "odl") {
//       await updateOdlTlsConfig(enable);
//       return res.json({ success: true, message: `ODL database and config files updated. TLS is now ${enable ? 'ENABLED' : 'DISABLED'}` });
//     } else if (target === "onos") {
//       updateOnosTlsConfig(enable);
//       return res.json({ success: true, message: `ONOS config updated. TLS is now ${enable ? 'ENABLED' : 'DISABLED'}` });
//     } else {
//       return res.status(400).json({ error: "TLS orchestration is only supported for ODL or ONOS." });
//     }
//   } catch (error) {
//     res.status(500).json({ error: "Failed to update configuration files.", details: error.message });
//   }
// });

// const bootstrap = async () => {
//   console.log("--- BEGINNING LEARNING PHASE (SERVICE DISCOVERY) ---");
//   try {
//     await getToken();
//     console.log("--- LEARNING PHASE COMPLETE: STARTING APIS ---");
//     console.log(`LEARNED IP ADDRESSES:`);
//     console.log(`  Keystone: ${KEYSTONE_URL}`);
//     console.log(`  Neutron:  ${NEUTRON_URL}`);
//     console.log(`  Nova:     ${NOVA_URL}`);
//     console.log(`  Glance:   ${GLANCE_URL}`);
//   } catch (error) {
//     console.error("Warning: Failed to learn OpenStack environment addresses at startup:", error.message);
//   }

//   // Start the background telemetry poller for LinkGuard
//   startPolling(app);

//   // Run native Node server bootstrapper
//   server.listen(port, '0.0.0.0', () => {
//     console.log(`\nDashboard backend is now listening on Port ${port}`);
//   });
// };

// // bootstrap();

// // import dotenv from "dotenv";
// // dotenv.config();
// // import express from "express";
// // import cors from "cors";
// // import bodyParser from "body-parser";
// // import { execFile, exec } from "child_process";
// // import bcrypt from "bcryptjs";
// // import jwt from "jsonwebtoken";
// // import fs from "fs";
// // import path from "path";
// // import os from "os";
// // import http from "http";
// // import { Server } from "socket.io";

// // // Import project modules
// // import pool from "./db.js";
// // import { updateOdlTlsConfig, updateOnosTlsConfig } from "./tlsOrchestrator.js";
// // import securityRoutes, { startPolling } from "./linkguard.js";

// // const app = express();
// // const port = 5000;

// // // Wrap express app inside native HTTP server to support Socket.io WebSockets
// // const server = http.createServer(app);

// // // FIX 1: Correct Syntax and CORS for Socket.io
// // const io = new Server(server, {
// //   cors: {
// //     origin: "http://localhost:5173",
// //     methods: ["GET", "POST"],
// //     allowedHeaders: ["Content-Type", "Authorization"],
// //     credentials: true // Comma was missing here in your previous version
// //   }
// // });

// // // Expose the Socket.io instance globally
// // app.set("io", io);

// // // FIX 2: Correct CORS for Express REST API
// // app.use(cors({
// //   origin: "http://localhost:5173",
// //   methods: ["GET", "POST"],
// //   allowedHeaders: ["Content-Type", "Authorization"],
// //   credentials: true
// // }));

// // app.use(bodyParser.json());

// // // Load Environment Variables
// // const KEYSTONE_URL = process.env.KEYSTONE_URL || "http://127.0.0.1:5000/v3";
// // let NEUTRON_URL = process.env.NEUTRON_URL;
// // let NOVA_URL = process.env.NOVA_URL;
// // let GLANCE_URL = process.env.GLANCE_URL;

// // const OS_USERNAME = process.env.OS_USERNAME || "admin";
// // const OS_PASSWORD = process.env.OS_PASSWORD || "secret";
// // const OS_PROJECT_NAME = process.env.OS_PROJECT_NAME || "admin";

// // let tokenCache = { token: null, expiresAt: 0 };

// // /* ==========================================
// //    LINKGUARD SECURITY GATEWAY ROUTING
// //    ========================================== */
// // app.use('/api/security', securityRoutes);

// // /* ==========================================
// //    USER AUTHENTICATION (MYSQL + JWT)
// //    ========================================== */
// // app.post("/api/openstack/auth/register", async (req, res) => {
// //   const { username, password } = req.body;
// //   if (!username || !password) return res.status(400).json({ error: "Required fields missing" });

// //   try {
// //     const salt = await bcrypt.genSalt(10);
// //     const hashedPassword = await bcrypt.hash(password, salt);
// //     await pool.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hashedPassword]);
// //     res.status(201).json({ message: "User registered successfully" });
// //   } catch (err) {
// //     res.status(500).json({ error: "Registration failed", details: err.message });
// //   }
// // });

// // app.post("/api/openstack/auth/login", async (req, res) => {
// //   const { username, password } = req.body;
// //   try {
// //     const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
// //     if (rows.length === 0) return res.status(401).json({ error: "User not found" });
// //     const isMatch = await bcrypt.compare(password, rows[0].password_hash);
// //     if (!isMatch) return res.status(401).json({ error: "Invalid password" });

// //     const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET || "secret", { expiresIn: "8h" });
// //     res.status(200).json({ message: "Login successful", token, username });
// //   } catch (err) {
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // });

// // /* =========================
// //    OPENSTACK TOKEN MANAGEMENT
// //    ========================= */
// // const getToken = async () => {
// //   const now = Date.now();
// //   if (tokenCache.token && tokenCache.expiresAt > now + 30000) return tokenCache.token;

// //   try {
// //     const response = await fetch(`${KEYSTONE_URL}/auth/tokens`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({
// //         auth: {
// //           identity: {
// //             methods: ["password"],
// //             password: {
// //               user: { name: OS_USERNAME, password: OS_PASSWORD, domain: { name: "default" } }
// //             }
// //           },
// //           scope: { project: { name: OS_PROJECT_NAME, domain: { name: "default" } } }
// //         }
// //       })
// //     });
// //     const token = response.headers.get("x-subject-token");
// //     const payload = await response.json();
// //     tokenCache = { token, expiresAt: Date.parse(payload.token.expires_at) };
// //     return token;
// //   } catch (e) {
// //     console.error("Token Error:", e.message);
// //     return null;
// //   }
// // };

// // const osJson = async (url) => {
// //   const token = await getToken();
// //   const response = await fetch(url, { headers: { "X-Auth-Token": token, "Accept": "application/json" } });
// //   return response.json();
// // };

// // /* =========================
// //    CLOUD SUMMARY & INFRASTRUCTURE
// //    ========================= */
// // app.get("/api/openstack/cloud-summary", async (req, res) => {
// //   try {
// //     const [servers, networks, routers] = await Promise.all([
// //       osJson(`${NOVA_URL}/servers/detail`),
// //       osJson(`${NEUTRON_URL}/networks`),
// //       osJson(`${NEUTRON_URL}/routers`)
// //     ]);

// //     res.json({
// //       stats: [
// //         { title: "Instances", value: (servers.servers || []).length, icon: "🖥️" },
// //         { title: "Logical Switches", value: (networks.networks || []).length, icon: "🌐" },
// //         { title: "Routers", value: (routers.routers || []).length, icon: "📡" }
// //       ],
// //       virtualMachines: (servers.servers || []).map(s => ({ id: s.id, name: s.name, status: s.status, ip: "Syncing..." })),
// //       infrastructureStatus: {
// //         neutronApi: { status: "Healthy", health: 95 },
// //         ovsBridges: { status: "Operational", health: 90 }
// //       }
// //     });
// //   } catch (error) {
// //     res.status(500).json({ error: "OpenStack Sync Failed" });
// //   }
// // });

// // /* ==========================================
// //    SDN TLS CONFIGURATION
// //    ========================================== */
// // app.post("/api/tls/toggle", async (req, res) => {
// //   const { controller, enable } = req.body;
// //   try {
// //     if (controller === "odl") await updateOdlTlsConfig(enable);
// //     else await updateOnosTlsConfig(enable);
// //     res.json({ success: true, message: `TLS updated for ${controller}` });
// //   } catch (error) {
// //     res.status(500).json({ error: "TLS switch failed" });
// //   }
// // });

// // /* ==========================================
// //    BOOTSTRAP & DAEMON START
// //    ========================================== */
// // const bootstrap = async () => {
// //   console.log("--- 🛡️  LINK-GUARD UNIVERSAL GATEWAY INITIALIZING ---");
  
// //   // Start the background telemetry poller (Syncs ODL data to UI via Socket.io)
// //   startPolling(app);

// //   server.listen(port, '0.0.0.0', () => {
// //     console.log(`\n✅ Backend successfully listening on Port ${port}`);
// //     console.log(`✅ Socket.io WebSocket engine: ACTIVE`);
// //     console.log(`✅ OpenStack Service Discovery: READY`);
// //   });
// // };

// // bootstrap();

import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { execFile, exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { Server } from "socket.io";

import linkguardRouter, { startPolling, onosClient } from "./linkguard.js";
import { updateOdlTlsConfig, updateOnosTlsConfig } from "./tlsOrchestrator.js";
import { registerDigestJobs } from "./digest.js";

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS matching frontend
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});
const port = process.env.PORT || 5000;

const KEYSTONE_URL = process.env.KEYSTONE_URL;
let NEUTRON_URL = process.env.NEUTRON_URL;
let NOVA_URL = process.env.NOVA_URL;
let GLANCE_URL = process.env.GLANCE_URL;

const OS_USERNAME = process.env.OS_USERNAME || "admin";
const OS_PASSWORD = process.env.OS_PASSWORD || "secret";
const OS_PROJECT_NAME = process.env.OS_PROJECT_NAME || "admin";
const OS_USER_DOMAIN_NAME = process.env.OS_USER_DOMAIN_NAME || "default";
const OS_PROJECT_DOMAIN_NAME = process.env.OS_PROJECT_DOMAIN_NAME || "default";

let tokenCache = {
  token: null,
  expiresAt: 0,
};

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

app.use(bodyParser.json());

// Attach Socket.io instance to app so routers can emit events
app.set("io", io);

// Mount LinkGuard Security Routes
app.use("/api/security", linkguardRouter);

// Original node inventory endpoint
app.get("/api/nodes", (req, res) => {
  res.json({
    nodes: [
      { id: 1, name: "Node1" },
      { id: 2, name: "Node2" },
    ],
  });
});

/* =========================
   HELPERS
   ========================= */
const normalizeProtocol = (protocol) => {
  if (!protocol) return "icmp";
  return protocol.toLowerCase();
};

function resolvePortablePath(rawPath) {
  if (!rawPath) return "";
  const systemUser = process.env.VM_USER || os.userInfo().username;
  return rawPath
    .replace(/\${VM_USER}/g, systemUser)
    .replace(/\$VM_USER/g, systemUser)
    .replace(/^~/, os.homedir());
}

/* =========================
   TOKEN MANAGEMENT
   ========================= */
const getToken = async () => {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 30000) {
    return tokenCache.token;
  }

  try {
    const response = await fetch(`${KEYSTONE_URL}/auth/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        auth: {
          identity: {
            methods: ["password"],
            password: {
              user: {
                name: OS_USERNAME,
                password: OS_PASSWORD,
                domain: { name: OS_USER_DOMAIN_NAME },
              },
            },
          },
          scope: {
            project: {
              name: OS_PROJECT_NAME,
              domain: { name: OS_PROJECT_DOMAIN_NAME },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Keystone token request failed ${response.status}: ${text}`);
    }

    const token = response.headers.get("x-subject-token");
    const payload = await response.json();
    const expiresAt = Date.parse(payload.token.expires_at);

    // Dynamic service discovery
    const catalog = payload.token.catalog;
    if (catalog) {
      const keystoneUrlObj = new URL(KEYSTONE_URL);
      const keystoneHost = keystoneUrlObj.hostname;
      const isLocalKeystone = keystoneHost === "127.0.0.1" || keystoneHost === "localhost";

      const getUrl = (type) => {
        const service = catalog.find((s) => s.type === type);
        if (service && service.endpoints && service.endpoints.length > 0) {
          const endpoint =
            service.endpoints.find((e) => e.interface === "public") || service.endpoints[0];
          let serviceUrl = endpoint.url;

          if (isLocalKeystone) {
            try {
              const urlObj = new URL(serviceUrl);
              urlObj.hostname = keystoneHost;
              serviceUrl = urlObj.toString();
            } catch (e) {}
          }
          return serviceUrl;
        }
        return null;
      };

      let nova = getUrl("compute");
      if (nova) NOVA_URL = nova;

      let neutron = getUrl("network");
      if (neutron)
        NEUTRON_URL = neutron.includes("/v2.0") ? neutron : `${neutron.replace(/\/$/, "")}/v2.0`;

      let glance = getUrl("image");
      if (glance) GLANCE_URL = glance.includes("/v2") ? glance : `${glance.replace(/\/$/, "")}/v2`;
    }

    tokenCache = { token, expiresAt };
    return token;
  } catch (err) {
    console.warn("OpenStack Keystone discovery skipped/unreachable:", err.message);
    return null;
  }
};

const osFetch = async (url, options = {}) => {
  const token = await getToken();
  const headers = {
    Accept: "application/json",
    "X-Auth-Token": token,
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
};

const osJson = async (url, options = {}) => {
  const response = await osFetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenStack request failed ${response.status}: ${text}`);
  }
  return response.json();
};

/* =========================
   OPENSTACK CLOUD SUMMARY
   ========================= */
app.get("/api/openstack/cloud-summary", async (req, res) => {
  try {
    const [serversData, networksData, routersData, portsData] = await Promise.all([
      osJson(`${NOVA_URL}/servers/detail`),
      osJson(`${NEUTRON_URL}/networks`),
      osJson(`${NEUTRON_URL}/routers`),
      osJson(`${NEUTRON_URL}/ports`),
    ]);

    const servers = serversData.servers || [];
    const networks = networksData.networks || [];
    const routers = routersData.routers || [];
    const ports = portsData.ports || [];

    let subnets = [];
    try {
      const subnetData = await osJson(`${NEUTRON_URL}/subnets`);
      subnets = subnetData.subnets || [];
    } catch (_) {}

    const subnetMap = {};
    subnets.forEach((s) => {
      subnetMap[s.id] = s;
    });

    const portByServer = {};
    ports.forEach((port) => {
      if (port.device_owner === "compute:nova" && port.device_id) {
        if (!portByServer[port.device_id]) {
          portByServer[port.device_id] = port;
        }
      }
    });

    const virtualMachines = servers.map((server) => {
      const port = portByServer[server.id];
      const fixedIp = port?.fixed_ips?.[0];
      const ipAddr =
        fixedIp?.ip_address || Object.values(server.addresses || {})?.[0]?.[0]?.addr || "N/A";
      const networkName = Object.keys(server.addresses || {})?.[0] || port?.network_id || "N/A";

      return {
        id: server.id,
        name: server.name,
        status: server.status,
        ip: ipAddr,
        network: networkName,
        zone: server["OS-EXT-AZ:availability_zone"] || "nova",
        logicalPort: port?.id || null,
        logicalSwitch: port ? `neutron-${port.network_id}` : null,
      };
    });

    const tunnelNetworks = networks.filter(
      (n) => n.provider_network_type === "vxlan" || n.provider_network_type === "geneve"
    );

    const stats = [
      {
        title: "Active Instances",
        value: servers.filter((s) => s.status === "ACTIVE").length,
        icon: "🖥️",
      },
      { title: "OVN Logical Switches", value: networks.length, icon: "🌐" },
      { title: "Routers", value: routers.length, icon: "📡" },
      {
        title: "VXLAN/Geneve Tunnels",
        value: tunnelNetworks.length || networks.length,
        icon: "🔗",
      },
    ];

    const ovnNetworks = networks.map((net) => {
      const subnetId = net.subnets?.[0];
      const subnet = subnetId ? subnetMap[subnetId] : null;
      const segId = net.provider_segmentation_id;
      const netType = (net.provider_network_type || "vxlan").toUpperCase();

      return {
        name: net.name,
        type: "OVN Logical Switch",
        cidr: subnet?.cidr || "N/A",
        segmentation: segId ? `${netType}-${segId}` : netType,
        status: net.admin_state_up ? "ACTIVE" : "DOWN",
        id: net.id,
      };
    });

    const infrastructureStatus = await checkInfrastructureStatus();

    let securityRules = [];
    try {
      const sgData = await osJson(`${NEUTRON_URL}/security-group-rules?limit=20`);
      securityRules = (sgData.security_group_rules || []).slice(0, 10).map((r) => ({
        id: r.id,
        protocol: r.protocol || "any",
        port: r.port_range_min ? `${r.port_range_min}-${r.port_range_max}` : "any",
        direction: r.direction,
        action: "ALLOW",
      }));
    } catch (_) {}

    res.json({
      stats,
      virtualMachines,
      networks: ovnNetworks,
      routers,
      ports,
      flows: [],
      securityRules,
      infrastructureStatus,
    });
  } catch (error) {
    res.status(500).json({
      error: "OpenStack unreachable",
      details: error.message,
      stats: [],
      virtualMachines: [],
      networks: [],
      flows: [],
      securityRules: [],
    });
  }
});

/* =========================
   INFRASTRUCTURE HEALTH CHECK
   ========================= */
async function checkInfrastructureStatus() {
  const status = {
    ovnNbDb: { status: "Unknown", health: 0 },
    ovnSbDb: { status: "Unknown", health: 0 },
    neutronApi: { status: "Unknown", health: 0 },
    ovsBridges: { status: "Unknown", health: 0 },
  };

  try {
    await osJson(`${NEUTRON_URL}/networks?limit=1`);
    status.neutronApi = { status: "Healthy", health: 90 };
  } catch (_) {
    status.neutronApi = { status: "Unreachable", health: 0 };
  }

  await new Promise((resolve) => {
    execFile("sudo", ["ovn-nbctl", "show"], { timeout: 5000 }, (error) => {
      if (!error) {
        status.ovnNbDb = { status: "Healthy", health: 95 };
        status.ovnSbDb = { status: "Connected", health: 88 };
        status.ovsBridges = { status: "Operational", health: 92 };
      } else {
        status.ovnNbDb = { status: "Not Available", health: 20 };
        status.ovnSbDb = { status: "Not Available", health: 20 };
        status.ovsBridges = { status: "Not Available", health: 20 };
      }
      resolve();
    });
  });

  return status;
}

/* ==========================================
   SDN TLS CONFIGURATION ROUTES (ODL & ONOS)
   ========================================== */

app.get("/api/tls/status", async (req, res) => {
  const { controller } = req.query;
  if (!controller) {
    return res.status(400).json({ error: "Controller parameter is required (odl or onos)." });
  }

  const target = controller.toLowerCase();

  try {
    if (target === "odl") {
      const vmUser = process.env.VM_USER || os.userInfo().username;
      const rawEtcPath = process.env.ODL_ETC_PATH || `/home/${vmUser}/karaf-0.23.0/etc`;
      const odlEtcPath = resolvePortablePath(rawEtcPath);
      const ofPluginPath = path.join(odlEtcPath, "org.opendaylight.openflowplugin.cfg");

      if (fs.existsSync(ofPluginPath)) {
        const content = fs.readFileSync(ofPluginPath, "utf8");
        const isEnabled =
          content.includes("use-transport-tls=true") || content.includes("transport-protocol=TLS");
        return res.json({ isEnabled });
      }
      return res.json({ isEnabled: false });
    } else if (target === "onos") {
      const containerName = process.env.ONOS_CONTAINER_NAME || "onos-2.7";
      const internalEtc = process.env.ONOS_INTERNAL_ETC || "/root/onos/apache-karaf-4.2.9/etc";
      const ofFileName = "org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg";
      const logFile = path.posix.join(internalEtc, "..", "data", "log", "karaf.log");

      // Prefer the mode ONOS is really running in (last TlsParams line in karaf.log)
      const logCmd = `docker exec ${containerName} sh -c "grep -o 'TlsParams{tlsMode=[a-z]*' ${logFile} | tail -1"`;
      exec(logCmd, (logErr, logOut) => {
        const m = (logOut || "").match(/tlsMode=(\w+)/);
        if (!logErr && m) {
          return res.json({ isEnabled: m[1] !== "disabled" });
        }
        // Fallback: read the cfg file
        const checkCommand = `docker exec ${containerName} cat ${internalEtc}/${ofFileName}`;
        exec(checkCommand, (error, stdout) => {
          if (error || !stdout) return res.json({ isEnabled: false });
          return res.json({ isEnabled: /tlsMode\s*=\s*(strict|enabled)/.test(stdout) });
        });
      });
    } else {
      return res.status(400).json({ error: "Unsupported controller. Choose 'odl' or 'onos'." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to read configuration status.", details: error.message });
  }
});

// ONOS can take 2-3 minutes (container restart), which browsers/proxies drop as a
// "Network Error". So ONOS toggles run as a background job the UI polls for the result.
const tlsJobs = {}; // controller -> { state: "running"|"done"|"error", enable, message, startedAt }

app.post("/api/tls/toggle", async (req, res) => {
  const { controller, enable } = req.body;
  if (!controller || typeof enable !== "boolean") {
    return res
      .status(400)
      .json({ error: "Invalid request. 'controller' and boolean 'enable' required." });
  }

  const target = controller.toLowerCase();

  try {
    if (target === "odl") {
      await updateOdlTlsConfig(enable);
      return res.json({
        success: true,
        message: `ODL Southbound TLS is now ${enable ? "ENABLED" : "DISABLED"}`,
      });
    } else if (target === "onos") {
      if (tlsJobs.onos?.state === "running") {
        return res.status(202).json({ success: true, pending: true, message: "ONOS update already running." });
      }
      tlsJobs.onos = { state: "running", enable, message: "", startedAt: Date.now() };
      updateOnosTlsConfig(enable)
        .then(() => {
          tlsJobs.onos = {
            ...tlsJobs.onos,
            state: "done",
            message: `ONOS Southbound TLS is now ${enable ? "ENABLED (Strict)" : "DISABLED"}`,
          };
        })
        .catch((err) => {
          console.error("[TLS Toggle Error]", err.message);
          tlsJobs.onos = { ...tlsJobs.onos, state: "error", message: err.message };
        });
      return res.status(202).json({ success: true, pending: true });
    } else {
      return res.status(400).json({ error: "TLS orchestration is only supported for ODL or ONOS." });
    }
  } catch (error) {
    console.error("[TLS Toggle Error]", error.message);
    res
      .status(500)
      .json({ error: "Failed to update controller configuration.", details: error.message });
  }
});

app.get("/api/tls/job", (req, res) => {
  const target = String(req.query.controller || "").toLowerCase();
  res.json(tlsJobs[target] || { state: "idle" });
});

/* =========================
   BOOTSTRAP & SERVER START
   ========================= */
const bootstrap = async () => {
  console.log("--- BEGINNING LEARNING PHASE (SERVICE DISCOVERY) ---");
  await getToken();

  // Start Background Pollers for LinkGuard
  startPolling(server);

  // Start Digest Cron Scheduler
  registerDigestJobs(onosClient);

  server.listen(port, () => {
    console.log(`\nDashboard backend + Sockets + Cron scheduler listening on Port ${port}`);
  });
};

bootstrap();