import { VehicleDetailScreen } from '@/screens/vehicle-detail-screen';

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleDetailScreen vehicleId={id} />;
}
