#!/bin/sh
set -e

# Railway/Heroku/Fly injetam PORT; localmente cai para 8080.
PORT="${PORT:-8080}"
echo "[web] starting nginx on port ${PORT}" >&2

# Gera default.conf inline (mais robusto do que copiar template e
# fazer sed/envsubst, especialmente quando o repositório vem de Windows).
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
  listen ${PORT};
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location ~* \.(js|css|woff2?|png|jpg|svg|webp)\$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  location = /sw.js {
    add_header Cache-Control "no-cache";
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

echo "--- generated /etc/nginx/conf.d/default.conf ---" >&2
cat /etc/nginx/conf.d/default.conf >&2
echo "--- starting nginx ---" >&2

exec nginx -g "daemon off;"
