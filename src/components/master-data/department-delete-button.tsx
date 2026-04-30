import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function DepartmentDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/departments/${id}`} />
}
