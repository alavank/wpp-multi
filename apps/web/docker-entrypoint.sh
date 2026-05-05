#!/bin/sh
set -e

# Railway/Heroku/Fly injetam PORT; localmente cai para 8080.
PORT="${PORT:-8080}"
echo "[web] starting nginx on port ${PORT}"

# Gera /etc/nginx/conf.d/default.conf substituindo apenas ${PORT}.
# Usar sed em vez de envsubst evita conflito com variáveis nativas do nginx
# como $uri, $request_uri, $host etc.
sed "s/__PORT__/${PORT}/g" /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

cat /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
