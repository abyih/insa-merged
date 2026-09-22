// // import fs from "fs";
// // import path from "path";
// // import { exec } from "child_process";
// // import os from "os";

// // // Concurrency lock to prevent React StrictMode from launching duplicate Java JVMs
// // let isOdlTlsUpdating = false;

// // /**
// //  * Helper to safely update specific keys in a properties (.cfg) file without destroying others
// //  */
// // function updatePropertiesFile(filePath, updates) {
// //   if (!fs.existsSync(filePath)) {
// //     fs.writeFileSync(filePath, "", "utf8");
// //   }
  
// //   let content = fs.readFileSync(filePath, "utf8");
  
// //   for (const [key, value] of Object.entries(updates)) {
// //     const regex = new RegExp(`^\\s*${key}\\s*=.*`, "m");
// //     if (regex.test(content)) {
// //       content = content.replace(regex, `${key}=${value}`);
// //     } else {
// //       content += `\n${key}=${value}`;
// //     }
// //   }
  
// //   fs.writeFileSync(filePath, content, "utf8");
// // }

// // /**
// //  * Helper to configure ODL TLS status (Native filesystem) and restart daemon
// //  */
// // export function updateOdlTlsConfig(enable) {
// //   if (isOdlTlsUpdating) {
// //     console.log("[Orchestrator Guard] ODL TLS update already in progress. Ignoring duplicate request.");
// //     return;
// //   }
  
// //   isOdlTlsUpdating = true;

// //   // Resolve user dynamically from env, or fall back to native OS discovery
// //   const vmUser = process.env.VM_USER || os.userInfo().username || "maryamawit";
  
// //   // Construct highly portable fallback paths to avoid /root resolution under sudo
// //   const defaultOdlEtc = path.join("/home", vmUser, "karaf-0.23.0", "etc");
// //   let odlEtcPath = process.env.ODL_ETC_PATH || defaultOdlEtc;
  
// //   // Dynamically resolve nested ${VM_USER} variable if present in the env path string
// //   odlEtcPath = odlEtcPath.replace(/\${VM_USER}/g, vmUser).replace(/\$VM_USER/g, vmUser);
  
// //   const ofPluginPath = path.join(odlEtcPath, "org.opendaylight.openflowplugin.cfg");
  
// //   // Resolve parent home folder path dynamically
// //   const odlHome = path.dirname(odlEtcPath);
// //   const akkaPath = path.join(odlHome, "configuration", "initial", "akka.conf");

// //   console.log(`[Orchestrator] Dynamic ODL TLS Config Update Initiated (Path: ${odlEtcPath})`);

// //   // Define absolute paths for the keystores to ensure 100% reliable Java loading
// //   const absKeystorePath = path.join(odlEtcPath, "opendaylight-keystore.jks");
// //   const absTruststorePath = path.join(odlEtcPath, "opendaylight-truststore.jks");

// //   // Construct precise, targeted configuration parameters
// //   const updates = {
// //     "use-transport-tls": enable,
// //     "transport-protocol": enable ? "TLS" : "TCP",
// //     "tls-keystore-path": absKeystorePath,
// //     "tls-keystore-password": "changeit",
// //     "tls-keystore-type": "PKCS12",
// //     "tls-truststore-path": absTruststorePath,
// //     "tls-truststore-password": "changeit",
// //     "tls-truststore-type": "PKCS12"
// //   };

// //   try {
// //     // Write targeted configurations to the single, unified plugin CFG
// //     updatePropertiesFile(ofPluginPath, updates);
// //     console.log(`[Orchestrator] Absolute secure configurations successfully written to ODL Plugin.`);
// //   } catch (writeErr) {
// //     isOdlTlsUpdating = false;
// //     console.error("[Orchestrator Error] Failed to write config files:", writeErr.message);
// //     throw writeErr;
// //   }

// //   // 2. Update East-West Akka CFG
// //   if (fs.existsSync(akkaPath)) {
// //     let content = fs.readFileSync(akkaPath, "utf8");
// //     const searchString = 'enabled-transports = ["akka.remote.netty.ssl"]';
// //     const disableString = 'enabled-transports = ["akka.remote.netty.tcp"]';

