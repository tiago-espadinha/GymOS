import { useState } from 'react';
import { Button, Input, Label, Select } from '../../shared';
import { MUSCLE_GROUPS } from '../../../constants/muscleGroups';
import { generateId } from '../../../utils/id';
import { TrainingPlan, Exercise } from '../../../types';
import './CreatePlanForm.css';

interface CreatePlanFormProps {
  onSave: (plan: TrainingPlan) => void;
  onCancel: () => void;
}

interface ExerciseInput extends Exercise {
  id: string;
}

export function CreatePlanForm({ onSave, onCancel }: CreatePlanFormProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [exercises, setExercises] = useState<ExerciseInput[]>([
    { id: generateId(), name: '', muscleGroup: 'Chest' },
  ]);
  const [error, setError] = useState('');

  const addExercise = () => {
    setExercises((ex) => [...ex, { id: generateId(), name: '', muscleGroup: 'Chest' }]);
  };

  const removeExercise = (id: string) => {
    setExercises((ex) => ex.filter((e) => e.id !== id));
  };

  const updateExercise = (id: string, field: string, value: string) => {
    setExercises((ex) => ex.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const save = () => {
    if (!name.trim()) {
      setError('Plan name is required');
      return;
    }
    const valid = exercises.filter((e) => e.name.trim());
    if (valid.length === 0) {
      setError('Add at least one exercise');
      return;
    }
    onSave({
      id: generateId(),
      name: name.trim(),
      desc: desc.trim(),
      exercises: valid.map((e) => ({ ...e, name: e.name.trim() })),
    });
  };

  return (
    <div className="createPlanForm">
      <div className="createPlanFormTitle">New Training Plan</div>

      <div className="createPlanFormGrid">
        <div>
          <Label>Plan Name</Label>
          <Input value={name} onChange={setName} placeholder="e.g. Push Day" />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input value={desc} onChange={setDesc} placeholder="e.g. Chest, shoulders, triceps" />
        </div>
      </div>

      <Label>Exercises</Label>
      <div className="createPlanFormExercises">
        {exercises.map((ex, i) => (
          <div key={ex.id} className="createPlanFormExercise">
            <span className="createPlanFormExerciseIndex">{i + 1}</span>
            <Input
              value={ex.name}
              onChange={(v) => updateExercise(ex.id, 'name', v)}
              placeholder="Exercise name"
              style={{ flex: 1 }}
            />
            <Select
              value={ex.muscleGroup}
              onChange={(v) => updateExercise(ex.id, 'muscleGroup', v)}
              style={{ width: '150px', flexShrink: 0 }}
            >
              {MUSCLE_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
            {exercises.length > 1 && (
              <button onClick={() => removeExercise(ex.id)} className="createPlanFormRemove">
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <div className="createPlanFormError">{error}</div>}

      <div className="createPlanFormActions">
        <Button onClick={addExercise} variant="ghost" small>
          + Add Exercise
        </Button>
        <div className="createPlanFormSpacer" />
        <Button onClick={onCancel} variant="ghost" small>
          Cancel
        </Button>
        <Button onClick={save} small>
          Save Plan
        </Button>
      </div>
    </div>
  );
}

export default CreatePlanForm;
