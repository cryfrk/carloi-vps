import { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

interface AdaptiveModalProps {
  visible: boolean;
  transparent?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  children: ReactNode;
}

export function AdaptiveModal({
  visible,
  transparent = false,
  animationType = 'none',
  children,
}: AdaptiveModalProps) {
  if (!visible) {
    return null;
  }

  if (Platform.OS === 'web') {
    return <View style={styles.webLayer}>{children}</View>;
  }

  return (
    <Modal animationType={animationType} transparent={transparent} visible={visible}>
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  webLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
