// import dotenv from "dotenv";
// dotenv.config();
// import express from "express";
// import cors from "cors";
// import bodyParser from "body-parser";
// import { execFile } from "child_process";

// const app = express();
// const port = 5000;

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
//   })
// );

// app.use(bodyParser.json());

// // Insa-dluxf original node endpoint
// app.get("/api/nodes", (req, res) => {
//   res.json({
//     nodes: [
//       { id: 1, name: "Node1" },
//       { id: 2, name: "Node2" },
//     ],
//   });
// });

// /* =========================
//    HELPER: NORMALIZE PROTOCOL (NO CRASH FOR ICMP)
//    ========================= */
// const normalizeProtocol = (protocol) => {
//   if (!protocol) return "icmp";
//   return protocol.toLowerCase();
// };

// /* Removed hardcoded resolveLogicalSwitch - now using dynamic findNetwork */

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

//   // -- DYNAMIC SERVICE DISCOVERY (LEARNING PHASE) --
//   const catalog = payload.token.catalog;
//   if (catalog) {
//     const keystoneUrlObj = new URL(KEYSTONE_URL);
//     const keystoneHost = keystoneUrlObj.hostname;
//     const isLocalKeystone = keystoneHost === '127.0.0.1' || keystoneHost === 'localhost';

//     const getUrl = (type) => {
//       const service = catalog.find((s) => s.type === type);
//       if (service && service.endpoints && service.endpoints.length > 0) {
//         // Prefer public interface, fallback to whatever is available
//         const endpoint = service.endpoints.find((e) => e.interface === "public") || service.endpoints[0];
//         let serviceUrl = endpoint.url;

//         // If we are accessing Keystone locally (e.g. via port forwarding/tunneling),
//         // OpenStack will likely still return its internal network IP (e.g., 172.x.x.x)
//         // We must rewrite the hostname to match our local Keystone host to maintain connectivity.
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
//   // ------------------------------------------------

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

// /* =========================
//    FIX: DEFINE findServerByName — WAS MISSING, CAUSING ReferenceError CRASH
//    ========================= */
// async function findServerByName(name) {
//   const data = await osJson(`${NOVA_URL}/servers?name=${encodeURIComponent(name)}`);
//   const servers = data.servers || [];
//   if (servers.length === 0) {
//     throw new Error(`Server not found: ${name}`);
//   }
//   // Get full server details to access security groups
//   const detail = await osJson(`${NOVA_URL}/servers/${servers[0].id}`);
//   return detail.server;
// }

// /* =========================
//    FIX: DEFINE findNetwork — WAS MISSING, CAUSING ReferenceError CRASH
//    ========================= */
// async function findNetwork(nameOrId) {
//   const data = await osJson(
//     `${NEUTRON_URL}/networks?name=${encodeURIComponent(nameOrId)}`
//   );
//   const networks = data.networks || [];
//   if (networks.length === 0) {
//     throw new Error(`Network not found: ${nameOrId}`);
//   }
//   const net = networks[0];
//   // Get subnet CIDR
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

// /* =========================
//    FIX: ADD MISSING /api/openstack/cloud-summary ENDPOINT
//    Cloud.jsx line 59 calls this — it was COMPLETELY MISSING from server.js
//    ========================= */
// app.get("/api/openstack/cloud-summary", async (req, res) => {
//   try {
//     const token = await getToken();

//     // Fetch servers (VMs) from Nova
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

//     // Get subnets for CIDR info
//     let subnets = [];
//     try {
//       const subnetData = await osJson(`${NEUTRON_URL}/subnets`);
//       subnets = subnetData.subnets || [];
//     } catch (_) { }

//     // Map subnet id -> cidr
//     const subnetMap = {};
//     subnets.forEach((s) => {
//       subnetMap[s.id] = s;
//     });

//     // Build port map: server_id -> port info
//     const portByServer = {};
//     ports.forEach((port) => {
//       if (port.device_owner === "compute:nova" && port.device_id) {
//         if (!portByServer[port.device_id]) {
//           portByServer[port.device_id] = port;
//         }
//       }
//     });

//     // Build virtualMachines list matching what Cloud.jsx expects
//     const virtualMachines = servers.map((server) => {
//       const port = portByServer[server.id];
//       const fixedIp = port?.fixed_ips?.[0];
//       const ipAddr = fixedIp?.ip_address || Object.values(server.addresses || {})?.[0]?.[0]?.addr || "N/A";
//       const networkName = Object.keys(server.addresses || {})?.[0] || port?.network_id || "N/A";
//       const subnetInfo = fixedIp ? subnetMap[fixedIp.subnet_id] : null;

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

//     // Count tunnels (VXLAN/Geneve) from network segmentation
//     const tunnelNetworks = networks.filter(
//       (n) => n.provider_network_type === "vxlan" || n.provider_network_type === "geneve"
//     );

//     // Build stats for the dashboard cards
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

//     // Build OVN networks for Cloud.jsx OVN Networks panel
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

//     // Infrastructure status — check OVN/OVS health via ovn-nbctl
//     const infrastructureStatus = await checkInfrastructureStatus();

//     // Security rules — fetch existing security group rules
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
//       flows: [], // Live flows come from OVN southbound; placeholder for now
//       securityRules,
//       infrastructureStatus,
//     });
//   } catch (error) {
//     console.error("Cloud summary error:", error.message);

//     // Return a descriptive error — not a crash
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

// /* =========================
//    HELPER: CHECK OVN/OVS INFRASTRUCTURE STATUS
//    ========================= */
// async function checkInfrastructureStatus() {
//   const status = {
//     ovnNbDb: { status: "Unknown", health: 0 },
//     ovnSbDb: { status: "Unknown", health: 0 },
//     neutronApi: { status: "Unknown", health: 0 },
//     ovsBridges: { status: "Unknown", health: 0 },
//   };

//   // Check Neutron API
//   try {
//     await osJson(`${NEUTRON_URL}/networks?limit=1`);
//     status.neutronApi = { status: "Healthy", health: 90 };
//   } catch (_) {
//     status.neutronApi = { status: "Unreachable", health: 0 };
//   }

//   // Check OVN Northbound DB
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

// /* =========================
//    FIX: SECURITY RULE CREATION (ICMP SAFE + findServerByName/findNetwork NOW DEFINED)
//    ========================= */
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
//       // Create BOTH IPv4 and IPv6 ICMP rules to support NAT64/IPv6 instances
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
//           // Use ::/0 for IPv6 if the provided CIDR was IPv4
//           remote_ip_prefix: cidr.includes(":") ? cidr : "::/0",
//         },
//       });
//     } else {
//       // TCP / UDP
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
//           // If the rule already exists, OpenStack throws a 409 Conflict.
//           // We can safely ignore this and pretend it succeeded.
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

// /* =========================
//    FIX: ACL LIST (OVN switch name resolution)
//    ========================= */
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

//     // If no ACLs on the switch directly, query all ACLs (as OpenStack uses Port Groups)
//     if (acls.length === 0) {
//       execFile("sudo", ["-n", "ovn-nbctl", "list", "acl"], (err2, stdout2) => {
//         if (!err2 && stdout2) {
//           acls = stdout2
//             .split("\n")
//             .filter((line) => line.includes("match") || line.includes("action") || line.includes("direction"))
//             .map((line) => line.trim())
//             .slice(0, 15); // limit output to keep it readable

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

// /* =========================
//    FIX: ADD MISSING /api/openstack/create-vm ENDPOINT
//    ========================= */
// app.post("/api/openstack/create-vm", async (req, res) => {
//   const { name, flavor, image, network } = req.body;

