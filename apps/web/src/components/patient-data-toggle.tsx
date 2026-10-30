'use client';

import { LuEye, LuEyeOff } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { usePatientDataVisibility } from '@/hooks/use-patient-data-visibility';

/** Shows or masks patient names and medical record numbers on every page. */
export function PatientDataToggle() {
  const { isPatientDataVisible, setPatientDataVisible } =
    usePatientDataVisibility();
  const Icon = isPatientDataVisible ? LuEyeOff : LuEye;

  return (
    <Button
      variant="ghost"
      size="xs"
      aria-pressed={isPatientDataVisible}
      onClick={() => setPatientDataVisible(!isPatientDataVisible)}
    >
      <Icon aria-hidden="true" />
      {isPatientDataVisible
        ? 'Sembunyikan data pasien'
        : 'Tampilkan data pasien'}
    </Button>
  );
}
