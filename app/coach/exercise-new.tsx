import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from '@/components/T';

import { Body, Button, Card, Chip, EmptyState, Input, Label, Reveal, Row, Screen } from '@/components/ui';
import { fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { addCustomExercise } from '@/lib/exerciseCatalog';
import { GROUPS, MUSCLES, type Equipment, type Muscle, type MuscleGroup, type Pattern } from '@/lib/exercises';
import { tx } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const EQUIPMENT: Equipment[] = ['Barbell', 'Dumbbell', 'Makine', 'Kablo', 'Smith', 'Vücut ağırlığı'];

// Videosu yüklenene kadar gösterilen çizim animasyonu, ana kasın bölgesine göre seçilir.
const PATTERN_FOR: Record<MuscleGroup, Pattern> = {
  Göğüs: 'bench_press',
  Sırt: 'row',
  Omuz: 'overhead_press',
  Kol: 'curl',
  Bacak: 'squat',
  Karın: 'crunch',
};

// Koç kütüphaneye yeni hareket ekler. Kaydedince hareket sayfası açılır, video oradan yüklenir.
export default function NewExercise() {
  const colors = useColors();
  const { isCoach } = useAuth();
  const [name, setName] = useState('');
  const [trName, setTrName] = useState('');
  const [primary, setPrimary] = useState<Muscle[]>([]);
  const [secondary, setSecondary] = useState<Muscle[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('Makine');
  const [steps, setSteps] = useState('');
  const [tip, setTip] = useState('');
  const [free, setFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCoach) {
    return (
      <Screen edges={[]}>
        <EmptyState icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} title="Sadece koçlar" body="Bu panel koç hesaplarına açık." />
      </Screen>
    );
  }

  const toggle = (list: Muscle[], set: (l: Muscle[]) => void, m: Muscle) => set(list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);

  async function save() {
    if (name.trim().length < 2) return setError('Hareketin adını yaz.');
    if (primary.length === 0) return setError('En az bir ana kas seç.');
    setBusy(true);
    setError(null);
    const { id, error: err } = await addCustomExercise({
      trName: name.trim(),
      name: trName.trim() || name.trim(),
      primary,
      secondary: secondary.filter((m) => !primary.includes(m)),
      equipment,
      pattern: PATTERN_FOR[MUSCLES[primary[0]].group],
      steps: steps
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      tip: tip.trim(),
      free,
    });
    setBusy(false);
    if (err || !id) return setError(err ?? 'Kaydedilemedi.');
    router.replace({ pathname: '/exercise/[id]', params: { id } });
  }

  const muscleChips = (list: Muscle[], set: (l: Muscle[]) => void) =>
    GROUPS.map((g) => (
      <Row key={g} gap={8} style={{ flexWrap: 'wrap' }}>
        {(Object.keys(MUSCLES) as Muscle[])
          .filter((m) => MUSCLES[m].group === g)
          .map((m) => (
            <Chip key={m} label={tx(MUSCLES[m].name)} active={list.includes(m)} onPress={() => toggle(list, set, m)} />
          ))}
      </Row>
    ));

  return (
    <Screen edges={[]}>
      <Reveal index={0}>
        <Card>
          <Label>Adı (uygulamada görünen)</Label>
          <Input value={name} onChangeText={setName} placeholder="ör. Cable fly" maxLength={80} />
          <Label>Türkçe adı (aramada bulunsun)</Label>
          <Input value={trName} onChangeText={setTrName} placeholder="ör. Kablo fly" maxLength={80} />
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Card>
          <Label>Ana kas</Label>
          {muscleChips(primary, setPrimary)}
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card>
          <Label>Yardımcı kaslar</Label>
          {muscleChips(secondary, setSecondary)}
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card>
          <Label>Ekipman</Label>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {EQUIPMENT.map((e) => (
              <Chip key={e} label={e} active={equipment === e} onPress={() => setEquipment(e)} />
            ))}
          </Row>
        </Card>
      </Reveal>

      <Reveal index={4}>
        <Card>
          <Label>Nasıl yapılır</Label>
          <Body muted style={{ fontSize: 12.5 }}>
            Her adımı ayrı satıra yaz.
          </Body>
          <Input value={steps} onChangeText={setSteps} multiline placeholder={'Koltuğa otur...\nTutamakları kavra...'} />
          <Label>İpucu</Label>
          <Input value={tip} onChangeText={setTip} multiline placeholder="ör. Dirseklerini kilitleme" />
          <Row gap={8}>
            <Chip label="Ücretsiz üyelere de açık" active={free} onPress={() => setFree(!free)} />
          </Row>
        </Card>
      </Reveal>

      {error && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger }}>{error}</Text>}
      <Button title="Hareketi ekle" arrow loading={busy} onPress={save} />
    </Screen>
  );
}