// //     if (enable) {
// //       content = content.replace(disableString, searchString);
// //     } else {
// //       content = content.replace(searchString, disableString);
// //     }
// //     fs.writeFileSync(akkaPath, content, "utf8");
// //   }

// //   // Define executable paths
// //   const karafBinDir = path.join(odlHome, "bin");
  
// //   // Use the standard "env" utility inside sudo to correctly pass the JAVA_HOME variable
// //   const stopCmd = `sudo -u ${vmUser} env JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ${karafBinDir}/stop`;
// //   const startCmd = `sudo -u ${vmUser} env JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ${karafBinDir}/start`;

// //   // Inject user environment and JVM paths explicitly into the process context
// //   const execEnv = {
// //     ...process.env,
// //     JAVA_HOME: "/usr/lib/jvm/java-21-openjdk-amd64",
// //     PATH: `${process.env.PATH || ""}:/usr/lib/jvm/java-21-openjdk-amd64/bin`
// //   };

// //   console.log(`[Orchestrator] Restarting OpenDaylight Daemon. Executing stop: ${stopCmd}`);
  
// //   // Explicitly set the Current Working Directory (cwd) to the ODL Home directory
// //   exec(stopCmd, { env: execEnv, cwd: odlHome }, (stopErr) => {
// //     if (stopErr) {
// //       console.warn("[Orchestrator Warning] ODL stop command encountered issues (possibly already stopped):", stopErr.message);
// //     }
    
// //     // Allow standard TCP socket cleanup timeout
// //     setTimeout(() => {
// //       console.log(`[Orchestrator] Executing start daemon: ${startCmd} from CWD: ${odlHome}`);
// //       exec(startCmd, { env: execEnv, cwd: odlHome }, (startErr) => {
// //         // Release the lock when complete
// //         isOdlTlsUpdating = false;
        
// //         if (startErr) {
// //           console.error("[Orchestrator Error] Failed to restart ODL daemon process:", startErr.message);
// //         } else {
// //           console.log("[Orchestrator] ODL restarted successfully in background daemon mode.");
// //         }
// //       });
// //     }, 2500);
// //   });
// // }

// // /**
// //  * Dynamic ONOS TLS Orchestrator with Split-Permission Handling
// //  */
// // export function updateOnosTlsConfig(enable) {
// //   const containerName = process.env.ONOS_CONTAINER_NAME || "onos";
// //   const internalEtc = process.env.ONOS_INTERNAL_ETC || "/root/onos/apache-karaf-4.2.14/etc";
  
// //   // Resolve user dynamically from env, or fall back to native OS discovery
// //   const vmUser = process.env.VM_USER || os.userInfo().username || "maryamawit";
  
// //   const defaultHostTlsDir = path.join("/home", vmUser, "onos-tls");
// //   let hostTlsDir = process.env.ONOS_HOST_TLS_DIR || defaultHostTlsDir;

// //   // Dynamically resolve nested ${VM_USER} variable if present in the env path string
// //   hostTlsDir = hostTlsDir.replace(/\${VM_USER}/g, vmUser).replace(/\$VM_USER/g, vmUser);

// //   const ofFileName = "org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg";
// //   const tempOfFile = `/tmp/${ofFileName}`;
// //   const restartContainerCmd = `docker restart ${containerName}`;

// //   // Generate the clean configuration content
// //   const ofContent = `tlsMode = ${enable ? 'enabled' : 'disabled'}
// // keyStore = ${internalEtc}/keystore.jks
// // keyStorePassword = changeit
// // trustStore = ${internalEtc}/truststore.jks
// // trustStorePassword = changeit\n`;

// //   // Write temporary configuration file on the Host VM
// //   fs.writeFileSync(tempOfFile, ofContent, "utf8");

// //   // Commands to copy files into the container's etc/ directory
// //   const copyCfgCmd = `docker cp ${tempOfFile} ${containerName}:${internalEtc}/${ofFileName}`;
// //   const copyKeysCmd = `docker cp ${hostTlsDir}/keystore.jks ${containerName}:${internalEtc}/ && docker cp ${hostTlsDir}/truststore.jks ${containerName}:${internalEtc}/`;
  
