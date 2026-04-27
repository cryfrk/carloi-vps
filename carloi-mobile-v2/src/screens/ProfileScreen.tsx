import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PublicProfilePayload, SearchResultUser } from '@carloi/v2-shared';
import { getMobileApiClient } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
import { NetworkBanner } from '@/components/NetworkBanner';
import { PostCard } from '@/components/PostCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useGarageStore } from '@/store/garage-store';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

type Segment = 'posts' | 'listings' | 'garage';

export function ProfileScreen({ navigation }: { navigation: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const apiStatus = useSessionStore((state) => state.apiStatus);
  const apiMessage = useSessionStore((state) => state.apiMessage);
  const localVehicles = useGarageStore((state) => state.vehicles);
  const [segment, setSegment] = useState<Segment>('posts');
  const [publicProfile, setPublicProfile] = useState<PublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listModal, setListModal] = useState<{ title: string; items: SearchResultUser[] } | null>(null);
  const client = useMemo(() => getMobileApiClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!snapshot?.profile.handle) {
        return;
      }

      try {
        setLoading(true);
        const response = await client.getPublicProfile(snapshot.profile.handle);
        if (!cancelled) {
          setPublicProfile({
            profile: response.profile || {
              id: 'me',
              name: snapshot.profile.name,
              handle: snapshot.profile.handle,
              bio: snapshot.profile.bio,
              followers: snapshot.profile.followers,
              following: snapshot.profile.following,
              posts: snapshot.profile.posts,
              verified: snapshot.profile.verified,
              profileLink: `/profile/${snapshot.profile.handle}`,
            },
            posts: response.posts || [],
            listings: response.listings || [],
            followers: response.followers || [],
            following: response.following || [],
          });
        }
      } catch (profileError) {
        if (!cancelled) {
          setError(getReadableErrorMessage(profileError, 'Profil yuklenemedi.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [client, snapshot?.profile.bio, snapshot?.profile.followers, snapshot?.profile.following, snapshot?.profile.handle, snapshot?.profile.name, snapshot?.profile.posts, snapshot?.profile.verified]);

  const profile = publicProfile?.profile || {
    id: 'me',
    name: snapshot?.profile.name || 'Carloi kullanicisi',
    handle: snapshot?.profile.handle || 'carloi',
    bio: snapshot?.profile.bio || 'Henüz biyografi eklenmemis.',
    followers: snapshot?.profile.followers || 0,
    following: snapshot?.profile.following || 0,
    posts: snapshot?.profile.posts || 0,
    verified: snapshot?.profile.verified || false,
    profileLink: '/profile/me',
  };

  const posts = publicProfile?.posts || snapshot?.posts || [];
  const listings = publicProfile?.listings || posts.filter((post) => post.type === 'listing' || post.listing);
  const followerItems = publicProfile?.followers || [];
  const followingItems = publicProfile?.following || [];

  async function openListingConversation(postId: string) {
    try {
      const response = await client.ensureListingConversation(postId);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      const latestConversation =
        (response.snapshot?.conversations || []).find((item) => item.listingContext?.postId === postId) ||
        (snapshot?.conversations || []).find((item) => item.listingContext?.postId === postId);
      navigation.navigate('Messages', latestConversation ? { conversationId: latestConversation.id } : undefined);
    } catch (conversationError) {
      setError(getReadableErrorMessage(conversationError, 'Ilan mesaji acilamadi.'));
    }
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Profil"
        subtitle="Paylasimlar, ilanlar ve vitrindeki araclarin"
        onPressCreate={() => navigation.getParent()?.navigate('Create')}
        onPressSearch={() => navigation.getParent()?.navigate('Search')}
      />

      <NetworkBanner status={apiStatus} message={apiMessage} />

      <SectionCard>
        <View style={styles.heroRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{profile.name}</Text>
              {snapshot?.commercial?.enabled ? <StatusBadge label="Ticari hesap" tone="accent" /> : null}
              {profile.verified ? <StatusBadge label="Dogrulandi" tone="success" /> : null}
            </View>
            <Text style={styles.profileHandle}>@{profile.handle}</Text>
            <Text style={styles.profileBio}>{profile.bio || 'Carloi toplulugunda araclarini, ilanlarini ve surus hikayelerini paylas.'}</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <ProfileMetric label="Takipci" value={profile.followers} onPress={() => setListModal({ title: 'Takipciler', items: followerItems })} />
          <ProfileMetric label="Takip edilen" value={profile.following} onPress={() => setListModal({ title: 'Takip edilenler', items: followingItems })} />
          <ProfileMetric label="Gonderi" value={profile.posts} />
          <ProfileMetric label="Ilan" value={listings.length} />
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton label="Profili duzenle" onPress={() => navigation.getParent()?.navigate('Settings')} />
          <PrimaryButton label="Ticari hesap" variant="secondary" onPress={() => navigation.getParent()?.navigate('Commercial')} />
        </View>
      </SectionCard>

      <SectionCard>
        <View style={styles.segmentRow}>
          <SegmentButton label="Gonderiler" active={segment === 'posts'} onPress={() => setSegment('posts')} />
          <SegmentButton label="Ilanlar" active={segment === 'listings'} onPress={() => setSegment('listings')} />
          <SegmentButton label="Garaj" active={segment === 'garage'} onPress={() => setSegment('garage')} />
        </View>
      </SectionCard>

      {segment === 'posts' ? (
        posts.length ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onOpenListingConversation={openListingConversation} />
          ))
        ) : loading ? (
          <SectionCard>
            <Text style={styles.loadingText}>Profil akis verileri yukleniyor...</Text>
          </SectionCard>
        ) : (
          <EmptyState
            title="Profil akisi bos"
            description="Ilk gonderiyi paylasarak veya arac gonderisi olusturarak profil akisini baslat."
            actionLabel="Gonderi olustur"
            onAction={() => navigation.getParent()?.navigate('Create', { mode: 'post' })}
          />
        )
      ) : null}

      {segment === 'listings' ? (
        listings.length ? (
          listings.map((post) => (
            <SectionCard key={post.id}>
              <View style={styles.listingHeader}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.listingTitle}>{post.listing?.title || post.content || 'Ilan'}</Text>
                  <Text style={styles.listingPrice}>{post.listing?.price || 'Fiyat girilmemis'}</Text>
                  <Text style={styles.listingMeta}>{post.listing?.summaryLine || post.listing?.location || 'Konum bilgisi bekleniyor'}</Text>
                </View>
                <PrimaryButton label="Mesaj at" onPress={() => openListingConversation(post.id)} />
              </View>
            </SectionCard>
          ))
        ) : (
          <EmptyState
            title="Yayindaki ilan yok"
            description="Garajindan veya olustur ekranindan profesyonel ilan yayina alabilirsin."
            actionLabel="Ilan olustur"
            onAction={() => navigation.getParent()?.navigate('Create', { mode: 'listing' })}
          />
        )
      ) : null}

      {segment === 'garage' ? (
        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vitrindeki araclar</Text>
            <PrimaryButton label="Garajim" variant="secondary" onPress={() => navigation.navigate('Garage')} />
          </View>

          {snapshot?.vehicle ? (
            <Pressable style={styles.vehicleCard} onPress={() => navigation.getParent()?.navigate('VehicleDetail', { id: 'primary' })}>
              <Text style={styles.vehicleTitle}>
                {snapshot.vehicle.brand} {snapshot.vehicle.model}
              </Text>
              <Text style={styles.listingMeta}>
                {snapshot.vehicle.year} | {snapshot.vehicle.packageName} | {snapshot.vehicle.mileage}
              </Text>
            </Pressable>
          ) : null}

          {localVehicles.length ? (
            <View style={styles.localVehicleList}>
              {localVehicles.map((vehicle) => (
                <Pressable
                  key={vehicle.id}
                  style={styles.vehicleCard}
                  onPress={() => navigation.getParent()?.navigate('VehicleDetail', { id: vehicle.id })}
                >
                  {vehicle.photoUri ? <Image source={{ uri: vehicle.photoUri }} style={styles.vehicleThumb} resizeMode="cover" /> : null}
                  <Text style={styles.vehicleTitle}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={styles.listingMeta}>
                    {vehicle.plateVisible ? vehicle.plate : 'Plaka gizli'} | {vehicle.vehicleType}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : !snapshot?.vehicle ? (
            <EmptyState
              title="Vitrinde arac yok"
              description="Garajim sekmesinden arac ekledikce burada profil vitrini olusur."
              actionLabel="Garaja git"
              onAction={() => navigation.navigate('Garage')}
            />
          ) : null}
        </SectionCard>
      ) : null}

      <ErrorBanner message={error} />

      <PeopleModal
        visible={Boolean(listModal)}
        title={listModal?.title || ''}
        items={listModal?.items || []}
        onClose={() => setListModal(null)}
      />
    </ScreenContainer>
  );
}

function ProfileMetric({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return body;
  }

  return <Pressable onPress={onPress}>{body}</Pressable>;
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function PeopleModal({
  visible,
  title,
  items,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: SearchResultUser[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.profileName}>{title}</Text>
            <PrimaryButton label="Kapat" variant="ghost" onPress={onClose} />
          </View>

          {items.length ? (
            <ScrollView contentContainerStyle={styles.peopleList}>
              {items.map((item) => (
                <View key={item.id} style={styles.personCard}>
                  <View style={styles.personAvatar}>
                    <Text style={styles.personAvatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.personHandle}>@{item.handle}</Text>
                    <Text style={styles.personNote}>{item.note}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <EmptyState title="Liste bos" description="Bu alanda henuz gosterilecek baglanti bulunmuyor." />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatar: {
    height: 74,
    width: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  profileHandle: {
    color: tokens.colors.muted,
    fontSize: 13,
  },
  profileBio: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricCard: {
    minWidth: 78,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.muted,
  },
  actionRow: {
    gap: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  segmentButtonActive: {
    backgroundColor: tokens.colors.accentSoft,
    borderColor: tokens.colors.accent,
  },
  segmentLabel: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
  segmentLabelActive: {
    color: tokens.colors.accent,
  },
  loadingText: {
    color: tokens.colors.muted,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  listingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.accent,
  },
  listingMeta: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  vehicleCard: {
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 8,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  localVehicleList: {
    gap: 10,
  },
  vehicleThumb: {
    width: '100%',
    height: 150,
    borderRadius: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  peopleList: {
    gap: 12,
    paddingBottom: 10,
  },
  personCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  personName: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  personHandle: {
    color: tokens.colors.muted,
    fontSize: 12,
  },
  personNote: {
    color: tokens.colors.text,
    lineHeight: 20,
  },
});
