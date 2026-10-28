import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/T';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodSheet } from '@/components/FoodSheet';
import { Body, Button, Icon, Input, PressScale, Row, TierBadge } from '@/components/ui';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { mealForNow, type MealSlot } from '@/lib/daily';
import { lookupBarcode, type FoodResult } from '@/lib/foodsearch';
import { useProgress } from '@/lib/progress';
import { dayKey, useStored } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { hasFeature, LIMITS } from '@/lib/tiers';
import { tx } from '@/lib/i18n';

export default function ScanScreen() {
  const colors = useColors();
  const { tier } = useAuth();
  const { bump } = useProgress();
  const { meal } = useLocalSearchParams<{ meal?: MealSlot }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [used, setUsed] = useStored<number>(`scans:${dayKey()}`, 0);
  const [food, setFood] = useState<FoodResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');
  const [manual, setManual] = useState('');
  const busy = useRef(false);
  const unlimited = hasFeature(tier, 'unlimited_scans');
  const left = unlimited ? Infinity : Math.max(0, LIMITS.freeScansPerDay - used);

  async function handle(code: string) {
    if (busy.current || food || left <= 0) return;
    busy.current = true;
    setStatus('loading');
    try {
      const result = await lookupBarcode(code);
      if (result) {
        setFood(result);
        setUsed((n) => n + 1);
        bump('scans');
        setStatus('idle');
      } else setStatus('missing');
    } catch {
      setStatus('error');
    } finally {
      // Aynı barkodun art arda okunmasını engelle.
      setTimeout(() => (busy.current = false), 1200);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {permission?.granted && left > 0 && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={food ? undefined : ({ data }) => handle(data)}
        />
      )}
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
        <Row style={{ justifyContent: 'space-between', padding: spacing.md }}>
          <PressScale onPress={() => router.back()} style={styles.round}>
            <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} color="#fff" />
          </PressScale>
          <View style={styles.counter}>
            <Text style={styles.counterText}>{unlimited ? 'Sınırsız tarama' : tx('Bugün {0} tarama kaldı', [left])}</Text>
          </View>
        </Row>

        {permission?.granted && left > 0 && (
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <View style={styles.frame}>
              {[styles.tl, styles.tr, styles.bl, styles.br].map((s, i) => (
                <View key={i} style={[styles.corner, s]} />
              ))}
            </View>
            {status === 'loading' && <ActivityIndicator color="#fff" />}
            <Text style={styles.hint}>
              {status === 'missing'
                ? 'Bu ürün veritabanında yok. Yiyecek aramayı dene.'
                : status === 'error'
                  ? 'Bağlantı hatası, tekrar dene.'
                  : 'Barkodu çerçevenin içine getir'}
            </Text>
          </View>
        )}

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {left <= 0 ? (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[styles.panelTitle, { color: colors.text }]}>Günlük tarama hakkın bitti</Text>
                <TierBadge tier="pro" />
              </Row>
              <Body muted style={{ fontSize: 13.5 }}>{tx('Ücretsiz pakette günde {0} tarama var. Pro ile sınırsız tara.', [LIMITS.freeScansPerDay])}</Body>
              <Button title="Pro'ya geç" arrow onPress={() => router.push('/plans')} />
            </>
          ) : !permission?.granted ? (
            <>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Kamera izni</Text>
              <Body muted style={{ fontSize: 13.5 }}>
                Barkodu okumak için kameraya izin ver. Görüntü kaydedilmez.
              </Body>
              <Button title="Kamerayı aç" arrow onPress={requestPermission} />
            </>
          ) : (
            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Input value={manual} onChangeText={setManual} keyboardType="number-pad" placeholder="Barkodu elle yaz" />
              </View>
              <PressScale
                onPress={() => manual.trim().length >= 8 && handle(manual.trim())}
                style={[styles.go, { backgroundColor: colors.primary }]}>
                <Icon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={18} color={colors.primaryText} />
              </PressScale>
            </Row>
          )}
          {status === 'missing' && (
            <Button
              title="Yiyecek ara"
              variant="outline"
              onPress={() => router.replace({ pathname: '/food/search', params: { meal } })}
            />
          )}
        </View>
      </SafeAreaView>

      <FoodSheet
        food={food}
        meal={meal ?? mealForNow()}
        source="barcode"
        onClose={() => setFood(null)}
        onAdded={() => router.back()}
      />
    </View>
  );
}

const C = 28;
const styles = StyleSheet.create({
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  counterText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff' },
  frame: { width: 260, height: 170 },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  hint: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff', textAlign: 'center', paddingHorizontal: spacing.lg },
  panel: {
    marginVertical: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 560,
    width: '92%',
    alignSelf: 'center',
  },
  panelTitle: { fontFamily: fonts.bodyBold, fontSize: 17 },
  go: { width: 54, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