// //   // Split permissions: ON needs keys, OFF only needs the configuration file
// //   const chmodCfgOnlyCmd = `docker exec ${containerName} chmod 644 ${internalEtc}/${ofFileName}`;
// //   const chmodAllCmd = `docker exec ${containerName} chmod 644 ${internalEtc}/${ofFileName} ${internalEtc}/keystore.jks ${internalEtc}/truststore.jks`;

// //   console.log(`[Orchestrator] Dynamic TLS ${enable ? 'Activation' : 'Deactivation'} Initiated...`);

// //   // Run file operations and container restarts sequentially
// //   exec(copyCfgCmd, (errCfg) => {
// //     if (errCfg) {
// //       console.error("[Orchestrator Error] Failed to copy config file to container:", errCfg.message);
// //       return;
// //     }

// //     // Clean up temporary host file
// //     if (fs.existsSync(tempOfFile)) fs.unlinkSync(tempOfFile);

// //     if (enable) {
// //       // ON path: Copy keys, set permissions on all files, and restart
// //       exec(copyKeysCmd, (errKeys) => {
// //         if (errKeys) {
// //           console.error("[Orchestrator Error] Failed to copy keystores to container:", errKeys.message);
// //           return;
// //         }
// //         exec(chmodAllCmd, (errPerm) => {
// //           if (errPerm) {
// //             console.error("[Orchestrator Error] Failed to set all permissions:", errPerm.message);
// //             return;
// //           }
// //           console.log("Keys and configurations successfully written inside container. Restarting ONOS...");
// //           exec(restartContainerCmd, (errRestart) => {
// //             if (errRestart) console.error("[Orchestrator Error] Failed to restart ONOS container:", errRestart.message);
// //             console.log("[Orchestrator] ONOS container successfully restarted with TLS ENABLED.");
// //           });
// //         });
// //       });
// //     } else {
// //       // OFF path: Set permissions ONLY on the configuration file, then restart
// //       exec(chmodCfgOnlyCmd, (errPerm) => {
// //         if (errPerm) {
// //           console.error("[Orchestrator Error] Failed to set config file permissions:", errPerm.message);
// //           return;
// //         }
// //         console.log("Plaintext configurations successfully written inside container. Restarting ONOS...");
// //         exec(restartContainerCmd, (errRestart) => {
// //           if (errRestart) console.error("[Orchestrator Error] Failed to restart ONOS container:", errRestart.message);
// //           console.log("[Orchestrator] ONOS container successfully restarted with TLS DISABLED.");
// //         });
// //       });
// //     }
// //   });
// // }
// import fs from "fs";
// import path from "path";
// import { exec } from "child_process";
// import os from "os";

// // Concurrency lock to prevent React StrictMode from launching duplicate updates
// let isOdlTlsUpdating = false;

// /**
//  * Portability Helper: Resolves variables like ${VM_USER}, $VM_USER, or tildes (~) on the fly
//  */
// function resolvePortablePath(rawPath) {
//   if (!rawPath) return "";
//   const systemUser = process.env.VM_USER || os.userInfo().username;
//   return rawPath
//     .replace(/\${VM_USER}/g, systemUser)
//     .replace(/\$VM_USER/g, systemUser)
//     .replace(/^~/, os.homedir());
// }

// /**
//  * Helper to safely update specific keys in a properties (.cfg) file
//  */
// function updatePropertiesFile(filePath, updates) {
//   if (!fs.existsSync(filePath)) {
//     fs.writeFileSync(filePath, "", "utf8");
//   }
//   let content = fs.readFileSync(filePath, "utf8");
//   for (const [key, value] of Object.entries(updates)) {
//     const regex = new RegExp(`^\\s*${key}\\s*=.*`, "m");
//     if (regex.test(content)) {
//       content = content.replace(regex, `${key}=${value}`);
//     } else {
//       content += `\n${key}=${value}`;
//     }
//   }
//   fs.writeFileSync(filePath, content, "utf8");
// }

// /**
//  * Configure ODL TLS Status dynamically (RESTCONF) and fallback write to disk
//  */
// export async function updateOdlTlsConfig(enable) {
//   if (isOdlTlsUpdating) {
//     console.log("[Orchestrator Guard] ODL TLS update in progress. Request ignored.");
//     return;
//   }
//   isOdlTlsUpdating = true;