//   if (!name || !flavor || !image || !network) {
//     return res.status(400).json({ error: "name, flavor, image, and network are required." });
//   }

//   try {
//     // Resolve flavor ID
//     const flavorsData = await osJson(`${NOVA_URL}/flavors`);
//     const flavorObj = (flavorsData.flavors || []).find(
//       (f) => f.name === flavor || f.id === flavor
//     );
//     if (!flavorObj) {
//       return res.status(400).json({ error: `Flavor not found: ${flavor}` });
//     }

//     // Resolve image ID
//     const imagesData = await osJson(`${GLANCE_URL}/images?name=${encodeURIComponent(image)}`);
//     const imageObj = (imagesData.images || [])[0];
//     if (!imageObj) {
//       return res.status(400).json({ error: `Image not found: ${image}` });
//     }

//     // Resolve network ID
//     const networksData = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`);
//     const networkObj = (networksData.networks || [])[0];
//     if (!networkObj) {
//       return res.status(400).json({ error: `Network not found: ${network}` });
//     }

//     // Create the server
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

// /* =========================
//    FIX: ADD MISSING /api/openstack/create-network ENDPOINT
//    ========================= */
// app.post("/api/openstack/create-network", async (req, res) => {
//   const { name, cidr, segmentation } = req.body;

//   if (!name || !cidr) {
//     return res.status(400).json({ error: "name and cidr are required." });
//   }

//   try {
//     // Create network (let Neutron auto-assign type based on tenant config)
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

//     // Create subnet
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

// /* =========================
//    FIX: ADD MISSING /api/openstack/launch-instance ENDPOINT
//    (Same as create-vm but named differently for the Launch Instance modal)
//    ========================= */
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

// const bootstrap = async () => {
//   console.log("--- BEGINNING LEARNING PHASE (SERVICE DISCOVERY) ---");
//   try {
//     // Calling getToken forces the backend to query Keystone and learn the dynamic IPs
//     await getToken();
//     console.log("--- LEARNING PHASE COMPLETE: STARTING APIS ---");
//     console.log(`LEARNED IP ADDRESSES:`);
//     console.log(`  Keystone (Registry): ${KEYSTONE_URL}`);
//     console.log(`  Neutron  (Network):  ${NEUTRON_URL}`);
//     console.log(`  Nova     (Compute):  ${NOVA_URL}`);
//     console.log(`  Glance   (Image):    ${GLANCE_URL}`);
//   } catch (error) {
//     console.error("Warning: Failed to learn OpenStack environment addresses at startup:", error.message);
//     console.error("The backend will still start, but OpenStack API calls may fail until Keystone is reachable.");
//   }

//   app.listen(port, () => {
//     console.log(`\nDashboard backend is now listening on Port ${port}`);
//   });
// };

// bootstrap();






















































// import dotenv from "dotenv";
// dotenv.config();
// import express from "express";
// import cors from "cors";
// import bodyParser from "body-parser";
// import { execFile } from "child_process";

// const app = express();
// const port = process.env.PORT || 5050; // This tells it to check .env or use 5050

// const KEYSTONE_URL = process.env.KEYSTONE_URL;
// let NEUTRON_URL = process.env.NEUTRON_URL;
// let NOVA_URL = process.env.NOVA_URL;
// let GLANCE_URL = process.env.GLANCE_URL;

// const OS_USERNAME = process.env.OS_USERNAME || "admin";
// const OS_PASSWORD = process.env.OS_PASSWORD || "secret";
// const OS_PROJECT_NAME = process.env.OS_PROJECT_NAME || "admin";
// const OS_USER_DOMAIN_NAME = process.env.OS_USER_DOMAIN_NAME || "default";
// const OS_PROJECT_DOMAIN_NAME = process.env.OS_PROJECT_DOMAIN_NAME || "default";

// // OpenDaylight Configuration
// const ODL_BASE_URL = process.env.ODL_URL || "http://127.0.0.1:8181/rests/data";
// const ODL_AUTH = "Basic " + Buffer.from("admin:admin").toString("base64");

// let tokenCache = {
//   token: null,
//   expiresAt: 0,
// };

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     methods: "GET,POST",
//     allowedHeaders: "Content-Type, Authorization",
//   })
// );

// app.use(bodyParser.json());

// /* =========================================================
//    OPENDAYLIGHT (ODL) RESTCONF INTEGRATION FOR MININET TOPOLOGY
//    ========================================================= */

// // Dynamic topology endpoint fetching from OpenDaylight
// app.get("/api/odl/topology", async (req, res) => {
//   try {
//     const [topoRes, inventoryRes] = await Promise.all([
//       fetch(`${ODL_BASE_URL}/network-topology:network-topology`, {
//         headers: { Authorization: ODL_AUTH, Accept: "application/json" },
//       }),
//       fetch(`${ODL_BASE_URL}/opendaylight-inventory:nodes`, {
//         headers: { Authorization: ODL_AUTH, Accept: "application/json" },
//       }).catch(() => null),
//     ]);

//     if (!topoRes.ok) {
//       throw new Error(`ODL RESTCONF responded with status ${topoRes.status}`);
//     }

//     const topoData = await topoRes.json();
//     const inventoryData = inventoryRes && inventoryRes.ok ? await inventoryRes.json() : null;

//     const rawNodes = topoData["network-topology:network-topology"]?.topology?.[0]?.node || [];
//     const inventoryNodes = inventoryData?.["opendaylight-inventory:nodes"]?.node || [];

//     // Build map of inventory physical connectors
//     const nodeConnectorMap = {};
//     inventoryNodes.forEach((invNode) => {
//       const connectors = invNode["node-connector"] || [];
//       nodeConnectorMap[invNode.id] = connectors.map((c) => c.id);
//     });

//     const parsedDevices = rawNodes.map((node) => {
//       const nodeId = node["node-id"];

//       const physicalPorts =
//         nodeConnectorMap[nodeId] ||
//         (node["termination-point"] || []).map((tp) => tp["tp-id"]);

//       // Check if node has non-LOCAL active ports (e.g., sX-eth1)
//       const realPorts = physicalPorts.filter((p) => !p.endsWith(":LOCAL"));
//       const isUp = realPorts.length > 0;

//       const switchNum = nodeId.replace("openflow:", "");
//       return {
//         id: nodeId,
//         type: "Switch",
//         status: isUp ? "UP" : "DOWN",
//         ports: realPorts.length > 0 ? realPorts.join(", ") : `s${switchNum}`,
//       };
//     });

//     res.json({
//       success: true,
//       devices: parsedDevices,
//       rawTopology: topoData,
//     });
//   } catch (error) {
//     console.error("ODL Topology Fetch Error:", error.message);
//     res.status(500).json({
//       error: "Failed to fetch OpenDaylight topology",
//       details: error.message,
//     });
//   }
// });

// // Live /api/nodes endpoint feeding the Devices view
// app.get("/api/nodes", async (req, res) => {
//   try {
//     const topoRes = await fetch(`${ODL_BASE_URL}/network-topology:network-topology`, {
//       headers: { Authorization: ODL_AUTH, Accept: "application/json" },
//     });

//     if (!topoRes.ok) {
//       return res.json({ nodes: [] });
//     }

//     const topoData = await topoRes.json();
//     const rawNodes = topoData["network-topology:network-topology"]?.topology?.[0]?.node || [];

//     const nodes = rawNodes.map((node) => {
//       const nodeId = node["node-id"];
//       const tps = node["termination-point"] || [];
//       const realPorts = tps.filter((tp) => !tp["tp-id"].endsWith(":LOCAL"));
//       const switchNum = nodeId.replace("openflow:", "");

