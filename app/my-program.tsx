import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from '@/components/T';

import { ProgramDaysEditor } from '@/components/ProgramEditor';
import { Body, Button, Card, Input, Label, LockedCard, PressScale, Reveal, Row, Screen } from '@/components/ui';
import { fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { type Program } from '@/lib/program';
import { useColors } from '@/lib/theme';
import { hasFeature } from '@/lib/tiers';
import { useWorkouts } from '@/lib/workouts';

// Ücretli üyenin kendi yazdığı antrenman programı. Antrenman sekmesinde "Kendi programım" seçilince kullanılır.
export default function MyProgram() {
  const colors = useColors();
  const { tier } = useAuth();
  const { program, ownProgram, setOwnProgram, templateDays, setTemplateDays } = useWorkouts();
  // İlk kez açılınca o an gösterilen programdan başlar.
  const [draft, setDraft] = useState<Program>(() => structuredClone(ownProgram ?? { ...program, name: 'Programım', note: undefined }));
  const [error, setError] = useState<string | null>(null);

  if (!hasFeature(tier, 'training_programs')) {
    return (
      <Screen edges={[]}>
        <LockedCard
          tier="pro"
          title="Kendi programın Pro'da"
          body="Pro, Plus ve Max üyeler kendi antrenman programını yazabilir."
          preview={[['Pazartesi', 'İtiş'], ['Çarşamba', 'Çekiş'], ['Cuma', 'Bacak']]}
          onPress={() => router.push('/plans')}
        />
      </Screen>
    );
  }

  function save() {
    if (draft.days.length === 0) return setError('En az bir gün ekle.');
    if (draft.days.some((d) => d.exercises.length === 0)) return setError('Her güne en az bir hareket ekle.');
    const clean: Program = { ...draft, days: [...draft.days].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)) };
    setOwnProgram(clean);
    setTemplateDays('own');
    router.back();
  }

  function remove() {
    setOwnProgram(null);
    if (templateDays === 'own') setTemplateDays(null);
    router.back();
  }

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Program adı</Label>
            {ownProgram && (
              <PressScale onPress={remove}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.danger }}>Sil</Text>
              </PressScale>
            )}
          </Row>
          <Input value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Body muted style={{ fontSize: 12.5 }}>
            Günleri, hareketleri, set ve tekrarları kendin belirle. Kaydedince Antrenman sekmesinde bu program görünür.
          </Body>
        </Card>
      </Reveal>

      <ProgramDaysEditor program={draft} onChange={setDraft} />

      {error && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{error}</Text>}
      <Button title="Programı kaydet" arrow onPress={save} />
    </Screen>
  );
}