//   const vmUser = process.env.VM_USER || os.userInfo().username;
//   const rawEtcPath = process.env.ODL_ETC_PATH || `/home/${vmUser}/karaf-0.23.0/etc`;
//   const odlEtcPath = resolvePortablePath(rawEtcPath);

//   const ofPluginPath = path.join(odlEtcPath, "org.opendaylight.openflowplugin.cfg");
//   const ofJavaPath = path.join(odlEtcPath, "org.opendaylight.openflowjava.cfg");
//   const odlHome = path.dirname(odlEtcPath);
//   const akkaPath = path.join(odlHome, "configuration", "initial", "akka.conf");

//   console.log(`[Orchestrator] Updating ODL Local CFG files on disk (Path: ${odlEtcPath})`);

//   const absKeystorePath = path.join(odlEtcPath, "opendaylight-keystore.jks");
//   const absTruststorePath = path.join(odlEtcPath, "opendaylight-truststore.jks");

//   const diskUpdates = {
//     "use-transport-tls": enable,
//     "transport-protocol": enable ? "TLS" : "TCP",
//     "tls-keystore-path": absKeystorePath,
//     "tls-keystore-password": "changeit",
//     "tls-keystore-type": "PKCS12",
//     "tls-truststore-path": absTruststorePath,
//     "tls-truststore-password": "changeit",
//     "tls-truststore-type": "PKCS12"
//   };

//   try {
//     // 1. Sync properties on disk (Ensures persistence across clean starts)
//     updatePropertiesFile(ofPluginPath, diskUpdates);
//     updatePropertiesFile(ofJavaPath, diskUpdates);

//     if (fs.existsSync(akkaPath)) {
//       let content = fs.readFileSync(akkaPath, "utf8");
//       const searchString = 'enabled-transports = ["akka.remote.netty.ssl"]';
//       const disableString = 'enabled-transports = ["akka.remote.netty.tcp"]';
//       content = enable ? content.replace(disableString, searchString) : content.replace(searchString, disableString);
//       fs.writeFileSync(akkaPath, content, "utf8");
//     }
//   } catch (writeErr) {
//     isOdlTlsUpdating = false;
//     console.error("[Orchestrator Error] Failed to write config files:", writeErr.message);
//     throw writeErr;
//   }

//   // 2. Dynamic RESTCONF PUT (Instantly hot-reloads the active database socket)
//   console.log(`[Orchestrator] Sending RESTCONF API payload to OpenDaylight...`);
//   const authHeader = "Basic " + Buffer.from("admin:admin").toString("base64");

//   const defaultImplPayload = enable ? {
//     "openflow-switch-connection-config:switch-connection-config": [
//       {
//         "instance-name": "openflow-switch-connection-provider-default-impl",
//         "port": 6653,
//         "transport-protocol": "TLS",
//         "group-add-mod-enabled": false,
//         "channel-outbound-queue-size": 1024,
//         "tls": {
//           "truststore-path-type": "PATH",
//           "keystore-path-type": "PATH",
//           "keystore-password": "changeit",
//           "truststore-type": "PKCS12",
//           "keystore": absKeystorePath,
//           "truststore": absTruststorePath,
//           "certificate-password": "changeit",
//           "keystore-type": "PKCS12",
//           "truststore-password": "changeit"
//         }
//       }
//     ]
//   } : {
//     "openflow-switch-connection-config:switch-connection-config": [
//       {
//         "instance-name": "openflow-switch-connection-provider-default-impl",
//         "port": 6653,
//         "transport-protocol": "TCP",
//         "group-add-mod-enabled": false,
//         "channel-outbound-queue-size": 1024
//       }
//     ]
//   };

//   const legacyImplPayload = {
//     "openflow-switch-connection-config:switch-connection-config": [
//       {
//         "instance-name": "openflow-switch-connection-provider-legacy-impl",
//         "port": 6633,
//         "transport-protocol": "TCP",
//         "group-add-mod-enabled": false,
//         "channel-outbound-queue-size": 1024
//       }
//     ]
//   };

//   try {
//     // Overwrite port 6653 configuration
//     await fetch("http://127.0.0.1:8181/rests/data/openflow-switch-connection-config:switch-connection-config=openflow-switch-connection-provider-default-impl", {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": authHeader
//       },
//       body: JSON.stringify(defaultImplPayload)
//     });

