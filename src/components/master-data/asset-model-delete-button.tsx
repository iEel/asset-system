import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function AssetModelDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/models/${id}`} />
}
