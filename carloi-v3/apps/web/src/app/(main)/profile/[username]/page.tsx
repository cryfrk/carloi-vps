import { PublicProfileScreen } from '@/screens/public-profile-screen';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicProfileScreen username={username} />;
}