//     // Overwrite port 6633 legacy configuration
//     await fetch("http://127.0.0.1:8181/rests/data/openflow-switch-connection-config:switch-connection-config=openflow-switch-connection-provider-legacy-impl", {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": authHeader
//       },
//       body: JSON.stringify(legacyImplPayload)
//     });

//     console.log("[Orchestrator] ODL configuration successfully updated and hot-reloaded.");
//   } catch (apiErr) {
//     console.error("[Orchestrator Warning] ODL RESTCONF connection refused. File configurations updated on disk instead:", apiErr.message);
//   } finally {
//     isOdlTlsUpdating = false;
//   }
// }

// /**
//  * Configure ONOS TLS status (Docker vs Native)
//  */
// export function updateOnosTlsConfig(enable) {
//   const containerName = process.env.ONOS_CONTAINER_NAME || "onos";
//   const internalEtc = process.env.ONOS_INTERNAL_ETC || "/root/onos/apache-karaf-4.2.14/etc";
  
//   const rawTlsDir = process.env.ONOS_HOST_TLS_DIR || `/home/${os.userInfo().username}/onos-tls`;
//   const hostTlsDir = resolvePortablePath(rawTlsDir);

//   const ofFileName = "org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg";
//   const tempOfFile = `/tmp/${ofFileName}`;
//   const restartContainerCmd = `docker restart ${containerName}`;

//   const ofContent = `tlsMode = ${enable ? 'enabled' : 'disabled'}
// keyStore = ${internalEtc}/keystore.jks
// keyStorePassword = changeit
// trustStore = ${internalEtc}/truststore.jks
// trustStorePassword = changeit\n`;

//   fs.writeFileSync(tempOfFile, ofContent, "utf8");

//   const copyCfgCmd = `docker cp ${tempOfFile} ${containerName}:${internalEtc}/${ofFileName}`;
//   const copyKeysCmd = `docker cp ${hostTlsDir}/keystore.jks ${containerName}:${internalEtc}/ && docker cp ${hostTlsDir}/truststore.jks ${containerName}:${internalEtc}/`;
  
//   const chmodCfgOnlyCmd = `docker exec ${containerName} chmod 644 ${internalEtc}/${ofFileName}`;
//   const chmodAllCmd = `docker exec ${containerName} chmod 644 ${internalEtc}/${ofFileName} ${internalEtc}/keystore.jks ${internalEtc}/truststore.jks`;

//   console.log(`[Orchestrator] ONOS Dynamic TLS ${enable ? 'Activation' : 'Deactivation'} Initiated...`);

//   exec(copyCfgCmd, (errCfg) => {
//     if (errCfg) {
//       console.error("[Orchestrator Error] Failed to copy config file to container:", errCfg.message);
//       return;
//     }

//     if (fs.existsSync(tempOfFile)) fs.unlinkSync(tempOfFile);

//     if (enable) {
//       exec(copyKeysCmd, (errKeys) => {
//         if (errKeys) {
//           console.error("[Orchestrator Error] Failed to copy keystores to container:", errKeys.message);
//           return;
//         }
//         exec(chmodAllCmd, (errPerm) => {
//           if (errPerm) {
//             console.error("[Orchestrator Error] Failed to set all permissions:", errPerm.message);
//             return;
//           }
//           exec(restartContainerCmd, () => {
//             console.log("[Orchestrator] ONOS container successfully restarted with TLS ENABLED.");
//           });
//         });
//       });
//     } else {
//       exec(chmodCfgOnlyCmd, (errPerm) => {
//         if (errPerm) {
//           console.error("[Orchestrator Error] Failed to set config file permissions:", errPerm.message);
//           return;
//         }
//         exec(restartContainerCmd, () => {
//           console.log("[Orchestrator] ONOS container successfully restarted with TLS DISABLED.");
//         });
//       });
//     }
//   });
// }


import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execP = promisify(exec);

// Concurrency locks to prevent duplicate updates
let isOdlTlsUpdating = false;
let onosInFlight = null; // shared promise so duplicate requests wait for the same result

/**
 * Portability Helper: Resolves variables like ${VM_USER}, $VM_USER, or tildes (~) on the fly
 */
