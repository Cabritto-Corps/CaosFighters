#!/bin/bash

echo "[ENTRYPOINT] Limpando config cache antes de qualquer coisa"
php artisan config:clear
php artisan cache:clear

echo "[ENTRYPOINT] Aguardando banco de dados..."
MAX_RETRIES=10
COUNT=0

until php /var/www/artisan db:show &>/dev/null; do
  echo "[ENTRYPOINT] Esperando banco de dados... Tentativa $COUNT"
  sleep 2
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "[ENTRYPOINT] Timeout: banco de dados não respondeu a tempo."
    exit 1
  fi
done

echo "[ENTRYPOINT] Banco disponível. Cacheando configs..."
php artisan config:cache

echo "[ENTRYPOINT] Ajustando permissões de log..."
chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
chmod -R 775 /var/www/storage /var/www/bootstrap/cache

touch /var/www/storage/logs/laravel.log
chown www-data:www-data /var/www/storage/logs/laravel.log
chmod 664 /var/www/storage/logs/laravel.log

echo "[ENTRYPOINT] Executando migrations..."
php /var/www/artisan migrate --force

echo "[ENTRYPOINT] Inicialização completa. Iniciando container..."
exec "$@"
