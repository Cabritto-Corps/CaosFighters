<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class HealthController extends Controller
{
    /**
     * Basic health check endpoint.
     */
    public function check(): JsonResponse
    {
        try {
            $status = 'healthy';
            $checks = [];
            $timestamp = now()->toISOString();

            // Check database connection
            try {
                DB::connection()->getPdo();
                $checks['database'] = [
                    'status' => 'healthy',
                    'message' => 'Database connection successful'
                ];
            } catch (\Exception $e) {
                $status = 'unhealthy';
                $checks['database'] = [
                    'status' => 'unhealthy',
                    'message' => 'Database connection failed: ' . $e->getMessage()
                ];
            }

            // Check cache (if configured)
            try {
                Cache::put('health_check', 'test', 10);
                $cacheValue = Cache::get('health_check');
                if ($cacheValue === 'test') {
                    $checks['cache'] = [
                        'status' => 'healthy',
                        'message' => 'Cache system working'
                    ];
                } else {
                    $status = 'unhealthy';
                    $checks['cache'] = [
                        'status' => 'unhealthy',
                        'message' => 'Cache system not working properly'
                    ];
                }
            } catch (\Exception $e) {
                $checks['cache'] = [
                    'status' => 'warning',
                    'message' => 'Cache system not available: ' . $e->getMessage()
                ];
            }

            // Check memory usage
            $memoryUsage = memory_get_usage(true);
            $memoryLimit = ini_get('memory_limit');
            $memoryUsageMB = round($memoryUsage / 1024 / 1024, 2);

            $checks['memory'] = [
                'status' => 'healthy',
                'message' => "Memory usage: {$memoryUsageMB}MB",
                'usage' => $memoryUsageMB,
                'limit' => $memoryLimit
            ];

            // Check disk space
            $diskFree = disk_free_space('/');
            $diskTotal = disk_total_space('/');
            $diskUsagePercent = round((($diskTotal - $diskFree) / $diskTotal) * 100, 2);

            $checks['disk'] = [
                'status' => $diskUsagePercent > 90 ? 'warning' : 'healthy',
                'message' => "Disk usage: {$diskUsagePercent}%",
                'usage_percent' => $diskUsagePercent,
                'free_space_gb' => round($diskFree / 1024 / 1024 / 1024, 2)
            ];

            $response = [
                'status' => $status,
                'timestamp' => $timestamp,
                'uptime' => $this->getUptime(),
                'version' => app()->version(),
                'environment' => app()->environment(),
                'checks' => $checks
            ];

            $httpStatus = $status === 'healthy' ? 200 : 503;

            return response()->json($response, $httpStatus);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'unhealthy',
                'timestamp' => now()->toISOString(),
                'message' => 'Health check failed',
                'error' => $e->getMessage()
            ], 503);
        }
    }

    /**
     * Detailed health check with more information.
     */
    public function detailed(): JsonResponse
    {
        try {
            $status = 'healthy';
            $checks = [];
            $timestamp = now()->toISOString();

            // Database detailed check
            try {
                $startTime = microtime(true);
                $userCount = DB::table('users')->count();
                $dbTime = round((microtime(true) - $startTime) * 1000, 2);

                $checks['database'] = [
                    'status' => 'healthy',
                    'message' => 'Database connection and query successful',
                    'response_time_ms' => $dbTime,
                    'user_count' => $userCount
                ];
            } catch (\Exception $e) {
                $status = 'unhealthy';
                $checks['database'] = [
                    'status' => 'unhealthy',
                    'message' => 'Database check failed: ' . $e->getMessage()
                ];
            }

            // PHP version and extensions
            $checks['php'] = [
                'status' => 'healthy',
                'version' => PHP_VERSION,
                'extensions' => [
                    'pdo' => extension_loaded('pdo'),
                    'pdo_pgsql' => extension_loaded('pdo_pgsql'),
                    'json' => extension_loaded('json'),
                    'mbstring' => extension_loaded('mbstring'),
                    'openssl' => extension_loaded('openssl')
                ]
            ];

            // Server information
            $checks['server'] = [
                'status' => 'healthy',
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'environment' => app()->environment(),
                'debug_mode' => config('app.debug'),
                'timezone' => config('app.timezone')
            ];

            // Application metrics
            $checks['application'] = [
                'status' => 'healthy',
                'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
                'peak_memory_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
                'uptime' => $this->getUptime()
            ];

            $response = [
                'status' => $status,
                'timestamp' => $timestamp,
                'checks' => $checks
            ];

            $httpStatus = $status === 'healthy' ? 200 : 503;

            return response()->json($response, $httpStatus);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'unhealthy',
                'timestamp' => now()->toISOString(),
                'message' => 'Detailed health check failed',
                'error' => $e->getMessage()
            ], 503);
        }
    }

    /**
     * Simple ping endpoint.
     */
    public function ping(): JsonResponse
    {
        return response()->json([
            'message' => 'pong',
            'timestamp' => now()->toISOString()
        ]);
    }

    /**
     * Get application uptime.
     */
    private function getUptime(): string
    {
        $uptime = time() - $_SERVER['REQUEST_TIME_FLOAT'];
        $days = floor($uptime / 86400);
        $hours = floor(($uptime % 86400) / 3600);
        $minutes = floor(($uptime % 3600) / 60);
        $seconds = $uptime % 60;

        return sprintf('%d days, %d hours, %d minutes, %d seconds', $days, $hours, $minutes, $seconds);
    }
}
