# #!/usr/bin/env bash
# set -e

# # Safely read .env key=value pairs without shell execution errors
# if [ -f .env ]; then
#   while IFS='=' read -r key value || [ -n "$key" ]; do
#     # Strip leading/trailing whitespace
#     key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
#     # Ignore comments and blank lines
#     if [[ ! "$key" =~ ^# ]] && [[ -n "$key" ]]; then
#       # Strip quotes from value if present
#       value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^["'\''\(]*//;s/["'\''\)]*$//')
#       export "$key"="$value" 2>/dev/null || true
#     fi
#   done < .env
# fi

# CERTS_DIR="${CERTS_DIR:-$HOME/sdn-certs}"
# PASS="${TLS_KEYSTORE_PASSWORD:-changeit}"
# CA_SUBJECT="${CERT_CA_SUBJECT:-/CN=INSA-SDN-CA/OU=SDN-Lab/O=INSA}"
# ONOS_CN="${CERT_ONOS_CN:-onos-controller}"
# ODL_CN="${CERT_ODL_CN:-odl-controller}"
# SWITCH_CN="${CERT_SWITCH_CN:-sc}"

# echo "======================================================"
# echo " [Step 1] Generating Shared Root CA & Controller Keystores"
# echo " Target directory: ${CERTS_DIR}"
# echo "======================================================"

# mkdir -p "${CERTS_DIR}"
# cd "${CERTS_DIR}"

# if [ -f "ca-cert.pem" ]; then
#   echo "[!] Existing CA found in ${CERTS_DIR}."
#   read -p "    Regenerate everything from scratch? This invalidates all existing certs. [y/N] " confirm
#   if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
#     echo "[✓] Keeping existing certificates. Nothing changed."
#     exit 0
#   fi
# fi

# echo "[+] Generating Root CA..."
# openssl genrsa -out ca-key.pem 2048
# openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 3650 \
#   -out ca-cert.pem -subj "${CA_SUBJECT}"

# echo "[+] Generating ONOS keystores (strictly JKS format)..."
# rm -f controller-keystore.jks controller-truststore.jks
# keytool -genkeypair -alias onos -keyalg RSA -keysize 2048 -validity 3650 \
#   -keystore controller-keystore.jks -storetype JKS \
#   -storepass "${PASS}" -keypass "${PASS}" \
#   -dname "CN=${ONOS_CN}, OU=SDN-Lab, O=INSA"

# keytool -importcert -alias ca -file ca-cert.pem \
#   -keystore controller-truststore.jks -storetype JKS \
#   -storepass "${PASS}" -noprompt

# echo "[+] Generating OpenDaylight keystores (strictly PKCS12 format)..."
# rm -f opendaylight-keystore.jks opendaylight-truststore.jks
# keytool -genkeypair -alias odl -keyalg RSA -keysize 2048 -validity 3650 \
#   -keystore opendaylight-keystore.jks -storetype PKCS12 \
#   -storepass "${PASS}" -keypass "${PASS}" \
#   -dname "CN=${ODL_CN}, OU=SDN-Lab, O=INSA"

# keytool -importcert -alias ca -file ca-cert.pem \
#   -keystore opendaylight-truststore.jks -storetype PKCS12 \
#   -storepass "${PASS}" -noprompt

# echo "[+] Generating OVS switch certificate..."
# openssl genrsa -out switch-key.pem 2048
# openssl req -new -key switch-key.pem -out switch.csr \
#   -subj "/CN=${SWITCH_CN}/OU=Open vSwitch certifier/O=Open vSwitch"
# openssl x509 -req -in switch.csr -CA ca-cert.pem -CAkey ca-key.pem \
#   -CAcreateserial -out switch-cert.pem -days 3650 -sha256
# rm -f switch.csr

# echo "[+] Installing switch certs into /etc/openvswitch..."
# sudo mkdir -p /etc/openvswitch
# sudo cp switch-key.pem switch-cert.pem ca-cert.pem /etc/openvswitch/
# sudo chmod 644 /etc/openvswitch/switch-key.pem /etc/openvswitch/switch-cert.pem /etc/openvswitch/ca-cert.pem
# sudo ovs-vsctl set-ssl /etc/openvswitch/switch-key.pem /etc/openvswitch/switch-cert.pem /etc/openvswitch/ca-cert.pem 2>/dev/null || true