//       return {
//         id: nodeId,
//         name: `Switch ${switchNum}`,
//         type: "Switch",
//         status: realPorts.length > 0 ? "UP" : "DOWN",
//         ports: realPorts.length > 0 ? realPorts.map(p => p["tp-id"]).join(", ") : `s${switchNum}`,
//       };
//     });

//     res.json({ nodes });
//   } catch (err) {
//     res.json({ nodes: [] });
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

//   const catalog = payload.token.catalog;
//   if (catalog) {
//     const keystoneUrlObj = new URL(KEYSTONE_URL);
//     const keystoneHost = keystoneUrlObj.hostname;
//     const isLocalKeystone = keystoneHost === "127.0.0.1" || keystoneHost === "localhost";

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
//     if (neutron) NEUTRON_URL = neutron.includes("/v2.0") ? neutron : `${neutron.replace(/\/$/, "")}/v2.0`;

//     let glance = getUrl("image");
//     if (glance) GLANCE_URL = glance.includes("/v2") ? glance : `${glance.replace(/\/$/, "")}/v2`;
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
//   const data = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(nameOrId)}`);
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
//     } catch (_) {}

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
//     } catch (_) {}

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
//   const { name, cidr } = req.body;

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

// const bootstrap = async () => {
//   console.log("--- BEGINNING LEARNING PHASE (SERVICE DISCOVERY) ---");
//   try {
//     await getToken();
//     console.log("--- LEARNING PHASE COMPLETE: STARTING APIS ---");
//     console.log(`LEARNED IP ADDRESSES:`);
//     console.log(`  Keystone (Registry): ${KEYSTONE_URL}`);
//     console.log(`  Neutron  (Network):  ${NEUTRON_URL}`);
//     console.log(`  Nova     (Compute):  ${NOVA_URL}`);
//     console.log(`  Glance   (Image):    ${GLANCE_URL}`);
//   } catch (error) {
//     console.error("Warning: Failed to learn OpenStack environment addresses at startup:", error.message);
//   }

//   app.listen(port, () => {
//     console.log(`\nDashboard backend is now listening on Port ${port}`);
//   });
// };

// bootstrap();















import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { execFile } from "child_process";
import { promisify } from "util";
import https from "node:https";
import fs from "node:fs";
import { DSCP_LOW_LATENCY, QUEUE_LOW_LATENCY } from "./src/utils/qosConstants.js";
import onosRouter from "./src/server/onosRouter.js";
import linkguardRouter from "./linkguard.js";

const pExecFile = promisify(execFile);
const app = express();
const port = process.env.PORT || 5050;

const KEYSTONE_URL = process.env.KEYSTONE_URL;
let NEUTRON_URL = process.env.NEUTRON_URL;
let NOVA_URL = process.env.NOVA_URL;
let GLANCE_URL = process.env.GLANCE_URL;

const OS_USERNAME = process.env.OS_USERNAME || "admin";
const OS_PASSWORD = process.env.OS_PASSWORD || "secret";
const OS_PROJECT_NAME = process.env.OS_PROJECT_NAME || "admin";
const OS_USER_DOMAIN_NAME = process.env.OS_USER_DOMAIN_NAME || "default";
const OS_PROJECT_DOMAIN_NAME = process.env.OS_PROJECT_DOMAIN_NAME || "default";

// OpenDaylight Configuration
// Northbound RESTCONF over TLS — ODL's Jetty connector on 8443 serves a
// self-signed cert (etc/odl-tls-keystore.jks in the Karaf install); trusting
// it requires the process to be started with
// NODE_EXTRA_CA_CERTS=./odl-tls-cert.pem (wired into the "server" npm script)
// since Node's fetch/TLS trust store is fixed at process start, not editable
// at runtime.
const ODL_BASE_URL = process.env.ODL_URL || "https://127.0.0.1:8443/rests/data";
const ODL_AUTH = "Basic " + Buffer.from("admin:admin").toString("base64");

// ONOS Configuration
const ONOS_HOST = process.env.ONOS_HOST || "localhost";
const ONOS_PORT = process.env.ONOS_PORT || "8183";
const ONOS_BASE_URL = `http://${ONOS_HOST}:${ONOS_PORT}/onos/v1`;
const ONOS_AUTH = "Basic " + Buffer.from(
  `${process.env.ONOS_USERNAME || "onos"}:${process.env.ONOS_PASSWORD || "rocks"}`
).toString("base64");

// Gemini (AI Intent Engine) — server-side only, same reason as ODL_AUTH/
// ONOS_AUTH: the key must never reach the browser bundle. If unset, the
// /api/intent/compile route below returns a clear 503 and the frontend
// falls back to the existing offline heuristic parser automatically.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

let tokenCache = {
  token: null,
  expiresAt: 0,
};

// =========================================================
// Allow all origins to fix the CORS error
// =========================================================
app.use(cors());
app.use(bodyParser.json());

/* Modular ONOS & Security Routers */
app.use("/api/onos", onosRouter);
app.use("/api/onos-service", onosRouter);
app.use("/api/security", linkguardRouter);

/* =========================================================
   TLS STATUS — genuine handshake introspection, not a config echo.
   Uses https.request (not fetch) so we can read the negotiated protocol/
   cipher/cert straight off the real TLS socket. authorized === true only
   if Node itself validated the cert chain against odl-tls-cert.pem.
   ========================================================= */
