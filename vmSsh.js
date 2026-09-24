// vmSsh.js — SSH helper for running real network tests inside OpenStack VMs
import { Client } from "ssh2";

// Hardcoded lab credentials per image type. Adjust usernames/passwords to match
// whatever cloud image your slice VMs actually boot from.
const VM_CREDENTIALS = {
  cirros: { username: "cirros", password: "gocubsgo" }, // CirrOS default
  ubuntu: { username: "ubuntu", password: "ubuntu" },
};
const DEFAULT_IMAGE = "cirros";

function runOnVm(host, command, { image = DEFAULT_IMAGE, timeoutMs = 20000 } = {}) {
  const creds = VM_CREDENTIALS[image] || VM_CREDENTIALS[DEFAULT_IMAGE];
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timer);
            conn.end();
            return reject(err);
          }
          stream
            .on("close", (code) => {
              clearTimeout(timer);
              conn.end();
              resolve({ code, stdout, stderr });
            })
            .on("data", (data) => { stdout += data.toString(); })
            .stderr.on("data", (data) => { stderr += data.toString(); });
        });
      })
      .on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      })
      .connect({
        host,
        port: 22,
        username: creds.username,
        password: creds.password,
        readyTimeout: 10000,
        algorithms: {
          kex: ["diffie-hellman-group14-sha1", "diffie-hellman-group1-sha1", "diffie-hellman-group-exchange-sha256"],
          cipher: ["aes128-cbc", "3des-cbc", "aes128-ctr", "aes192-ctr", "aes256-ctr"],
        },
      });
  });
}

// Runs an iperf3 server in the background on the target VM (idempotent-ish: kills any prior instance first)
async function startIperfServer(host, opts) {
  await runOnVm(host, "pkill iperf3 2>/dev/null; true", opts).catch(() => {});
  // Fire-and-forget the server; don't await close since -D daemonizes
  return runOnVm(host, "iperf3 -s -D -1", opts);
}

function parsePing(raw) {
  // Handles both iputils (Ubuntu) and BusyBox (CirrOS) ping output
  const lossMatch = raw.match(/(\d+)% packet loss/);
  const rttMatch = raw.match(/= ([\d.]+)\/([\d.]+)\/([\d.]+)(?:\/([\d.]+))?/); // min/avg/max/mdev
  if (!rttMatch) {
    return { success: false, packetLoss: lossMatch ? Number(lossMatch[1]) : 100, raw };
  }
  return {
    success: true,
    min: Number(rttMatch[1]),
    avg: Number(rttMatch[2]),
    max: Number(rttMatch[3]),
    jitter: rttMatch[4] ? Number(rttMatch[4]) : null,
    packetLoss: lossMatch ? Number(lossMatch[1]) : 0,
    raw,
  };
}

function parseIperfJson(raw) {
  try {
    const data = JSON.parse(raw);
    const bitsPerSecond = data.end?.sum_received?.bits_per_second ?? data.end?.sum_sent?.bits_per_second;
    if (bitsPerSecond == null) return { success: false, raw };
    return { success: true, mbps: bitsPerSecond / 1e6, raw };
  } catch {
    return { success: false, raw };
  }
}

export { runOnVm, startIperfServer, parsePing, parseIperfJson };

// Runs a command on a VM reachable only via an internal IP, by SSHing into a
// "jump" VM (which has a floating IP) and then nested-SSHing from there to
// the target's internal IP. Mirrors what a human does manually via noVNC.
function runViaJump(jumpHost, targetInternalIp, targetCommand, { image = DEFAULT_IMAGE, timeoutMs = 20000 } = {}) {
  const creds = VM_CREDENTIALS[image] || VM_CREDENTIALS[DEFAULT_IMAGE];
  // Dropbear's ssh client (on CirrOS) uses `-y` to auto-accept unknown host
  // keys and reads the password from stdin when piped in non-interactively.
  const escapedCmd = targetCommand.replace(/'/g, `'\\''`);
  const nested = `echo '${creds.password}' | ssh -y ${creds.username}@${targetInternalIp} '${escapedCmd}'`;
  return runOnVm(jumpHost, nested, { image, timeoutMs });
}

export { runViaJump };