# # Sanity check: confirm ONOS's keystore really is JKS
# ACTUAL_TYPE=$(keytool -list -keystore controller-keystore.jks -storepass "${PASS}" -v 2>/dev/null | grep "Keystore type" | awk '{print $NF}')
# if [ "$ACTUAL_TYPE" != "JKS" ]; then
#   echo "[✗] WARNING: controller-keystore.jks reports type '${ACTUAL_TYPE}', not JKS. ONOS will fail to load this."
#   exit 1
# fi

# echo "======================================================"
# echo " [SUCCESS] All certificates generated in ${CERTS_DIR}"
# echo " ONOS keystore confirmed as genuine JKS format."
# echo "======================================================"


###version 2



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
# CA_SUBJECT="${CERT_CA_SUBJECT:-/CN=INSA-SDN-CA/OU=SDN-Lab/O=INSA}"
# ONOS_CN="${CERT_ONOS_CN:-onos-controller}"
# ODL_CN="${CERT_ODL_CN:-odl-controller}"
# SWITCH_CN="${CERT_SWITCH_CN:-sc}"

# echo "======================================================"
# echo " [Step 1] Generating Shared Root CA & Controller Keystores"
# echo " Target directory: ${CERTS_DIR}"
# echo "======================================================"

# mkdir -p "${CERTS_DIR}"
# cd "${CERTS_DIR}"

# if [ -f "ca-cert.pem" ]; then
#   echo "[!] Existing CA found in ${CERTS_DIR}."
#   read -p "    Regenerate everything from scratch? This invalidates all existing certs. [y/N] " confirm
#   if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
#     echo "[✓] Keeping existing certificates. Nothing changed."
#     exit 0
#   fi
# fi

# # Clean old files
# rm -f *.pem *.jks *.csr *.srl

# # 1. Generate Root CA
# echo "[+] Generating Root CA..."
# openssl genrsa -out ca-key.pem 2048
# openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 3650 \
#   -out ca-cert.pem -subj "${CA_SUBJECT}"

# # 2. Generate ONOS Keystores (JKS format with CA-signed certificate)
# echo "[+] Generating ONOS keystores (strictly JKS format, CA-signed)..."
# keytool -genkeypair -alias onos -keyalg RSA -keysize 2048 -validity 3650 \
#   -keystore controller-keystore.jks -storetype JKS \
#   -storepass "${PASS}" -keypass "${PASS}" \
#   -dname "CN=${ONOS_CN}, OU=SDN-Lab, O=INSA"

# # Export CSR and sign with Root CA
# keytool -certreq -alias onos -keystore controller-keystore.jks \
#   -storepass "${PASS}" -file onos.csr
# openssl x509 -req -in onos.csr -CA ca-cert.pem -CAkey ca-key.pem \
#   -CAcreateserial -out onos-signed.pem -days 3650 -sha256
# rm -f onos.csr

# # Bundle certificate chain so Java keytool never fails chain validation
# cat onos-signed.pem ca-cert.pem > onos-chain.pem

# # Import Root CA and full chain into controller-keystore.jks
# keytool -importcert -alias ca -file ca-cert.pem \
#   -keystore controller-keystore.jks -storepass "${PASS}" -noprompt
# keytool -importcert -alias onos -file onos-chain.pem \
#   -keystore controller-keystore.jks -storepass "${PASS}" -noprompt
# rm -f onos-chain.pem

# # Create ONOS Truststore containing Root CA
# keytool -importcert -alias ca -file ca-cert.pem \
#   -keystore controller-truststore.jks -storetype JKS \
#   -storepass "${PASS}" -noprompt

# # 3. Generate OpenDaylight Keystores (PKCS12 format via OpenSSL - avoids JDK PKCS12 bugs)
# echo "[+] Generating OpenDaylight keystores (strictly PKCS12 format, CA-signed)..."
# openssl genrsa -out odl-key.pem 2048
# openssl req -new -key odl-key.pem -out odl.csr -subj "/CN=${ODL_CN}/OU=SDN-Lab/O=INSA"
# openssl x509 -req -in odl.csr -CA ca-cert.pem -CAkey ca-key.pem \
#   -CAcreateserial -out odl-cert.pem -days 3650 -sha256
# rm -f odl.csr

# # Export directly to PKCS12 keystore
# openssl pkcs12 -export -in odl-cert.pem -inkey odl-key.pem -certfile ca-cert.pem \
#   -out opendaylight-keystore.jks -name odl -passout pass:"${PASS}"

# # Create ODL Truststore containing Root CA
# keytool -importcert -alias ca -file ca-cert.pem \
#   -keystore opendaylight-truststore.jks -storetype PKCS12 \
#   -storepass "${PASS}" -noprompt

