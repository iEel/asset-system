import { MasterDataDeleteButton } from "@/components/master-data/master-data-delete-button"

export function CompanyDeleteButton({ id }: { id: string }) {
  return <MasterDataDeleteButton endpoint={`/api/companies/${id}`} />
}
