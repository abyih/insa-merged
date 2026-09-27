# #!/usr/bin/env bash
# set -e

# # Safely read .env key=value pairs
# if [ -f .env ]; then
#   while IFS='=' read -r key value || [ -n "$key" ]; do
#     key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
#     if [[ ! "$key" =~ ^# ]] && [[ -n "$key" ]]; then
#       value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^["'\''\(]*//;s/["'\''\)]*$//')
#       export "$key"="$value" 2>/dev/null || true
#     fi
#   done < .env
# fi

# CURRENT_USER="${VM_USER:-$USER}"
# RAW_CERTS_DIR="${CERTS_DIR:-$HOME/sdn-certs}"
# CERTS_DIR=$(echo "$RAW_CERTS_DIR" | sed "s|\${VM_USER}|$CURRENT_USER|g; s|\$VM_USER|$CURRENT_USER|g; s|^~|$HOME|")

# RAW_ODL_ETC="${ODL_ETC_PATH:-$HOME/karaf-0.23.0/etc}"
# ODL_ETC_PATH=$(echo "$RAW_ODL_ETC" | sed "s|\${VM_USER}|$CURRENT_USER|g; s|\$VM_USER|$CURRENT_USER|g; s|^~|$HOME|")

# PASS="${TLS_KEYSTORE_PASSWORD:-changeit}"
# TARGET="${1:-}"

# if [ -z "$TARGET" ]; then
#   echo "Usage: ./provision-tls.sh [onos|odl]"
#   exit 1
# fi

# if [ ! -f "${CERTS_DIR}/ca-cert.pem" ]; then
#   echo "[✗] No certificates found in ${CERTS_DIR}. Run ./generate-certs.sh first."
#   exit 1
# fi

# provision_onos() {
#   local container="${ONOS_CONTAINER_NAME:-onos-2.7}"
#   local internal_etc="${ONOS_INTERNAL_ETC:-/root/onos/apache-karaf-4.2.9/etc}"
#   local tls_mode="${ONOS_TLS_MODE:-enabled}"
#   local of_file="org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg"
#   local temp_cfg="/tmp/${of_file}"

#   echo "[+] Checking ONOS container '${container}'..."
#   if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
#     echo "[!] Container '${container}' is not running. Starting it now..."
#     docker start "${container}"
#     sleep 10
#   fi

#   echo "[+] Copying JKS keystores into the container..."
#   docker cp "${CERTS_DIR}/controller-keystore.jks" "${container}:${internal_etc}/"
#   docker cp "${CERTS_DIR}/controller-truststore.jks" "${container}:${internal_etc}/"
#   docker exec "${container}" chmod 644 "${internal_etc}/controller-keystore.jks" "${internal_etc}/controller-truststore.jks"

#   echo "[+] Generating Southbound OpenFlow configuration file (tlsMode = ${tls_mode})..."
#   cat <<EOF > "${temp_cfg}"
# tlsMode = ${tls_mode}
# keyStore = ${internal_etc}/controller-keystore.jks
# keyStorePassword = ${PASS}
# trustStore = ${internal_etc}/controller-truststore.jks
# trustStorePassword = ${PASS}
# openflowPorts = 6653,6633
# lastUpdated = $(date +%s%N)
# EOF

#   echo "[+] Injecting configuration into ${internal_etc}/${of_file}..."
#   docker cp "${temp_cfg}" "${container}:${internal_etc}/${of_file}"
#   docker exec "${container}" chmod 644 "${internal_etc}/${of_file}"
#   rm -f "${temp_cfg}"

#   echo "[+] Configuring Northbound HTTPS listener (port 8443, provisioned OFF)..."
#   if ! docker exec "${container}" sh -c "grep -q 'org.ops4j.pax.web.ssl.keystore' ${internal_etc}/org.ops4j.pax.web.cfg 2>/dev/null"; then
#     local pax_add="/tmp/pax-web-northbound.cfg"
#     cat > "${pax_add}" <<EOF
# org.osgi.service.http.port.secure = 8443
# org.osgi.service.http.secure.enabled = false
# org.ops4j.pax.web.ssl.keystore = ${internal_etc}/controller-keystore.jks
# org.ops4j.pax.web.ssl.keystore.type = JKS
# org.ops4j.pax.web.ssl.password = ${PASS}
# org.ops4j.pax.web.ssl.keypassword = ${PASS}
# EOF
#     docker cp "${pax_add}" "${container}:${internal_etc}/pax-web-northbound.cfg"
#     docker exec "${container}" sh -c "cat ${internal_etc}/pax-web-northbound.cfg >> ${internal_etc}/org.ops4j.pax.web.cfg && rm ${internal_etc}/pax-web-northbound.cfg"
#     rm -f "${pax_add}"
#   fi