function resolvePortablePath(rawPath) {
  if (!rawPath) return "";
  const systemUser = process.env.VM_USER || os.userInfo().username;
  return rawPath
    .replace(/\${VM_USER}/g, systemUser)
    .replace(/\$VM_USER/g, systemUser)
    .replace(/^~/, os.homedir());
}

/**
 * Helper to safely update specific keys in a properties (.cfg) file
 */
function updatePropertiesFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf8");
  }
  let content = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^\\s*${key}\\s*=.*`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Configure ODL TLS Status dynamically (RESTCONF) and fallback write to disk
 */
export async function updateOdlTlsConfig(enable) {
  if (isOdlTlsUpdating) {
    console.log("[Orchestrator Guard] ODL TLS update in progress. Request ignored.");
    return;
  }
  isOdlTlsUpdating = true;

  const vmUser = process.env.VM_USER || os.userInfo().username;
  const rawEtcPath = process.env.ODL_ETC_PATH || `/home/${vmUser}/karaf-0.23.0/etc`;
  const odlEtcPath = resolvePortablePath(rawEtcPath);

  const ofPluginPath = path.join(odlEtcPath, "org.opendaylight.openflowplugin.cfg");
  const ofJavaPath = path.join(odlEtcPath, "org.opendaylight.openflowjava.cfg");
  const odlHome = path.dirname(odlEtcPath);
  const akkaPath = path.join(odlHome, "configuration", "initial", "akka.conf");

  console.log(`[Orchestrator] Updating ODL Local CFG files on disk (Path: ${odlEtcPath})`);

  const absKeystorePath = path.join(odlEtcPath, "opendaylight-keystore.jks");
  const absTruststorePath = path.join(odlEtcPath, "opendaylight-truststore.jks");

  const diskUpdates = {
    "use-transport-tls": enable,
    "transport-protocol": enable ? "TLS" : "TCP",
    "tls-keystore-path": absKeystorePath,
    "tls-keystore-password": "changeit",
    "tls-keystore-type": "PKCS12",
    "tls-truststore-path": absTruststorePath,
    "tls-truststore-password": "changeit",
    "tls-truststore-type": "PKCS12",
  };

  try {
    updatePropertiesFile(ofPluginPath, diskUpdates);
    updatePropertiesFile(ofJavaPath, diskUpdates);

    if (fs.existsSync(akkaPath)) {
      let content = fs.readFileSync(akkaPath, "utf8");
      const searchString = 'enabled-transports = ["akka.remote.netty.ssl"]';
      const disableString = 'enabled-transports = ["akka.remote.netty.tcp"]';
      content = enable
        ? content.replace(disableString, searchString)
        : content.replace(searchString, disableString);
      fs.writeFileSync(akkaPath, content, "utf8");
    }
  } catch (writeErr) {
    isOdlTlsUpdating = false;
    console.error("[Orchestrator Error] Failed to write ODL config files:", writeErr.message);
    throw writeErr;
  }

  console.log(`[Orchestrator] Sending RESTCONF API payload to OpenDaylight...`);
  const odlUser = process.env.ODL_USER || "admin";
  const odlPass = process.env.ODL_PASS || "admin";
  const authHeader = "Basic " + Buffer.from(`${odlUser}:${odlPass}`).toString("base64");

  const defaultImplPayload = enable
    ? {
        "openflow-switch-connection-config:switch-connection-config": [
          {
            "instance-name": "openflow-switch-connection-provider-default-impl",
            "port": 6653,
            "transport-protocol": "TLS",
            "group-add-mod-enabled": false,
            "channel-outbound-queue-size": 1024,
            "tls": {
              "truststore-path-type": "PATH",
              "keystore-path-type": "PATH",
              "keystore-password": "changeit",
              "truststore-type": "PKCS12",
              "keystore": absKeystorePath,
              "truststore": absTruststorePath,
              "certificate-password": "changeit",
              "keystore-type": "PKCS12",
              "truststore-password": "changeit",
            },
          },
        ],
      }
    : {
        "openflow-switch-connection-config:switch-connection-config": [
          {
            "instance-name": "openflow-switch-connection-provider-default-impl",
            "port": 6653,
            "transport-protocol": "TCP",
            "group-add-mod-enabled": false,
            "channel-outbound-queue-size": 1024,
          },
        ],
      };

  const legacyImplPayload = {
    "openflow-switch-connection-config:switch-connection-config": [
      {
        "instance-name": "openflow-switch-connection-provider-legacy-impl",
        "port": 6633,
        "transport-protocol": "TCP",
        "group-add-mod-enabled": false,
        "channel-outbound-queue-size": 1024,
      },
    ],
  };

  try {
    await fetch(
      "http://127.0.0.1:8181/rests/data/openflow-switch-connection-config:switch-connection-config=openflow-switch-connection-provider-default-impl",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(defaultImplPayload),
      }
    );

    await fetch(
      "http://127.0.0.1:8181/rests/data/openflow-switch-connection-config:switch-connection-config=openflow-switch-connection-provider-legacy-impl",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(legacyImplPayload),
      }
    );

    console.log("[Orchestrator] ODL configuration successfully updated and hot-reloaded.");
  } catch (apiErr) {
    console.error(
      "[Orchestrator Warning] ODL RESTCONF connection refused. File configs updated on disk:",
      apiErr.message
    );
  } finally {
    isOdlTlsUpdating = false;
  }
}

/**
 * Build the OpenFlowControllerImpl .cfg body.
 * `lastUpdated` changes on every call, so Config Admin always sees a real change
 * and always calls modified() on the ONOS component (identical files are ignored).
 */
function buildOnosCfg(enable, etc, mode) {
  const stamp = Date.now();
  return enable
    ? `tlsMode = ${mode}
