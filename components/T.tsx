import { Children, type ReactNode } from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { translate } from '@/lib/i18n';

// react-native Text'in yerine geçer: içindeki düz metinleri seçili dile çevirir.
// raw: kullanıcının yazdığı içerik (mesaj, not) çevrilmesin.
// Telefonda yazı boyutu büyütülse de en fazla 1,3 katına çıkar; kartlar ve düğmeler taşmaz.
export const MAX_FONT_SCALE = 1.3;

export function Text({ children, raw, ...props }: TextProps & { children?: ReactNode; raw?: boolean }) {
  return (
    <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props}>
      {raw ? children : translateChildren(children)}
    </RNText>
  );
}

export function translateChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') return translate(children);
  if (Array.isArray(children)) {
    // "{n} gün" gibi sadece metin ve sayıdan oluşan içerik tek metin olarak çevrilir.
    if (children.every((c) => typeof c === 'string' || typeof c === 'number')) return translate(children.join(''));
    return Children.map(children, (c) => (typeof c === 'string' ? translate(c) : c));
  }
  return children;
}