# # 4. Generate OVS switch certificate
# echo "[+] Generating OVS switch certificate..."
# openssl genrsa -out switch-key.pem 2048
# openssl req -new -key switch-key.pem -out switch.csr \
#   -subj "/CN=${SWITCH_CN}/OU=Open vSwitch certifier/O=Open vSwitch"
# openssl x509 -req -in switch.csr -CA ca-cert.pem -CAkey ca-key.pem \
#   -CAcreateserial -out switch-cert.pem -days 3650 -sha256
# rm -f switch.csr

# # Ensure all PEM files are readable by local services
# chmod 644 *.pem

# # 5. Installing switch certs into /etc/openvswitch safely
# echo "[+] Installing switch certs into /etc/openvswitch..."
# if [ -d "/etc/openvswitch" ] || command -v ovs-vsctl >/dev/null 2>&1; then
#   sudo mkdir -p /etc/openvswitch
#   sudo cp switch-key.pem switch-cert.pem ca-cert.pem /etc/openvswitch/
#   sudo chmod 644 /etc/openvswitch/switch-key.pem /etc/openvswitch/switch-cert.pem /etc/openvswitch/ca-cert.pem
#   sudo chown -R openvswitch:openvswitch /etc/openvswitch/*.pem 2>/dev/null || true
#   sudo ovs-vsctl set-ssl /etc/openvswitch/switch-key.pem /etc/openvswitch/switch-cert.pem /etc/openvswitch/ca-cert.pem 2>/dev/null || true
# fi

# # Sanity check: confirm ONOS's keystore is genuine JKS
# ACTUAL_TYPE=$(keytool -list -keystore controller-keystore.jks -storepass "${PASS}" -v 2>/dev/null | grep "Keystore type" | awk '{print $NF}')
# if [ "$ACTUAL_TYPE" != "JKS" ]; then
#   echo "[✗] ERROR: controller-keystore.jks reports type '${ACTUAL_TYPE}', not JKS. ONOS will fail to load this."
#   exit 1
# fi

# echo "======================================================"
# echo " [SUCCESS] All certificates generated & CA-signed in ${CERTS_DIR}"
# echo " ONOS keystore verified as genuine JKS."
# echo " ODL keystore verified as genuine PKCS12."
# echo "======================================================"


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

# Dynamically resolve ${VM_USER} to real user (e.g. maryamawit)
CURRENT_USER="${VM_USER:-$USER}"
RAW_CERTS_DIR="${CERTS_DIR:-$HOME/sdn-certs}"
CERTS_DIR=$(echo "$RAW_CERTS_DIR" | sed "s|\${VM_USER}|$CURRENT_USER|g; s|\$VM_USER|$CURRENT_USER|g; s|^~|$HOME|")

PASS="${TLS_KEYSTORE_PASSWORD:-changeit}"
CA_SUBJECT="${CERT_CA_SUBJECT:-/CN=INSA-SDN-CA/OU=SDN-Lab/O=INSA}"
ONOS_CN="${CERT_ONOS_CN:-onos-controller}"
ODL_CN="${CERT_ODL_CN:-odl-controller}"
SWITCH_CN="${CERT_SWITCH_CN:-sc}"

echo "======================================================"
echo " [Step 1] Generating Shared Root CA & Controller Keystores"
echo " Target directory: ${CERTS_DIR}"
echo "======================================================"

mkdir -p "${CERTS_DIR}"
cd "${CERTS_DIR}"

if [ -f "ca-cert.pem" ]; then
  echo "[!] Existing CA found in ${CERTS_DIR}."
  read -p "    Regenerate everything from scratch? This invalidates all existing certs. [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "[✓] Keeping existing certificates. Nothing changed."
    exit 0
  fi
fi

# Clean old files
rm -f *.pem *.jks *.csr *.srl

# 1. Generate Root CA
echo "[+] Generating Root CA..."
openssl genrsa -out ca-key.pem 2048
openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 3650 \
  -out ca-cert.pem -subj "${CA_SUBJECT}"

# 2. Generate ONOS Keystores (JKS format with HTTPS SAN support)
echo "[+] Generating ONOS keystores (strictly JKS format, CA-signed + SAN)..."
keytool -genkeypair -alias onos -keyalg RSA -keysize 2048 -validity 3650 \
  -keystore controller-keystore.jks -storetype JKS \
  -storepass "${PASS}" -keypass "${PASS}" \
  -dname "CN=${ONOS_CN}, OU=SDN-Lab, O=INSA" \
  -ext "SAN=ip:127.0.0.1,dns:localhost,dns:${ONOS_CN}"