#   echo "[i] Restarting ONOS container for clean socket initialization..."
#   docker restart "${container}"
#   echo "[✓] ONOS provisioned successfully for Southbound OpenFlow TLS (6653)."
# }

# provision_odl() {
#   local etc="${ODL_ETC_PATH}"

#   echo "[+] Copying PKCS12 keystores to ${etc}..."
#   mkdir -p "${etc}"
#   cp "${CERTS_DIR}/opendaylight-keystore.jks" "${etc}/"
#   cp "${CERTS_DIR}/opendaylight-truststore.jks" "${etc}/"
#   chmod 644 "${etc}/opendaylight-"*.jks

#     local pax_file="${etc}/org.ops4j.pax.web.cfg"
#   if ! grep -q "org.ops4j.pax.web.ssl.keystore" "${pax_file}" 2>/dev/null; then
#     echo "[+] Configuring Northbound HTTPS listener (port 8443, provisioned OFF)..."
#     cat >> "${pax_file}" <<EOF
# org.osgi.service.http.port.secure = 8443
# org.osgi.service.http.secure.enabled = false
# org.ops4j.pax.web.ssl.keystore = ${etc}/opendaylight-keystore.jks
# org.ops4j.pax.web.ssl.keystore.type = PKCS12
# org.ops4j.pax.web.ssl.password = ${PASS}
# org.ops4j.pax.web.ssl.keypassword = ${PASS}
# EOF
#   fi

#   echo "[✓] OpenDaylight provisioned successfully for Southbound OpenFlow TLS (6653)."
# }

# case "$TARGET" in
#   onos) provision_onos ;;
#   odl)  provision_odl ;;
#   *)
#     echo "Usage: ./provision-tls.sh [onos|odl]"
#     exit 1
#     ;;
# esac

#!/usr/bin/env bash
set -e

