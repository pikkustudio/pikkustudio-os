#!/bin/sh
set -e
caddy run --config /etc/caddy/Caddyfile &
/opt/studio/$STUDIO_UNIT db migrate
exec /opt/studio/$STUDIO_UNIT
