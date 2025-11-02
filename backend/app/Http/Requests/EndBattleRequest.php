<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EndBattleRequest extends FormRequest
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
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'winner_id' => 'required|uuid',
            'duration' => 'sometimes|integer|min:0',
            'battle_log' => 'sometimes|array',
            'battle_log.*' => 'string',
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'winner_id.required' => 'Winner ID is required',
            'winner_id.uuid' => 'Winner ID must be a valid UUID',
            'duration.integer' => 'Duration must be an integer',
            'duration.min' => 'Duration must be greater than or equal to 0',
            'battle_log.array' => 'Battle log must be an array',
            'battle_log.*.string' => 'Each battle log entry must be a string',
        ];
    }
}