# -----------------------------
# Load .env safely
# -----------------------------
if [ -f .env ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [[ ! "$key" =~ ^# ]] && [[ -n "$key" ]]; then
      value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^["'\''(]*//;s/["'\''\)]*$//')
      export "$key"="$value" 2>/dev/null || true
    fi
  done < .env
fi

CURRENT_USER="${VM_USER:-$USER}"
RAW_CERTS_DIR="${CERTS_DIR:-$HOME/sdn-certs}"
CERTS_DIR=$(echo "$RAW_CERTS_DIR" | sed "s|\${VM_USER}|$CURRENT_USER|g; s|\$VM_USER|$CURRENT_USER|g; s|^~|$HOME|")

RAW_ODL_ETC="${ODL_ETC_PATH:-$HOME/karaf-0.23.0/etc}"
ODL_ETC_PATH=$(echo "$RAW_ODL_ETC" | sed "s|\${VM_USER}|$CURRENT_USER|g; s|\$VM_USER|$CURRENT_USER|g; s|^~|$HOME|")

PASS="${TLS_KEYSTORE_PASSWORD:-changeit}"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Usage: ./provision-tls.sh [onos|odl]"
  exit 1
fi

if [ ! -f "${CERTS_DIR}/ca-cert.pem" ]; then
  echo "[✗] No certificates found in ${CERTS_DIR}. Run ./generate-certs.sh first."
  exit 1
fi

# -----------------------------
# ONOS TLS provisioning
# -----------------------------
provision_onos() {
  local container="${ONOS_CONTAINER_NAME:-onos-2.7}"
  local internal_etc="${ONOS_INTERNAL_ETC:-/root/onos/apache-karaf-4.2.9/etc}"
  local tls_mode="${ONOS_TLS_MODE:-enabled}"
  local of_file="org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg"
  local temp_cfg="/tmp/${of_file}"

  echo "[+] Checking ONOS container '${container}'..."
  if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    echo "[!] Container not running. Starting..."
    docker start "${container}"
    sleep 10
  fi

  echo "[+] Copying keystores..."
  docker cp "${CERTS_DIR}/controller-keystore.jks" "${container}:${internal_etc}/"
  docker cp "${CERTS_DIR}/controller-truststore.jks" "${container}:${internal_etc}/"
  docker exec "${container}" chmod 644 "${internal_etc}/controller-keystore.jks" "${internal_etc}/controller-truststore.jks"

  cat <<EOF > "${temp_cfg}"
tlsMode = ${tls_mode}
keyStore = ${internal_etc}/controller-keystore.jks
keyStorePassword = ${PASS}
trustStore = ${internal_etc}/controller-truststore.jks
trustStorePassword = ${PASS}
openflowPorts = 6653,6633
lastUpdated = $(date +%s%N)
EOF

  docker cp "${temp_cfg}" "${container}:${internal_etc}/${of_file}"
  docker exec "${container}" chmod 644 "${internal_etc}/${of_file}"
  rm -f "${temp_cfg}"

  echo "[+] Configuring ONOS northbound HTTPS..."

  if ! docker exec "${container}" sh -c "grep -q 'org.ops4j.pax.web.ssl.keystore' ${internal_etc}/org.ops4j.pax.web.cfg 2>/dev/null"; then
    local pax_add="/tmp/pax-web-northbound.cfg"

    cat > "${pax_add}" <<EOF
org.osgi.service.http.port.secure = 8443
org.osgi.service.http.secure.enabled = false
org.ops4j.pax.web.ssl.keystore = ${internal_etc}/controller-keystore.jks
org.ops4j.pax.web.ssl.keystore.type = JKS
org.ops4j.pax.web.ssl.password = ${PASS}
org.ops4j.pax.web.ssl.keypassword = ${PASS}
EOF

    docker cp "${pax_add}" "${container}:${internal_etc}/pax-web-northbound.cfg"
    docker exec "${container}" sh -c "cat ${internal_etc}/pax-web-northbound.cfg >> ${internal_etc}/org.ops4j.pax.web.cfg && rm ${internal_etc}/pax-web-northbound.cfg"
    rm -f "${pax_add}"
  fi

  echo "[i] Restarting ONOS..."
  docker restart "${container}"
  echo "[✓] ONOS TLS provisioned (6653)."
}

# -----------------------------
# ODL TLS provisioning (FIXED)
# -----------------------------
provision_odl() {
  local etc="${ODL_ETC_PATH}"

  echo "[+] Checking ODL etc: ${etc}"

  if [ ! -d "${etc}" ]; then
    echo "[!] ODL etc directory not found: ${etc}"
    exit 1
  fi

  echo "[+] Copying keystores..."
  if [ -f "${CERTS_DIR}/opendaylight-keystore.jks" ]; then
    cp "${CERTS_DIR}/opendaylight-keystore.jks" "${etc}/"
    cp "${CERTS_DIR}/opendaylight-truststore.jks" "${etc}/"
    chmod 644 "${etc}"/opendaylight-*.jks
  else
    echo "[!] Keystore not found in ${CERTS_DIR}! Creating a fallback keystore..."
    keytool -genkeypair -alias controller -keyalg RSA -keysize 2048 -validity 365 \
      -keystore "${etc}/opendaylight-keystore.jks" \
      -storepass "${PASS:-opendaylight}" -keypass "${PASS:-opendaylight}" \
      -dname "CN=localhost, OU=Dev, O=OpenDaylight, L=Montreal, C=CA"
  fi

  local pax_file="${etc}/org.ops4j.pax.web.cfg"

  # Clean any previous broken ssl configs from the file
  sed -i '/org.ops4j.pax.web.ssl/d' "${pax_file}" 2>/dev/null || true
  sed -i '/org.osgi.service.http.port.secure/d' "${pax_file}" 2>/dev/null || true
  sed -i '/org.osgi.service.http.secure.enabled/d' "${pax_file}" 2>/dev/null || true

  echo "[+] Applying clean TLS config (NO spaces around '=')..."
  # Notice: NO SPACES around '=', and keystore.type matches JKS
  cat >> "${pax_file}" <<EOF
org.osgi.service.http.port=8181
org.osgi.service.http.enabled=true
org.osgi.service.http.port.secure=8443
org.osgi.service.http.secure.enabled=false
org.ops4j.pax.web.ssl.keystore=${etc}/opendaylight-keystore.jks
org.ops4j.pax.web.ssl.keystore.type=JKS
org.ops4j.pax.web.ssl.password=${PASS:-opendaylight}
org.ops4j.pax.web.ssl.keypassword=${PASS:-opendaylight}
org.ops4j.pax.web.ssl.clientauthneeded=false
EOF

  echo "[✓] OpenDaylight TLS provisioned safely."
}

# -----------------------------
# Main
# -----------------------------
case "$TARGET" in
  onos) provision_onos ;;
  odl)  provision_odl ;;
  *)
    echo "Usage: ./provision-tls.sh [onos|odl]"
    exit 1
    ;;
esac