keyStore = ${etc}/controller-keystore.jks
keyStorePassword = changeit
trustStore = ${etc}/controller-truststore.jks
trustStorePassword = changeit
openflowPorts = 6653,6633
lastUpdated = ${stamp}
`
    : `tlsMode = disabled
keyStore =
keyStorePassword =
trustStore =
trustStorePassword =
openflowPorts = 6653,6633
lastUpdated = ${stamp}
`;
}

/**
 * Public entry point. If an update is already running (React StrictMode fires the
 * request twice), the duplicate waits for the same result instead of being ignored,
 * so the UI never shows a false "success".
 */
export function updateOnosTlsConfig(enable) {
  if (onosInFlight) {
    console.log("[Orchestrator Guard] ONOS TLS update already running, waiting for its result.");
    return onosInFlight;
  }
  onosInFlight = applyOnosTls(enable).finally(() => {
    onosInFlight = null;
  });
  return onosInFlight;
}

async function applyOnosTls(enable) {
  const onMode = process.env.ONOS_TLS_MODE || "enabled"; // defaults to enabled (mTLS)

  const mode = enable ? onMode : "disabled";
  const ofFileName = "org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg";

  if (process.env.ONOS_RUNNING_IN_DOCKER === "true") {
    // ---------------- DOCKER ONOS ----------------
    // ONOS_TLS_STRATEGY=live    (default) drop the cfg into the container, ONOS reloads it, no restart
    // ONOS_TLS_STRATEGY=restart the ONOS 2.5 technique: drop the cfg, then `docker restart`
    const strategy = (process.env.ONOS_TLS_STRATEGY || "live").toLowerCase();
    const c = process.env.ONOS_CONTAINER_NAME || "onos-2.7";
    const etc = process.env.ONOS_INTERNAL_ETC || "/root/onos/apache-karaf-4.2.9/etc";
    const logFile = "/root/onos/apache-karaf-4.2.9/data/log/karaf.log";
    const hostTlsDir = resolvePortablePath(
      process.env.CERTS_DIR ||
        process.env.ONOS_HOST_TLS_DIR ||
        `/home/${os.userInfo().username}/sdn-certs`
    );
    const tempOfFile = path.join(os.tmpdir(), ofFileName);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    console.log(`[Orchestrator] Docker ONOS TLS -> ${mode.toUpperCase()} (strategy: ${strategy})`);

    // Fail fast if the container isn't even running
    const { stdout: running } = await execP(`docker inspect -f '{{.State.Running}}' ${c}`).catch(() => ({
      stdout: "false",
    }));
    if (!running.trim().includes("true")) {
      throw new Error(`Container '${c}' is not running. Start it first (docker start ${c}).`);
    }

    // The mode ONOS is RUNNING in = last "TlsParams{tlsMode=..." line in karaf.log
    const runningMode = async () => {
      try {
        const { stdout } = await execP(
          `docker exec ${c} sh -c "grep -o 'TlsParams{tlsMode=[a-z]*' ${logFile} | tail -1"`
        );
        const m = stdout.match(/tlsMode=(\w+)/);
        return m ? m[1] : null;
      } catch {
        return null;
      }
    };
    const waitForMode = async (seconds) => {
      for (let waited = 0; waited < seconds; waited += 2) {
        await sleep(2000);
        if ((await runningMode()) === mode) return true;
      }
      return false;
    };

    // 1. Keystores first (must exist before the config points at them)
    if (enable) {
      await execP(`docker cp "${hostTlsDir}/controller-keystore.jks" ${c}:${etc}/`);
      await execP(`docker cp "${hostTlsDir}/controller-truststore.jks" ${c}:${etc}/`);
      await execP(
        `docker exec ${c} chmod 644 ${etc}/controller-keystore.jks ${etc}/controller-truststore.jks`
      );
    }

    // 2. Drop the .cfg file into the container
    fs.writeFileSync(tempOfFile, buildOnosCfg(enable, etc, mode), "utf8");
    try {
      await execP(`docker cp "${tempOfFile}" ${c}:${etc}/${ofFileName}`);
      await execP(`docker exec ${c} chmod 644 ${etc}/${ofFileName}`);
    } finally {
      if (fs.existsSync(tempOfFile)) fs.unlinkSync(tempOfFile);
    }

    // 3a. RESTART strategy (ONOS 2.5 technique): restart, then wait for the mode to show up
    if (strategy === "restart") {
      console.log("[Orchestrator] Restarting the ONOS container...");
      await execP(`docker restart ${c}`);
      // ONOS needs ~1-3 min to boot; poll the log for the new mode
      if (await waitForMode(240)) {
        console.log(`[Orchestrator] ONOS came back in tlsMode=${mode}.`);
        return;
      }
    } else {
      // 3b. LIVE strategy: ONOS reloads the cfg in a few seconds
      if (await waitForMode(30)) {
        console.log(`[Orchestrator] ONOS applied tlsMode=${mode} live (no restart).`);
        return;
      }
    }

    // 4. Failed: report what ONOS says (OVS reconnect noise filtered out)
    let diag = "";
    try {
      const { stdout } = await execP(
        `docker exec ${c} sh -c "date; ls -l --time-style=full-iso ${etc}/${ofFileName}; grep -E 'TLS Params|OpenFlow IO|Updating configuration|eystore|SSLContext|Exception' ${logFile} | grep -vE 'wire version|OFChannelHandler|DecoderException' | tail -10 | cut -c1-230"`
      );
      diag = stdout.trim();
    } catch (e) {
      diag = `could not read container state: ${e.message}`;
    }
    throw new Error(`ONOS still reports tlsMode=${await runningMode()} (wanted ${mode}).\n${diag}`);
  }

  // ---------------- NATIVE ONOS ----------------
  const onosRoot = process.env.ONOS_ROOT || "/opt/onos-native";
  const etc = path.join(onosRoot, "apache-karaf-4.2.9", "etc");
  const vmUser = process.env.VM_USER || os.userInfo().username;
  const hostTlsDir = resolvePortablePath(process.env.CERTS_DIR || `/home/${vmUser}/sdn-certs`);

  console.log(`[Orchestrator] Native ONOS TLS -> ${mode.toUpperCase()}`);

  if (enable) {
    const keystoreSrc = path.join(hostTlsDir, "controller-keystore.jks");
    const truststoreSrc = path.join(hostTlsDir, "controller-truststore.jks");
    if (!fs.existsSync(keystoreSrc) || !fs.existsSync(truststoreSrc)) {
      throw new Error(`Keystores not found in ${hostTlsDir}. Run ./generate-certs.sh first.`);
    }
    fs.copyFileSync(keystoreSrc, path.join(etc, "controller-keystore.jks"));
    fs.copyFileSync(truststoreSrc, path.join(etc, "controller-truststore.jks"));
  }

  fs.writeFileSync(path.join(etc, ofFileName), buildOnosCfg(enable, etc, mode), "utf8");
  await execP("sudo systemctl restart onos");
  console.log(`[Orchestrator] Native ONOS restarted with TLS ${enable ? "ENABLED" : "DISABLED"}.`);
}