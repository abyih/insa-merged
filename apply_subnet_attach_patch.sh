#!/usr/bin/env bash
# apply_subnet_attach_patch.sh
# Adds automatic subnet creation (Nova refuses to attach VMs to a
# subnet-less network) and automatic attachment of selected VMs to the
# slice's own network, directly inside POST /api/slices - so creating a
# slice through the UI is enough; no manual openstack CLI steps needed.
# Run this from ~/Insa-dluxf (the project root).

set -euo pipefail

SERVER=server.js

if [ ! -f "$SERVER" ]; then
  echo "ERROR: $SERVER not found. Run this script from ~/Insa-dluxf"
  exit 1
fi

ANCHOR='    networkId = networkData.network.id;'

count=$(grep -cF "$ANCHOR" "$SERVER")
if [ "$count" -ne 1 ]; then
  echo "ERROR: anchor 'networkId = networkData.network.id;' found $count times (expected exactly 1). Aborting, no changes made."
  exit 1
fi

echo "Anchor verified unique. Backing up $SERVER..."
cp "$SERVER" "${SERVER}.subnetattach.bak"

TMPDIR=$(mktemp -d)

cat > "$TMPDIR/insert.txt" <<'EOF'

    // 1b. Create a subnet on this new network - Nova refuses to attach any
    //     VM to a network with no subnet, so without this every slice would
    //     be unusable by real VMs. CIDR is derived from the slice id (with
    //     retries on collision) so different slices don't overlap.
    let subnetCreated = false;
    for (let attempt = 0; attempt < 5 && !subnetCreated; attempt++) {
      const octet = (parseInt(id.replace(/-/g, "").slice(attempt * 2, attempt * 2 + 2), 16) % 254) + 1;
      try {
        await osJson(`${NEUTRON_URL}/subnets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subnet: {
              network_id: networkId,
              ip_version: 4,
              cidr: `10.200.${octet}.0/24`,
              name: `${networkName}-subnet`,
            },
          }),
        });
        subnetCreated = true;
      } catch (subnetErr) {
        if (attempt === 4) throw subnetErr;
      }
    }

    // 1c. Attach each selected VM's port directly to this slice's network.
    //     Bandwidth cap and DSCP marking apply at the network level, so a
    //     VM only actually experiences them once it has a real port on
    //     this specific network - simply listing it in vmIds is not
    //     enough. Priority (the OVS queue, applied further below) does not
    //     depend on this attachment, since it targets the VM's port
    //     directly wherever it already is.
    const vmAttachResults = [];
    for (const vmId of b.vmIds || []) {
      try {
        await osJson(`${NOVA_URL}/servers/${vmId}/os-interface`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interfaceAttachment: { net_id: networkId } }),
        });
        vmAttachResults.push({ vmId, attached: true });
      } catch (attachErr) {
        console.error(`Slice Manager: failed to attach VM ${vmId} to slice network:`, attachErr.message);
        vmAttachResults.push({ vmId, attached: false, error: attachErr.message });
      }
    }
EOF

awk -v r="$TMPDIR/insert.txt" -v anchor="$ANCHOR" '
  { print }
  $0 == anchor { while ((getline line < r) > 0) print line; close(r) }
' "$SERVER" > "$TMPDIR/server.new"

mv "$TMPDIR/server.new" "$SERVER"
rm -rf "$TMPDIR"

echo "Patched $SERVER:"
echo "  - POST /api/slices now auto-creates a subnet on the new network"
echo "  - POST /api/slices now auto-attaches every selected VM to the slice's network"
echo ""
echo "Backup saved as ${SERVER}.subnetattach.bak"
echo "Run: node --check server.js"
