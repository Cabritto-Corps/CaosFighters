<?php

namespace App\Http;
use Illuminate\Http\Request;


use Illuminate\Http\JsonResponse;

interface Controller
{
    public function __invoke(Request $request): JsonResponse;
}
