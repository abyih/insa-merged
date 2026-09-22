#!/bin/bash
set -e

/opt/opendaylight/bin/karaf server &
KARAF_PID=$!

# wait for the Karaf console to be ready to accept client commands
until /opt/opendaylight/bin/client -u karaf -p karaf "feature:list" > /dev/null 2>&1; do
  sleep 3
done

/opt/opendaylight/bin/client -u karaf -p karaf "feature:install odl-restconf-all odl-restconf odl-restconf-openapi odl-ovsdb-southbound-impl odl-openflowplugin-flow-services odl-openflowplugin-southbound odl-l2switch-switch odl-ovsdb-all"

wait $KARAF_PID