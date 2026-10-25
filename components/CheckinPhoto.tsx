import { Image } from 'expo-image';
import { ActivityIndicator, View, type DimensionValue } from 'react-native';

import { radius } from '@/constants/theme';
import { useSignedUrl, type Bucket } from '@/lib/media';
import { useColors } from '@/lib/theme';

// Check-in fotoğrafları özel kovada; imzalı, süreli bağlantıyla gösterilir.
export function CheckinPhoto({ path, uri, width, aspect = 3 / 4, bucket = 'checkins' }: { path?: string; uri?: string; width: DimensionValue; aspect?: number; bucket?: Bucket }) {
  const colors = useColors();
  const signed = useSignedUrl(bucket, uri ? null : path);
  const src = uri ?? signed;
  return (
    <View style={{ width, aspectRatio: aspect, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border }}>
      {src ? (
        <Image source={{ uri: src }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      ) : (
        <ActivityIndicator style={{ flex: 1 }} color={colors.textMuted} />
      )}
    </View>
  );
}
