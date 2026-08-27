import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function AssetDeleteButton({ id, showLabel = false }: { id: string; showLabel?: boolean }) {
  return <MasterDataDeleteButton endpoint={`/api/assets/${id}`} showLabel={showLabel} />
}
