import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function BranchDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/branches/${id}`} />
}
