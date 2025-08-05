<?php

namespace App\Http\Master\Controllers;

use App\Data\FileDTO;
use App\Data\Input\RegisterInputData;
use App\UseCases\Register;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Info(
 *     title="Laravel API",
 *     version="1.0.0",
 *     description="API documentation for Laravel application"
 * )
 *
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Local development server"
 * )
 */
class RegisterController
{

    public function __construct(
        private Register $register,
    ) {}

    /**
     * @OA\Post(
     *     path="/api/user/register",
     *     summary="Register a new user",
     *     description="Creates a new user account with the provided information",
     *     tags={"Authentication"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 required={"name", "email", "password", "confirm_password", "role"},
     *                 @OA\Property(
     *                     property="name",
     *                     type="string",
     *                     description="User's full name",
     *                     example="John Doe"
     *                 ),
     *                 @OA\Property(
     *                     property="email",
     *                     type="string",
     *                     format="email",
     *                     description="User's email address",
     *                     example="john.doe@example.com"
     *                 ),
     *                 @OA\Property(
     *                     property="password",
     *                     type="string",
     *                     format="password",
     *                     description="User's password",
     *                     example="password123"
     *                 ),
     *                 @OA\Property(
     *                     property="confirm_password",
     *                     type="string",
     *                     format="password",
     *                     description="Password confirmation",
     *                     example="password123"
     *                 ),
     *                 @OA\Property(
     *                     property="role",
     *                     type="string",
     *                     description="User's role",
     *                     example="user"
     *                 ),
     *                 @OA\Property(
     *                     property="pictures",
     *                     type="array",
     *                     @OA\Items(
     *                         type="string",
     *                         format="binary"
     *                     ),
     *                     description="User profile pictures (optional)"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="User registered successfully",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="User registered successfully"
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - validation error",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="Validation failed"
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Unprocessable entity",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="Invalid input data"
     *             )
     *         )
     *     )
     * )
     */
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $name = $request->attributes->get('name');
            $email = $request->attributes->get('email');
            $password = $request->attributes->get('password');
            $confirm_password = $request->attributes->get('confirm_password');
            $role = $request->attributes->get('role');
            $pictures = $request->file('pictures');
            $has_pictures = !!$pictures;
            $picture_list = [];

            if ($has_pictures) {
                foreach ($pictures as $picture) {
                    $picture_list[] = FileDTO::validateAndCreate([
                        'name' => $picture->getClientOriginalName(),
                        'path' => $picture->getPathname(),
                        'size' => $picture->getSize(),
                        'mime_type' => $picture->getMimeType(),
                    ])->toArray();
                }
            }

            $input = RegisterInputData::validateAndCreate([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'confirm_password' => $confirm_password,
                'role' => $role,
                'pictures' => $picture_list,
            ]);

            $output = $this->register->execute($input);

            return response()->json([
                'message' => 'User registered successfully',
            ], 200);
        } catch (\Exception $th) {
            return response()->json([
                'message' => $th->getMessage()
            ], $th->getCode() ?? 400);
        }
    }
}
