<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAnimalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = app('current.farm.role');
        return in_array($role, ['farm_owner', 'farm_manager']);
    }

    public function rules(): array
    {
        $farmId   = app('current.farm.id');
        $animalId = $this->route('animal')?->id;

        return [
            'tag_number'         => ['sometimes', 'string', 'max:40', Rule::unique('animals')->where('farm_id', $farmId)->ignore($animalId)],
            'name'               => ['sometimes', 'nullable', 'string', 'max:80'],
            'sex'                => ['sometimes', 'in:male,female'],
            'status'             => ['sometimes', 'in:calf,heifer,lactating,dry,bull,culled,sold,dead'],
            'breed'              => ['sometimes', 'in:Friesian,Ayrshire,Jersey,Guernsey,Brown Swiss,Sahiwal,Crossbreed,Other'],
            'birth_date'         => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'date_acquired'      => ['sometimes', 'nullable', 'date'],
            'acquisition_cost'   => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'acquisition_source' => ['sometimes', 'nullable', 'string', 'max:120'],
            'sire_id'            => ['sometimes', 'nullable', 'uuid'],
            'dam_id'             => ['sometimes', 'nullable', 'uuid'],
            'is_pregnant'        => ['sometimes', 'boolean'],
            'expected_calving_date' => ['sometimes', 'nullable', 'date'],
            'last_calving_date'  => ['sometimes', 'nullable', 'date'],
            'parity'             => ['sometimes', 'integer', 'min:0'],
            'weight_kg'          => ['sometimes', 'nullable', 'numeric', 'min:5', 'max:1200'],
            'notes'              => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
