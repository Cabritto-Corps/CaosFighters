<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartBattleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'character_user_id' => ['required', 'string', 'uuid'],
            'user_id' => ['required', 'string', 'uuid'],
            'is_multiplayer' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'character_user_id.required' => 'Character ID is required',
            'character_user_id.uuid' => 'Character ID must be a valid UUID',
            'user_id.required' => 'User ID is required',
            'user_id.uuid' => 'User ID must be a valid UUID',
        ];
    }
}
