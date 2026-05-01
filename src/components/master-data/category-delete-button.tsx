import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function CategoryDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/categories/${id}`} />
}
