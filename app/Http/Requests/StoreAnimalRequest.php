<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnimalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = app('current.farm.role');
        return in_array($role, ['farm_owner', 'farm_manager', 'farm_worker']);
    }

    public function rules(): array
    {
        $farmId = app('current.farm.id');

        return [
            'tag_number'         => ['required', 'string', 'max:40', Rule::unique('animals')->where('farm_id', $farmId)],
            'name'               => ['nullable', 'string', 'max:80'],
            'sex'                => ['required', 'in:male,female'],
            'status'             => ['required', 'in:calf,heifer,lactating,dry,bull'],
            'breed'              => ['required', 'in:Friesian,Ayrshire,Jersey,Guernsey,Brown Swiss,Sahiwal,Crossbreed,Other'],
            'birth_date'         => ['nullable', 'date', 'before_or_equal:today'],
            'date_acquired'      => ['nullable', 'date', 'before_or_equal:today'],
            'acquisition_cost'   => ['nullable', 'numeric', 'min:0'],
            'acquisition_source' => ['nullable', 'string', 'max:120'],
            'sire_id'            => ['nullable', 'uuid', Rule::exists('animals', 'id')->where('farm_id', $farmId)->where('sex', 'male')],
            'dam_id'             => ['nullable', 'uuid', Rule::exists('animals', 'id')->where('farm_id', $farmId)->where('sex', 'female')],
            'weight_kg'          => ['nullable', 'numeric', 'min:5', 'max:1200'],
            'notes'              => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'tag_number.unique' => 'This tag number is already used on your farm.',
            'sire_id.exists'    => 'Selected sire not found in your herd.',
            'dam_id.exists'     => 'Selected dam not found in your herd.',
        ];
    }
}
