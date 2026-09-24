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

# CERTS_DIR="${CERTS_DIR:-$HOME/sdn-certs}"
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
#   local client="${ONOS_KARAF_CLIENT:-/root/onos/apache-karaf-4.2.9/bin/client}"
#   local onos_user="${ONOS_USER:-onos}"
#   local onos_pass="${ONOS_PASS:-rocks}"

#   echo "[+] Checking ONOS container '${container}'..."
#   if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
#     echo "[!] Container '${container}' is not running. Starting it now..."
#     docker start "${container}"
#     sleep 15
#   fi

#   echo "[+] Copying JKS keystores into the container..."
#   docker cp "${CERTS_DIR}/controller-keystore.jks" "${container}:${internal_etc}/"
#   docker cp "${CERTS_DIR}/controller-truststore.jks" "${container}:${internal_etc}/"
#   docker exec "${container}" chmod 644 "${internal_etc}/controller-keystore.jks" "${internal_etc}/controller-truststore.jks"

#   echo "[+] Activating OpenFlow provider application..."
#   docker exec -it "${container}" "${client}" -u "${onos_user}" -p "${onos_pass}" \
#     "app activate org.onosproject.openflow" || true

#   echo "[+] Applying OpenFlowControllerImpl TLS configuration (Including strict mode)..."
#   docker exec -it "${container}" "${client}" -u "${onos_user}" -p "${onos_pass}" \
#     "cfg set org.onosproject.openflow.controller.impl.OpenFlowControllerImpl keyStore ${internal_etc}/controller-keystore.jks"
#   docker exec -it "${container}" "${client}" -u "${onos_user}" -p "${onos_pass}" \
#     "cfg set org.onosproject.openflow.controller.impl.OpenFlowControllerImpl keyStorePassword ${PASS}"
#   docker exec -it "${container}" "${client}" -u "${onos_user}" -p "${onos_pass}" \
#     "cfg set org.onosproject.openflow.controller.impl.OpenFlowControllerImpl trustStore ${internal_etc}/controller-truststore.jks"
#   docker exec -it "${container}" "${client}" -u "${onos_user}" -p "${onos_pass}" \
#     "cfg set org.onosproject.openflow.controller.impl.OpenFlowControllerImpl trustStorePassword ${PASS}"
#   # THIS LINE WAS MISSING FROM THE AUTOMATION SCRIPT:
#   docker exec -it "${container}" "${client}" -u "${onos_user}" -p "${onos_pass}" \
#     "cfg set org.onosproject.openflow.controller.impl.OpenFlowControllerImpl tlsMode strict"

#   echo "[i] Keystores and strict mode set. Restarting container for clean socket bind..."
#   docker restart "${container}"
#   echo "[✓] ONOS provisioning complete."
# }

# provision_odl() {
#   local etc="${ODL_ETC_PATH:-$HOME/karaf-0.23.0/etc}"

#   echo "[+] Copying PKCS12 keystores to ${etc}..."
#   mkdir -p "${etc}"
#   cp "${CERTS_DIR}/opendaylight-keystore.jks" "${etc}/"
#   cp "${CERTS_DIR}/opendaylight-truststore.jks" "${etc}/"
#   chmod 644 "${etc}/opendaylight-"*.jks

#   echo "[✓] OpenDaylight provisioning complete."
# }

# case "$TARGET" in
#   onos) provision_onos ;;
#   odl)  provision_odl ;;
#   *)
#     echo "Usage: ./provision-tls.sh [onos|odl]"
#     exit 1
#     ;;
# esac


####version 2

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

# CERTS_DIR="${CERTS_DIR:-$HOME/sdn-certs}"
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

#   echo "[+] Generating configuration file (tlsMode = ${tls_mode})..."
#   cat <<EOF > "${temp_cfg}"
# tlsMode = ${tls_mode}
# keyStore = ${internal_etc}/controller-keystore.jks
# keyStorePassword = ${PASS}
# trustStore = ${internal_etc}/controller-truststore.jks
# trustStorePassword = ${PASS}
# openflowPorts = 6653,6633
# lastUpdated = $(date +%s%N)
# EOF

