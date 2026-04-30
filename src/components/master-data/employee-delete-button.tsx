import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function EmployeeDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/employees/${id}`} />
}
