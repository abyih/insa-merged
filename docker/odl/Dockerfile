FROM eclipse-temurin:21-jre-jammy

ARG ODL_VERSION=0.23.1
ARG ODL_DOWNLOAD_URL=https://nexus.opendaylight.org/content/repositories/opendaylight.release/org/opendaylight/integration/karaf/${ODL_VERSION}/karaf-${ODL_VERSION}.tar.gz
ENV ODL_HOME=/opt/opendaylight \
    KARAF_HOME=/opt/opendaylight \
    JAVA_OPTS="-Djava.awt.headless=true -Djava.security.egd=file:/dev/./urandom"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl tar \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --home-dir /opt/opendaylight --shell /bin/bash odl \
    && mkdir -p /opt/opendaylight \
    && curl -fsSL "$ODL_DOWNLOAD_URL" | tar -xz --strip-components=1 -C /opt/opendaylight \
    && chown -R odl:odl /opt/opendaylight

WORKDIR /opt/opendaylight

EXPOSE 8101 8181 6653 6640

# USER odl

COPY entrypoint.sh /opt/opendaylight/entrypoint.sh
RUN chmod +x /opt/opendaylight/entrypoint.sh
ENTRYPOINT ["/opt/opendaylight/entrypoint.sh"]