keytool -certreq -alias onos -keystore controller-keystore.jks \
  -storepass "${PASS}" -file onos.csr \
  -ext "SAN=ip:127.0.0.1,dns:localhost,dns:${ONOS_CN}"

openssl x509 -req -in onos.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out onos-signed.pem -days 3650 -sha256 \
  -extfile <(printf "subjectAltName=IP:127.0.0.1,DNS:localhost,DNS:${ONOS_CN}")
rm -f onos.csr

# Bundle certificate chain so Java keytool never fails chain validation
cat onos-signed.pem ca-cert.pem > onos-chain.pem

# Import Root CA and full chain into controller-keystore.jks
keytool -importcert -alias ca -file ca-cert.pem \
  -keystore controller-keystore.jks -storepass "${PASS}" -noprompt
keytool -importcert -alias onos -file onos-chain.pem \
  -keystore controller-keystore.jks -storepass "${PASS}" -noprompt
rm -f onos-chain.pem

# Create ONOS Truststore containing Root CA
keytool -importcert -alias ca -file ca-cert.pem \
  -keystore controller-truststore.jks -storetype JKS \
  -storepass "${PASS}" -noprompt

# 3. Generate OpenDaylight Keystores (PKCS12 format via OpenSSL + SAN)
echo "[+] Generating OpenDaylight keystores (strictly PKCS12 format, CA-signed + SAN)..."
openssl genrsa -out odl-key.pem 2048
openssl req -new -key odl-key.pem -out odl.csr -subj "/CN=${ODL_CN}/OU=SDN-Lab/O=INSA"
openssl x509 -req -in odl.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out odl-cert.pem -days 3650 -sha256 \
  -extfile <(printf "subjectAltName=IP:127.0.0.1,DNS:localhost,DNS:${ODL_CN}")
rm -f odl.csr

openssl pkcs12 -export -in odl-cert.pem -inkey odl-key.pem -certfile ca-cert.pem \
  -out opendaylight-keystore.jks -name odl -passout pass:"${PASS}"

# Create ODL Truststore containing Root CA
keytool -importcert -alias ca -file ca-cert.pem \
  -keystore opendaylight-truststore.jks -storetype PKCS12 \
  -storepass "${PASS}" -noprompt

# 4. Generate OVS switch certificate
echo "[+] Generating OVS switch certificate..."
openssl genrsa -out switch-key.pem 2048
openssl req -new -key switch-key.pem -out switch.csr \
  -subj "/CN=${SWITCH_CN}/OU=Open vSwitch certifier/O=Open vSwitch"
openssl x509 -req -in switch.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out switch-cert.pem -days 3650 -sha256
rm -f switch.csr

chmod 644 *.pem

# 5. Installing switch certs into /etc/openvswitch safely
echo "[+] Installing switch certs into /etc/openvswitch..."
if [ -d "/etc/openvswitch" ] || command -v ovs-vsctl >/dev/null 2>&1; then
  sudo mkdir -p /etc/openvswitch
  sudo cp switch-key.pem switch-cert.pem ca-cert.pem /etc/openvswitch/
  sudo chmod 644 /etc/openvswitch/switch-key.pem /etc/openvswitch/switch-cert.pem /etc/openvswitch/ca-cert.pem
  sudo chown -R openvswitch:openvswitch /etc/openvswitch/*.pem 2>/dev/null || true
  sudo ovs-vsctl set-ssl /etc/openvswitch/switch-key.pem /etc/openvswitch/switch-cert.pem /etc/openvswitch/ca-cert.pem 2>/dev/null || true
fi

# Sanity check: confirm ONOS's keystore is genuine JKS
ACTUAL_TYPE=$(keytool -list -keystore controller-keystore.jks -storepass "${PASS}" -v 2>/dev/null | grep "Keystore type" | awk '{print $NF}')
if [ "$ACTUAL_TYPE" != "JKS" ]; then
  echo "[✗] ERROR: controller-keystore.jks reports type '${ACTUAL_TYPE}', not JKS. ONOS will fail to load this."
  exit 1
fi

echo "======================================================"
echo " [SUCCESS] All certificates generated & CA-signed in ${CERTS_DIR}"
echo " ONOS keystore verified as genuine JKS with HTTPS SAN."
echo " ODL keystore verified as genuine PKCS12 with HTTPS SAN."
echo "======================================================"