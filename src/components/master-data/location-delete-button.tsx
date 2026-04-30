import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function LocationDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/locations/${id}`} />
}