#   echo "[+] Injecting configuration directly into ${internal_etc}/${of_file}..."
#   docker cp "${temp_cfg}" "${container}:${internal_etc}/${of_file}"
#   docker exec "${container}" chmod 644 "${internal_etc}/${of_file}"
#   rm -f "${temp_cfg}"

#   echo "[i] Restarting container to ensure clean socket bind..."
#   docker restart "${container}"
#   echo "[✓] ONOS provisioned successfully with tlsMode = ${tls_mode}."
# }

# provision_odl() {
#   local etc="${ODL_ETC_PATH:-$HOME/karaf-0.23.0/etc}"

#   echo "[+] Copying PKCS12 keystores to ${etc}..."
#   mkdir -p "${etc}"
#   cp "${CERTS_DIR}/opendaylight-keystore.jks" "${etc}/"
#   cp "${CERTS_DIR}/opendaylight-truststore.jks" "${etc}/"
#   chmod 644 "${etc}/opendaylight-"*.jks

#   echo "[✓] OpenDaylight provisioning complete."
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

# Safely read .env key=value pairs
if [ -f .env ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [[ ! "$key" =~ ^# ]] && [[ -n "$key" ]]; then
      value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^["'\''\(]*//;s/["'\''\)]*$//')
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

provision_onos() {
  local container="${ONOS_CONTAINER_NAME:-onos-2.7}"
  local internal_etc="${ONOS_INTERNAL_ETC:-/root/onos/apache-karaf-4.2.9/etc}"
  local tls_mode="${ONOS_TLS_MODE:-enabled}"
  local of_file="org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg"
  local temp_cfg="/tmp/${of_file}"

  echo "[+] Checking ONOS container '${container}'..."
  if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    echo "[!] Container '${container}' is not running. Starting it now..."
    docker start "${container}"
    sleep 10
  fi

  echo "[+] Copying JKS keystores into the container..."
  docker cp "${CERTS_DIR}/controller-keystore.jks" "${container}:${internal_etc}/"
  docker cp "${CERTS_DIR}/controller-truststore.jks" "${container}:${internal_etc}/"
  docker exec "${container}" chmod 644 "${internal_etc}/controller-keystore.jks" "${internal_etc}/controller-truststore.jks"

  echo "[+] Generating Southbound OpenFlow configuration file (tlsMode = ${tls_mode})..."
  cat <<EOF > "${temp_cfg}"
tlsMode = ${tls_mode}
keyStore = ${internal_etc}/controller-keystore.jks
keyStorePassword = ${PASS}
trustStore = ${internal_etc}/controller-truststore.jks
trustStorePassword = ${PASS}
openflowPorts = 6653,6633
lastUpdated = $(date +%s%N)
EOF

  echo "[+] Injecting configuration into ${internal_etc}/${of_file}..."
  docker cp "${temp_cfg}" "${container}:${internal_etc}/${of_file}"
  docker exec "${container}" chmod 644 "${internal_etc}/${of_file}"
  rm -f "${temp_cfg}"

  echo "[i] Restarting ONOS container for clean socket initialization..."
  docker restart "${container}"
  echo "[✓] ONOS provisioned successfully for Southbound OpenFlow TLS (6653)."
}

provision_odl() {
  local etc="${ODL_ETC_PATH}"

  echo "[+] Copying PKCS12 keystores to ${etc}..."
  mkdir -p "${etc}"
  cp "${CERTS_DIR}/opendaylight-keystore.jks" "${etc}/"
  cp "${CERTS_DIR}/opendaylight-truststore.jks" "${etc}/"
  chmod 644 "${etc}/opendaylight-"*.jks

  echo "[✓] OpenDaylight provisioned successfully for Southbound OpenFlow TLS (6653)."
}

case "$TARGET" in
  onos) provision_onos ;;
  odl)  provision_odl ;;
  *)
    echo "Usage: ./provision-tls.sh [onos|odl]"
    exit 1
    ;;
esac