app.get("/api/tls-status", (req, res) => {
  const target = new URL(ODL_BASE_URL);

  if (target.protocol !== "https:") {
    return res.json({ tls: false, scheme: target.protocol.replace(":", ""), detail: "ODL_URL is not HTTPS" });
  }

  let ca;
  try {
    ca = fs.readFileSync("./odl-tls-cert.pem");
  } catch (err) {
    return res.status(500).json({ tls: false, error: `Can't read odl-tls-cert.pem: ${err.message}` });
  }

  // maxCachedSessions: 0 forces a full handshake every call — this endpoint
  // exists to report what the handshake actually negotiated, so a resumed
  // TLS session (which skips re-sending the certificate, leaving
  // getPeerCertificate() empty) would silently give a stale/incomplete answer.
  const req2 = https.request(
    {
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}/network-topology:network-topology`,
      method: "GET",
      headers: { Authorization: ODL_AUTH, Accept: "application/json" },
      ca,
      agent: new https.Agent({ ca, maxCachedSessions: 0 }),
      timeout: 5000,
    },
    (odlRes) => {
      // Read everything off the socket up front, in this same tick — once
      // the response ends the (non-keepAlive) socket starts tearing down and
      // getProtocol()/getCipher() silently go null even though the request
      // already succeeded.
      const socket = odlRes.socket;
      const cert = socket.getPeerCertificate?.();
      const authorized = socket.authorized === true;
      const protocol = socket.getProtocol?.() || null;
      const cipher = socket.getCipher?.()?.name || null;
      odlRes.on("data", () => {}); // drain — we only need the handshake + status
      odlRes.on("end", () => {
        res.json({
          tls: true,
          authorized,
          protocol,
          cipher,
          certSubject: cert?.subject?.CN || null,
          certIssuer: cert?.issuer?.CN || null,
          certValidTo: cert?.valid_to || null,
          httpStatus: odlRes.statusCode,
        });
      });
    }
  );
  req2.on("timeout", () => req2.destroy(new Error("Timed out")));
  req2.on("error", (err) => res.status(502).json({ tls: false, error: err.message }));
  req2.end();
});

/* =========================================================
   OPENDAYLIGHT (ODL) RESTCONF INTEGRATION FOR MININET TOPOLOGY
   ========================================================= */

app.get("/api/odl/topology", async (req, res) => {
  try {
    const [topoRes, inventoryRes] = await Promise.all([
      fetch(`${ODL_BASE_URL}/network-topology:network-topology`, {
        headers: { Authorization: ODL_AUTH, Accept: "application/json" },
      }),
      fetch(`${ODL_BASE_URL}/opendaylight-inventory:nodes`, {
        headers: { Authorization: ODL_AUTH, Accept: "application/json" },
      }).catch(() => null),
    ]);

    if (!topoRes.ok) {
      throw new Error(`ODL RESTCONF responded with status ${topoRes.status}`);
    }

    const topoData = await topoRes.json();
    const inventoryData = inventoryRes && inventoryRes.ok ? await inventoryRes.json() : null;

    const rawNodes = topoData["network-topology:network-topology"]?.topology?.[0]?.node || [];
    const inventoryNodes = inventoryData?.["opendaylight-inventory:nodes"]?.node || [];

    const nodeConnectorMap = {};
    inventoryNodes.forEach((invNode) => {
      const connectors = invNode["node-connector"] || [];
      nodeConnectorMap[invNode.id] = connectors.map((c) => c.id);
    });

    const parsedDevices = rawNodes.map((node) => {
      const nodeId = node["node-id"];

      const physicalPorts =
        nodeConnectorMap[nodeId] ||
        (node["termination-point"] || []).map((tp) => tp["tp-id"]);

      const realPorts = physicalPorts.filter((p) => !p.endsWith(":LOCAL"));
      const isUp = realPorts.length > 0;

      const switchNum = nodeId.replace("openflow:", "");
      return {
        id: nodeId,
        type: "Switch",
        status: isUp ? "UP" : "DOWN",
        ports: realPorts.length > 0 ? realPorts.join(", ") : `s${switchNum}`,
      };
    });

    res.json({
      success: true,
      devices: parsedDevices,
      rawTopology: topoData,
    });
  } catch (error) {
    console.error("ODL Topology Fetch Error:", error.message);
    res.status(500).json({
      error: "Failed to fetch OpenDaylight topology",
      details: error.message,
    });
  }
});

app.get("/api/nodes", async (req, res) => {
  try {
    const topoRes = await fetch(`${ODL_BASE_URL}/network-topology:network-topology`, {
      headers: { Authorization: ODL_AUTH, Accept: "application/json" },
    });

    if (!topoRes.ok) {
      return res.json({ nodes: [] });
    }

    const topoData = await topoRes.json();
    const rawNodes = topoData["network-topology:network-topology"]?.topology?.[0]?.node || [];

    const nodes = rawNodes.map((node) => {
      const nodeId = node["node-id"];
      const tps = node["termination-point"] || [];
      const realPorts = tps.filter((tp) => !tp["tp-id"].endsWith(":LOCAL"));
      const switchNum = nodeId.replace("openflow:", "");

      return {
        id: nodeId,
        name: `Switch ${switchNum}`,
        type: "Switch",
        status: realPorts.length > 0 ? "UP" : "DOWN",
        ports: realPorts.length > 0 ? realPorts.map(p => p["tp-id"]).join(", ") : `s${switchNum}`,
      };
    });

    res.json({ nodes });
  } catch (err) {
    res.json({ nodes: [] });
  }
});

/* =========================================================
   SDN ORCHESTRATOR API ROUTES 
   ========================================================= */

app.get('/topology', async (req, res) => {
  try {
    const response = await fetch(`${ODL_BASE_URL}/network-topology:network-topology`, { headers: { Authorization: ODL_AUTH, Accept: 'application/json' }});
    res.status(response.status).json(await response.json().catch(() => ({})));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/inventory', async (req, res) => {
  try {
    const response = await fetch(`${ODL_BASE_URL}/opendaylight-inventory:nodes`, { headers: { Authorization: ODL_AUTH, Accept: 'application/json' }});
    res.status(response.status).json(await response.json().catch(() => ({})));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/stats', async (req, res) => {
  try {
    const response = await fetch(`${ODL_BASE_URL}/opendaylight-inventory:nodes`, { headers: { Authorization: ODL_AUTH, Accept: 'application/json' }});
    res.status(response.status).json(await response.json().catch(() => ({})));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/inventory/:nodeId', async (req, res) => {
  try {
    const response = await fetch(`${ODL_BASE_URL}/opendaylight-inventory:nodes/node=${encodeURIComponent(req.params.nodeId)}`, { headers: { Authorization: ODL_AUTH, Accept: 'application/json' }});
    res.status(response.status).json(await response.json().catch(() => ({})));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* =========================================================
   ONOS PROXY — same reason as the ODL routes above: keeps
   controller credentials server-side and works regardless of
   whether the browser can reach ONOS_PORT directly.
   ========================================================= */
app.get('/api/onos/:resource', async (req, res) => {
  const allowed = ['devices', 'hosts', 'links'];
  if (!allowed.includes(req.params.resource)) return res.status(404).json({ error: 'Unknown ONOS resource' });
  try {
    const response = await fetch(`${ONOS_BASE_URL}/${req.params.resource}`, {
      headers: { Authorization: ONOS_AUTH, Accept: 'application/json' },
    });
    res.status(response.status).json(await response.json().catch(() => ({})));
  } catch (err) {
    res.status(502).json({ error: `ONOS unreachable: ${err.message}` });
  }
});

/* =========================================================
   TOOLS PAGE — SCOPED CONTROLLER PROXY
   ---------------------------------------------------------
   Backs the Tools page's Custom API Request panel and its raw
   status-code connection check. Forwards {controller, method,
   path, body} to whichever controller's already-configured,
   server-side credentials — the browser never sees ODL_AUTH or
   ONOS_AUTH. Scoped hard to the two known controller base URLs:
   `path` must be a controller-relative path, never a full URL,
   so this can't be used as an open proxy to arbitrary hosts.

   Always responds 200 itself, carrying the REAL upstream status
   as a JSON field — if it forwarded that status directly, axios
   would throw on any non-2xx upstream response and the caller
   would lose the structured {status, timeMs, data} payload the
   UI needs to actually display "404" or "401" to the operator.
   ========================================================= */
const TOOLS_PROXY_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

app.post('/api/tools/proxy', async (req, res) => {
  const { controller, method, path: targetPath, body: reqBody } = req.body || {};

  if (controller !== 'odl' && controller !== 'onos') {
    return res.status(400).json({ error: 'controller must be "odl" or "onos"' });
  }
  const httpMethod = String(method || 'GET').toUpperCase();
  if (!TOOLS_PROXY_METHODS.includes(httpMethod)) {
    return res.status(400).json({ error: `Unsupported method: ${method}` });
  }
  if (typeof targetPath !== 'string' || !targetPath.startsWith('/') || targetPath.includes('://')) {
    return res.status(400).json({ error: 'path must be a controller-relative path starting with "/"' });
  }

  const base = controller === 'odl' ? ODL_BASE_URL : ONOS_BASE_URL;
  const auth = controller === 'odl' ? ODL_AUTH : ONOS_AUTH;
  const label = `${controller.toUpperCase()} ${httpMethod} ${targetPath}`;
  const start = Date.now();

  try {
    const response = await fetch(`${base}${targetPath}`, {
      method: httpMethod,
      headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: httpMethod === 'GET' || httpMethod === 'DELETE' ? undefined : JSON.stringify(reqBody ?? {}),
    });
    const timeMs = Date.now() - start;
    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    res.json({ status: response.status, statusText: response.statusText, ok: response.ok, timeMs, label, data });
  } catch (err) {
    res.json({ status: 0, statusText: 'Network Error', ok: false, timeMs: Date.now() - start, label, error: err.message });
  }
});

/* =========================================================
   AI INTENT ENGINE — Gemini-backed, grounded, with a hard fallback
   ---------------------------------------------------------
   The frontend's rule-based parser (intentParser.js) stays the
   source of truth for the response *shape* — this route asks
   Gemini to fill in the same fields, constrained to JSON output,
   and grounded with the real hosts/slices/capacity the caller
   passes in (never invented server-side) so it can't suggest a
   host or bandwidth figure that doesn't actually exist right now.
   If GEMINI_API_KEY isn't set, or the call/parse fails for any
   reason, this returns a clear error and the frontend falls back
   to the offline heuristic parser automatically — never silently
   pretends the AI path succeeded.
   ========================================================= */
app.post('/api/intent/compile', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured on the server' });
  }
  const { prompt, grounding } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const instructions = `You are an intent compiler for an SDN network-slicing dashboard. Convert the operator's request into a JSON object with EXACTLY these fields:
{
  "isSliceIntent": boolean,          // false if this request isn't about creating/isolating a network slice
  "name": string,                    // short slice name, e.g. "Hospital-Traffic"
  "isolationMode": "host" | "link",
  "hostHints": number[],             // ordinal numbers referring to "hosts" below, e.g. [1] means the 1st host in that list — NEVER invent a number outside that list's range
  "trafficType": "all" | "http" | "https" | "ssh" | "dns" | "icmp",
  "bandwidthKbps": number | null,    // null if no bandwidth cap was requested (means: block all matching traffic)
  "priority": "Low" | "Medium" | "High" | "Critical",
  "latency": "Low" | "Medium" | "High",
  "rationale": string                // one or two sentences explaining how you derived the above from the request and the grounding data
}

Ground your answer strictly in this live network state — do not reference any host, switch, or bandwidth figure that isn't listed here:
${JSON.stringify(grounding ?? {})}

Operator request: "${prompt}"

Respond with ONLY the JSON object, no other text.`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instructions }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || `Gemini request failed (${response.status})` });
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: 'Gemini returned no content (possibly blocked by safety filters)' });
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'Gemini did not return valid JSON' });
    }
    res.json({ result: parsed });
  } catch (err) {
    res.status(502).json({ error: `Gemini unreachable: ${err.message}` });
  }
});

/* =========================================================
   LOW-LATENCY QoS PROVISIONING (privileged OVS operations)
   ---------------------------------------------------------
   The browser cannot run ovs-vsctl directly, so this is the
   "smallest appropriate automation component" for it: React
   still talks to ODL RESTCONF directly for the OpenFlow side
   (DSCP match + set-queue action, via provisionSlice); this
   is only for the underlying OVS HTB queue that the switch's
   set-queue action needs to actually exist on the wire.

   Scoped strictly to the single interface passed in — never
   touches br-int or any other port on the bridge.
   ========================================================= */

// ODL's `openflow:<decimal-dpid>` and ONOS's `of:<16-hex-dpid>` name the same
// physical switch two different ways — the Tools page's Check Queue/Verify
// Slice diagnostics need to resolve either, since the switch id it's handed
// depends on whichever controller is currently active in the UI, not on
// which controller actually programmed the queue (queues are OVS state,
// invisible to either controller's REST API).
function toHexDpid(switchId) {
  if (switchId.startsWith('openflow:')) {
    const dpidDecimal = switchId.slice('openflow:'.length);
    if (!dpidDecimal) throw new Error(`Malformed switch id: ${switchId}`);
    return BigInt(dpidDecimal).toString(16).padStart(16, '0');
  }
  if (switchId.startsWith('of:')) {
    const dpidHex = switchId.slice('of:'.length);
    if (!dpidHex) throw new Error(`Malformed switch id: ${switchId}`);
    return dpidHex.toLowerCase().padStart(16, '0');
  }
  throw new Error(`Unrecognized switch id format: ${switchId}`);
}

// <dpid-format> -> the OVS bridge whose datapath-id matches, looked up live
// rather than assumed from naming conventions (this box also has a br-int
// from an unrelated OVN setup that must never be touched).
async function resolveBridgeName(switchId) {
  const targetDpid = toHexDpid(switchId);

  const { stdout } = await pExecFile('sudo', ['-n', 'ovs-vsctl', '--format=json', '--columns=name,datapath_id', 'list', 'bridge']);
  const { data, headings } = JSON.parse(stdout);
  const nameIdx = headings.indexOf('name');
  const dpidIdx = headings.indexOf('datapath_id');

  for (const row of data) {
    const dpidRaw = row[dpidIdx];
    const dpidStr = typeof dpidRaw === 'string' ? dpidRaw.replace(/^0x/i, '').padStart(16, '0').toLowerCase() : null;
    if (dpidStr === targetDpid) return row[nameIdx];
  }
  throw new Error(`No OVS bridge found for ${switchId} (dpid ${targetDpid})`);
}

// Resolves an OpenFlow (switch, port-number) pair to the concrete OVS
// interface name, by asking the bridge which of its ports carries that
// ofport number — no assumption about interface naming conventions.
async function resolveInterface(switchId, ofPort) {
  const bridge = await resolveBridgeName(switchId);
  const { stdout: portsOut } = await pExecFile('sudo', ['-n', 'ovs-vsctl', 'list-ports', bridge]);
  const candidates = portsOut.trim().split('\n').filter(Boolean);

  for (const iface of candidates) {
    try {
      const { stdout } = await pExecFile('sudo', ['-n', 'ovs-vsctl', 'get', 'interface', iface, 'ofport']);
      if (stdout.trim() === String(ofPort)) return { bridge, iface };
    } catch { /* interface disappeared mid-scan; skip it */ }
  }
  throw new Error(`No interface on bridge ${bridge} with OpenFlow port ${ofPort}`);
}

// linux-htb queues only govern EGRESS (TX) traffic on the interface they're
// attached to. Queueing only the host's own attachment port covers traffic
// heading *to* that host, but a host's own outbound traffic actually egresses
// through the switch's other port(s) — the inter-switch uplink(s) — not the
// port it just arrived on. In this topology every non-LOCAL, non-host port on
// a bridge is exactly that: an inter-switch link. Listing "every other port"
// is therefore a correct, topology-agnostic way to cover the real egress
// path without needing multi-hop path computation for an arbitrary
// destination host.
async function listPeerPorts(bridge, excludeIface) {
  const { stdout } = await pExecFile('sudo', ['-n', 'ovs-vsctl', 'list-ports', bridge]);
  return stdout.trim().split('\n').filter((p) => p && p !== excludeIface);
}

// Shared by the primary (host-facing) interface and every peer (uplink)
// interface so both directions of a slice's traffic actually pass through a
// real HTB class — not just whichever port happened to be named first.
async function provisionQueueOnInterface(bridge, iface, sliceId, sliceName, bandwidthKbps) {
  const { stdout: existingRaw } = await pExecFile('sudo', ['-n', 'ovs-vsctl', '--if-exists', 'get', 'port', iface, 'qos']);
  const existingQos = existingRaw.trim();

  if (existingQos && existingQos !== '[]') {
    const { stdout: extIds } = await pExecFile('sudo', ['-n', 'ovs-vsctl', 'get', 'qos', existingQos, 'external-ids']);
    if (getExternalId(extIds, 'slice-id') !== String(sliceId)) {
      return { iface, status: 'ERROR', error: `${iface} already carries a QoS policy owned by a different slice` };
    }
    return { iface, status: 'ACTIVE', reused: true };
  }

  // Both min-rate and max-rate are bit/s per the OVS schema (verified against
  // `man ovs-vswitchd.conf.db`, not assumed). max-rate is a real ceiling now —
  // previously unset, so a single low-latency slice had no cap and could
  // consume unlimited bandwidth on its queue. Default ceiling reuses the
  // app's own existing NETWORK_CAP_KBPS (100,000 Kbps) admission-control
  // budget rather than an arbitrary number; with an explicit request, the
  // ceiling is 2x the guaranteed minimum (headroom, not unlimited).
  const minRateBps = bandwidthKbps ? Math.round(Number(bandwidthKbps) * 1000) : 0;
  const maxRateBps = bandwidthKbps ? minRateBps * 2 : 100_000 * 1000;

  await pExecFile('sudo', ['-n', 'ovs-vsctl',
    '--', '--id=@q0', 'create', 'queue', `other-config:min-rate=${minRateBps}`, `other-config:max-rate=${maxRateBps}`, `external-ids:slice-id=${sliceId}`,
    '--', '--id=@q1', 'create', 'queue', `external-ids:slice-id=${sliceId}`,
    '--', '--id=@newqos', 'create', 'qos', 'type=linux-htb',
      `external-ids:slice-id=${sliceId}`, `external-ids:slice-name=${sliceName || ''}`,
      'queues:0=@q0', 'queues:1=@q1',
    '--', 'set', 'port', iface, 'qos=@newqos',
  ]);

  console.log(`[QoS] Provisioned low-latency HTB queue on ${iface} (bridge ${bridge}, min=${minRateBps}bit/s max=${maxRateBps}bit/s) for slice "${sliceName}" (${sliceId})`);
  return { iface, status: 'ACTIVE', reused: false };
}

async function removeQueueFromInterface(iface, sliceId) {
  const { stdout: existingRaw } = await pExecFile('sudo', ['-n', 'ovs-vsctl', '--if-exists', 'get', 'port', iface, 'qos']);
  const qosUuid = existingRaw.trim();
  if (!qosUuid || qosUuid === '[]') return { iface, status: 'REMOVED' };

  const { stdout: extIds } = await pExecFile('sudo', ['-n', 'ovs-vsctl', 'get', 'qos', qosUuid, 'external-ids']);
  if (sliceId && getExternalId(extIds, 'slice-id') !== String(sliceId)) {
    return { iface, status: 'ACTIVE', note: 'QoS on this port belongs to another slice — left untouched' };
  }

  const { stdout: queuesRaw } = await pExecFile('sudo', ['-n', 'ovs-vsctl', 'get', 'qos', qosUuid, 'queues']);
  const queueUuids = [...queuesRaw.matchAll(/[0-9a-f-]{36}/g)].map((m) => m[0]);
  const destroyArgs = ['-n', 'ovs-vsctl', '--', 'clear', 'port', iface, 'qos', '--', 'destroy', 'qos', qosUuid];
  for (const qUuid of queueUuids) destroyArgs.push('--', '--if-exists', 'destroy', 'queue', qUuid);
  await pExecFile('sudo', destroyArgs);

  return { iface, status: 'REMOVED' };
}

// ovs-vsctl prints external-ids maps like `{slice-id="171", slice-name=Foo}`
// — numeric-looking values get quoted, bare identifiers don't. A raw
// `.includes('slice-id=171')` substring check never matches the quoted form,
// so it always misreports "belongs to another slice." Parse the actual value
// instead of guessing at quoting.
function getExternalId(extIdsRaw, key) {
  const match = extIdsRaw.match(new RegExp(`${key}=("([^"]*)"|[^,}]*)`));
  if (!match) return null;
  return match[2] !== undefined ? match[2] : match[1];
}

// Read-only — reports whatever OVS state actually exists on this port right
// now, never creates anything. Backs the Tools page's "Check Queues"
// diagnostic, which must show real enforcement state, not the app's own
// belief about what it provisioned.
app.get('/api/qos/:switchId/:port', async (req, res) => {
  const { switchId, port } = req.params;
  try {
    const { bridge, iface } = await resolveInterface(switchId, port);
    const { stdout: existingRaw } = await pExecFile('sudo', ['-n', 'ovs-vsctl', '--if-exists', 'get', 'port', iface, 'qos']);
    const qosUuid = existingRaw.trim();

    if (!qosUuid || qosUuid === '[]') {
      return res.json({ status: 'NOT_CONFIGURED', bridge, iface });
    }

    const { stdout: extIds } = await pExecFile('sudo', ['-n', 'ovs-vsctl', 'get', 'qos', qosUuid, 'external-ids']);
    res.json({
      status: 'ACTIVE',
      bridge,
      iface,
      sliceId: getExternalId(extIds, 'slice-id'),
      sliceName: getExternalId(extIds, 'slice-name'),
      dscp: DSCP_LOW_LATENCY,
      queue: QUEUE_LOW_LATENCY,
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

app.put('/api/qos/:switchId/:port', async (req, res) => {
  const { switchId, port } = req.params;
  const { sliceId, sliceName, bandwidthKbps } = req.body || {};
  if (!sliceId) return res.status(400).json({ status: 'ERROR', error: 'sliceId is required' });

  try {
    const { bridge, iface } = await resolveInterface(switchId, port);
    const peers = await listPeerPorts(bridge, iface);

    // Primary (host-facing) port covers traffic *to* the host; peer
    // (inter-switch) ports cover the host's own outbound traffic, whose real
    // egress is one of those uplinks, not the port it arrived on.
    const primary = await provisionQueueOnInterface(bridge, iface, sliceId, sliceName, bandwidthKbps);
    const peerResults = [];
    for (const peerIface of peers) {
      peerResults.push(await provisionQueueOnInterface(bridge, peerIface, sliceId, sliceName, bandwidthKbps));
    }

    if (primary.status === 'ERROR') {
      return res.status(409).json({ status: 'ERROR', error: primary.error });
    }

    const failedPeers = peerResults.filter((p) => p.status === 'ERROR');
    console.log(`[QoS] ${iface} (primary) + ${peerResults.length} peer port(s) on ${bridge} for slice "${sliceName}" (${sliceId})${failedPeers.length ? ` — ${failedPeers.length} peer(s) failed (owned by another slice)` : ''}`);

    res.json({
      status: 'ACTIVE',
      bridge, iface,
      dscp: DSCP_LOW_LATENCY, queue: QUEUE_LOW_LATENCY,
      reused: primary.reused,
      peerPorts: peerResults,
    });
  } catch (err) {
    console.error(`[QoS] Provision failed for ${switchId}:${port} (slice ${sliceId}):`, err.message);
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

app.delete('/api/qos/:switchId/:port', async (req, res) => {
  const { switchId, port } = req.params;
  const { sliceId } = req.query;

  try {
    const { bridge, iface } = await resolveInterface(switchId, port);
    const peers = await listPeerPorts(bridge, iface);

    const primary = await removeQueueFromInterface(iface, sliceId);
    const peerResults = [];
    for (const peerIface of peers) {
      peerResults.push(await removeQueueFromInterface(peerIface, sliceId));
    }

    console.log(`[QoS] Removed low-latency HTB queue on ${iface} + ${peerResults.length} peer port(s) for slice ${sliceId}`);
    res.json({ status: primary.status, note: primary.note, peerPorts: peerResults });
  } catch (err) {
    console.error(`[QoS] Removal failed for ${switchId}:${port} (slice ${sliceId}):`, err.message);
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// AUTO-HEALING MIDDLEWARE FOR FLOWS & METERS
app.use(async (req, res, next) => {
  if (req.method === "PUT" || req.method === "DELETE") {
    try {
      let odlPath = "";
      if (req.path.startsWith("/flow/")) {
        const parts = req.path.split("/");
        odlPath = `/opendaylight-inventory:nodes/node=${parts[2]}/flow-node-inventory:table=${parts[3]}/flow=${parts[4]}`;
      } else if (req.path.startsWith("/meter/")) {
        const parts = req.path.split("/");
        odlPath = `/opendaylight-inventory:nodes/node=${parts[2]}/flow-node-inventory:meter=${parts[3]}`;
      } else {
        return next();
      }

      // 1. Ensure payload has the correct namespace prefix for ODL!
      const bodyPayload = req.body || {};
      if (bodyPayload.flow) {
        bodyPayload["flow-node-inventory:flow"] = bodyPayload.flow;
        delete bodyPayload.flow;
      }
      if (bodyPayload.meter) {
        bodyPayload["flow-node-inventory:meter"] = bodyPayload.meter;
        delete bodyPayload.meter;
      }

      // 2. Try the primary request
      let response = await fetch(`${ODL_BASE_URL}${odlPath}`, {
        method: req.method,
        headers: { Authorization: ODL_AUTH, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: req.method === "PUT" ? JSON.stringify(bodyPayload) : undefined
      });

      // 3. AUTO-HEAL: If 404 on PUT, the parent switch doesn't exist in the Config DB yet!
      if (response.status === 404 && req.method === "PUT") {
        const nodeId = req.path.split("/")[2];
        
        // Initialize the empty switch in the Config Datastore
        await fetch(`${ODL_BASE_URL}/opendaylight-inventory:nodes/node=${nodeId}`, {
          method: "PUT",
          headers: { Authorization: ODL_AUTH, Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            "opendaylight-inventory:node": [{ "id": nodeId }]
          })
        });

        // Retry pushing the slice!
        response = await fetch(`${ODL_BASE_URL}${odlPath}`, {
          method: req.method,
          headers: { Authorization: ODL_AUTH, Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
      }

      const responseBody = await response.text();
      res.status(response.status);
      if (responseBody) res.type("application/json").send(responseBody);
      else res.send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    next();
  }
});

/* =========================================================
   OPENSTACK INTEGRATION 
   ========================================================= */

const normalizeProtocol = (protocol) => {
  if (!protocol) return "icmp";
  return protocol.toLowerCase();
};

const getToken = async () => {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 30000) {
    return tokenCache.token;
  }

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

  const catalog = payload.token.catalog;
  if (catalog) {
    const keystoneUrlObj = new URL(KEYSTONE_URL);
    const keystoneHost = keystoneUrlObj.hostname;
    const isLocalKeystone = keystoneHost === "127.0.0.1" || keystoneHost === "localhost";

    const getUrl = (type) => {
      const service = catalog.find((s) => s.type === type);
      if (service && service.endpoints && service.endpoints.length > 0) {
        const endpoint = service.endpoints.find((e) => e.interface === "public") || service.endpoints[0];
        let serviceUrl = endpoint.url;

        if (isLocalKeystone) {
          try {
            const urlObj = new URL(serviceUrl);
            urlObj.hostname = keystoneHost;
            serviceUrl = urlObj.toString();
          } catch (e) {
          }
        }
        return serviceUrl;
      }
      return null;
    };

    let nova = getUrl("compute");
    if (nova) NOVA_URL = nova;

    let neutron = getUrl("network");
    if (neutron) NEUTRON_URL = neutron.includes("/v2.0") ? neutron : `${neutron.replace(/\/$/, "")}/v2.0`;

    let glance = getUrl("image");
    if (glance) GLANCE_URL = glance.includes("/v2") ? glance : `${glance.replace(/\/$/, "")}/v2`;
  }

  tokenCache = { token, expiresAt };
  return token;
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

async function findServerByName(name) {
  const data = await osJson(`${NOVA_URL}/servers?name=${encodeURIComponent(name)}`);
  const servers = data.servers || [];
  if (servers.length === 0) {
    throw new Error(`Server not found: ${name}`);
  }
  const detail = await osJson(`${NOVA_URL}/servers/${servers[0].id}`);
  return detail.server;
}

async function findNetwork(nameOrId) {
  const data = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(nameOrId)}`);
  const networks = data.networks || [];
  if (networks.length === 0) {
    throw new Error(`Network not found: ${nameOrId}`);
  }
  const net = networks[0];
  if (net.subnets && net.subnets.length > 0) {
    try {
      const subnetData = await osJson(`${NEUTRON_URL}/subnets/${net.subnets[0]}`);
      net.cidr = subnetData.subnet?.cidr || "0.0.0.0/0";
    } catch (_) {
      net.cidr = "0.0.0.0/0";
    }
  } else {
    net.cidr = "0.0.0.0/0";
  }
  return net;
}

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
      const ipAddr = fixedIp?.ip_address || Object.values(server.addresses || {})?.[0]?.[0]?.addr || "N/A";
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
      {
        title: "OVN Logical Switches",
        value: networks.length,
        icon: "🌐",
      },
      {
        title: "Routers",
        value: routers.length,
        icon: "📡",
      },
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
    console.error("Cloud summary error:", error.message);
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

app.post("/api/openstack/security-groups/rules", async (req, res) => {
  const rule = req.body;

  if (
    !rule ||
    !rule.source ||
    !rule.destination ||
    (!rule.protocol || (rule.protocol.toUpperCase() !== "ICMP" && !rule.port))
  ) {
    return res.status(400).json({
      error: "Source, destination, and port are required.",
    });
  }

  if (rule.action && rule.action.toUpperCase() !== "ALLOW") {
    return res.status(400).json({
      error: "OpenStack security groups only support ALLOW rules.",
    });
  }

  try {
    const server = await findServerByName(rule.source);
    const securityGroupName = server.security_groups?.[0]?.name;

    if (!securityGroupName) {
      return res.status(400).json({
        error: "Source VM has no security group attached.",
      });
    }

    const network = await findNetwork(rule.destination);

    const groupResponse = await osJson(
      `${NEUTRON_URL}/security-groups?name=${encodeURIComponent(securityGroupName)}`
    );

    const securityGroup = (groupResponse.security_groups || [])[0];

    if (!securityGroup) {
      return res.status(400).json({
        error: `Security group not found: ${securityGroupName}`,
      });
    }

    const cidr = network.cidr || "0.0.0.0/0";
    const ethertype = cidr.includes(":") ? "IPv6" : "IPv4";
    const reqProtocol = normalizeProtocol(rule.protocol);

    const rulesToCreate = [];

    if (reqProtocol === "icmp") {
      rulesToCreate.push({
        security_group_rule: {
          security_group_id: securityGroup.id,
          direction: "ingress",
          ethertype: "IPv4",
          protocol: "icmp",
          remote_ip_prefix: cidr.includes(":") ? "0.0.0.0/0" : cidr,
        },
      });
      rulesToCreate.push({
        security_group_rule: {
          security_group_id: securityGroup.id,
          direction: "ingress",
          ethertype: "IPv6",
          protocol: "ipv6-icmp",
          remote_ip_prefix: cidr.includes(":") ? cidr : "::/0",
        },
      });
    } else {
      rulesToCreate.push({
        security_group_rule: {
          security_group_id: securityGroup.id,
          direction: "ingress",
          ethertype,
          protocol: reqProtocol,
          remote_ip_prefix: cidr,
          port_range_min: Number(rule.port),
          port_range_max: Number(rule.port),
        },
      });
    }

    const createdRules = await Promise.all(
      rulesToCreate.map((body) =>
        osJson(`${NEUTRON_URL}/security-group-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch((err) => {
          if (err.message && err.message.includes("409")) {
            return { security_group_rule: { id: "existing-rule" } };
          }
          throw err;
        })
      )
    );

    const firstRuleId = createdRules[0]?.security_group_rule?.id;

    res.json({
      success: true,
      acl: {
        id: firstRuleId,
        source: rule.source,
        destination: network.name,
        protocol: rule.protocol,
        port: rule.port,
        action: "ALLOW",
      },
      message: "Security group rule created successfully.",
    });
  } catch (error) {
    console.error("Security rule creation error:", error);

    if (error.message.includes("409")) {
      return res.status(409).json({
        error: "Security group rule already exists.",
      });
    }

    res.status(500).json({
      error: error.message || "Failed to create security group rule",
    });
  }
});

app.get("/api/openstack/acl-list/:logicalSwitch", async (req, res) => {
  let logicalSwitch = req.params.logicalSwitch;

  if (!logicalSwitch) {
    return res.status(400).json({ error: "Logical switch is required." });
  }

  try {
    if (!logicalSwitch.startsWith("neutron-")) {
      const network = await findNetwork(logicalSwitch);
      logicalSwitch = `neutron-${network.id}`;
    }
  } catch (error) {
    return res.status(404).json({ error: `Could not resolve network name ${logicalSwitch} to OVN logical switch.` });
  }

  execFile("sudo", ["-n", "ovn-nbctl", "acl-list", logicalSwitch], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        error: stderr || error.message,
        message: "Failed to verify ACLs (OVN permission or switch mismatch).",
        available: false,
      });
    }

    let acls = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (acls.length === 0) {
      execFile("sudo", ["-n", "ovn-nbctl", "list", "acl"], (err2, stdout2) => {
        if (!err2 && stdout2) {
          acls = stdout2
            .split("\n")
            .filter((line) => line.includes("match") || line.includes("action") || line.includes("direction"))
            .map((line) => line.trim())
            .slice(0, 15);

          if (acls.length > 0) {
            acls.unshift("--- Port Group ACLs found in OVN DB ---");
          }
        }
        res.json({ logicalSwitch, acls, available: true });
      });
      return;
    }

    res.json({ logicalSwitch, acls, available: true });
  });
});

app.post("/api/openstack/create-vm", async (req, res) => {
  const { name, flavor, image, network } = req.body;

  if (!name || !flavor || !image || !network) {
    return res.status(400).json({ error: "name, flavor, image, and network are required." });
  }

  try {
    const flavorsData = await osJson(`${NOVA_URL}/flavors`);
    const flavorObj = (flavorsData.flavors || []).find(
      (f) => f.name === flavor || f.id === flavor
    );
    if (!flavorObj) {
      return res.status(400).json({ error: `Flavor not found: ${flavor}` });
    }

    const imagesData = await osJson(`${GLANCE_URL}/images?name=${encodeURIComponent(image)}`);
    const imageObj = (imagesData.images || [])[0];
    if (!imageObj) {
      return res.status(400).json({ error: `Image not found: ${image}` });
    }

    const networksData = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`);
    const networkObj = (networksData.networks || [])[0];
    if (!networkObj) {
      return res.status(400).json({ error: `Network not found: ${network}` });
    }

    const serverBody = {
      server: {
        name,
        flavorRef: flavorObj.id,
        imageRef: imageObj.id,
        networks: [{ uuid: networkObj.id }],
      },
    };

    const created = await osJson(`${NOVA_URL}/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverBody),
    });

    res.json({
      success: true,
      server: created.server,
      message: `VM "${name}" created successfully.`,
    });
  } catch (error) {
    console.error("Create VM error:", error);
    res.status(500).json({ error: error.message || "Failed to create VM" });
  }
});

app.post("/api/openstack/create-network", async (req, res) => {
  const { name, cidr } = req.body;

  if (!name || !cidr) {
    return res.status(400).json({ error: "name and cidr are required." });
  }

  try {
    const networkBody = {
      network: {
        name,
        admin_state_up: true,
      },
    };

    const createdNetwork = await osJson(`${NEUTRON_URL}/networks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(networkBody),
    });

    const networkId = createdNetwork.network.id;

    const subnetBody = {
      subnet: {
        network_id: networkId,
        ip_version: 4,
        cidr,
        name: `${name}-subnet`,
      },
    };

    const createdSubnet = await osJson(`${NEUTRON_URL}/subnets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subnetBody),
    });

    res.json({
      success: true,
      network: createdNetwork.network,
      subnet: createdSubnet.subnet,
      message: `Network "${name}" created successfully.`,
    });
  } catch (error) {
    console.error("Create network error:", error);
    res.status(500).json({ error: error.message || "Failed to create network" });
  }
});

app.post("/api/openstack/launch-instance", async (req, res) => {
  const { name, flavor, image, network } = req.body;

  if (!name || !flavor || !image || !network) {
    return res.status(400).json({ error: "name, flavor, image, and network are required." });
  }

  try {
    const flavorsData = await osJson(`${NOVA_URL}/flavors`);
    const flavorObj = (flavorsData.flavors || []).find(
      (f) => f.name === flavor || f.id === flavor
    );
    if (!flavorObj) {
      return res.status(400).json({ error: `Flavor not found: ${flavor}` });
    }

    const imagesData = await osJson(`${GLANCE_URL}/images?name=${encodeURIComponent(image)}`);
    const imageObj = (imagesData.images || [])[0];
    if (!imageObj) {
      return res.status(400).json({ error: `Image not found: ${image}` });
    }

    const networksData = await osJson(`${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`);
    const networkObj = (networksData.networks || [])[0];
    if (!networkObj) {
      return res.status(400).json({ error: `Network not found: ${network}` });
    }

    const serverBody = {
      server: {
        name,
        flavorRef: flavorObj.id,
        imageRef: imageObj.id,
        networks: [{ uuid: networkObj.id }],
      },
    };

    const created = await osJson(`${NOVA_URL}/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverBody),
    });

    res.json({
      success: true,
      server: created.server,
      message: `Instance "${name}" launched successfully.`,
    });
  } catch (error) {
    console.error("Launch instance error:", error);
    res.status(500).json({ error: error.message || "Failed to launch instance" });
  }
});

const bootstrap = async () => {
  console.log("--- BEGINNING LEARNING PHASE (SERVICE DISCOVERY) ---");
  try {
    await getToken();
    console.log("--- LEARNING PHASE COMPLETE: STARTING APIS ---");
    console.log(`LEARNED IP ADDRESSES:`);
    console.log(`  Keystone (Registry): ${KEYSTONE_URL}`);
    console.log(`  Neutron  (Network):  ${NEUTRON_URL}`);
    console.log(`  Nova     (Compute):  ${NOVA_URL}`);
    console.log(`  Glance   (Image):    ${GLANCE_URL}`);
  } catch (error) {
    console.error("Warning: Failed to learn OpenStack environment addresses at startup:", error.message);
  }

  app.listen(port, () => {
    console.log(`\nDashboard backend is now listening on Port ${port}`);
  });
};

bootstrap();