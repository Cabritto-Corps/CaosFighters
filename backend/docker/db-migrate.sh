#!/bin/bash

echo "Connecting database..."

until php /var/www/artisan db:show &>/dev/null
do
  echo "Waiting..."
  sleep 2
done

echo "Database connected."
php /var/www/artisan migrate --force