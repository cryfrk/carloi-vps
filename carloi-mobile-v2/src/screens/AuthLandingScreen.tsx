import { Image, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { tokens } from '@/theme/tokens';

const logo = require('../../assets/carloi.png');

export function AuthLandingScreen({ navigation }: { navigation: any }) {
  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Carloi</Text>
        <Text style={styles.subtitle}>
          Sosyal otomotiv akisini, ilanlarini, mesajlasmayi ve garaj yonetimini tek uygulamada topla.
        </Text>
      </View>

      <SectionCard>
        <Text style={styles.cardTitle}>Bireysel hesap olustur</Text>
        <Text style={styles.copy}>
          Araclarini sergile, gonderi paylas, ilanlari takip et ve guvenli mesajlasma akisina katil.
        </Text>
        <PrimaryButton label="Bireysel basla" onPress={() => navigation.navigate('Register', { type: 'individual' })} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.cardTitle}>Ticari hesap olustur</Text>
        <Text style={styles.copy}>
          Belge yukleme ve onay sureci sonrasinda ticari rozetini ve kurumsal ilan ozelliklerini aktif et.
        </Text>
        <PrimaryButton label="Ticari basla" variant="secondary" onPress={() => navigation.navigate('Register', { type: 'commercial' })} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.cardTitle}>Zaten hesabin var mi?</Text>
        <Text style={styles.copy}>Mevcut hesabinla giris yapip dogrudan ana akisina gecebilirsin.</Text>
        <PrimaryButton label="Giris yap" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitle: {
    textAlign: 'center',
    color: tokens.colors.muted,
    lineHeight: 22,
    maxWidth: 320,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  copy: {
    color: tokens.colors.muted,
    lineHeight: 22,
  },
});
