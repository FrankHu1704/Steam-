import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateEmployeeForm } from "@/components/admin/create-employee-form";
import { EmployeeActiveToggle } from "@/components/admin/employee-active-toggle";
import { EmployeeApplicationReview } from "@/components/admin/employee-application-review";
import { CopyLinkField } from "@/components/admin/copy-link-field";
import { getAllEmployees, getPendingEmployeeApplications } from "@/lib/data/employees";
import { formatCurrency } from "@/lib/utils";

export default async function AdminEmployeesPage() {
  const [employees, applications] = await Promise.all([getAllEmployees(), getPendingEmployeeApplications()]);
  const applicationLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://pagaja.site"}/colaborador/candidatura`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Colaboradores</h1>
        <p className="text-sm text-muted-foreground">
          Funcionários que recrutam produtores e ganham comissão sobre as vendas deles nos primeiros 3 meses.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 font-semibold">Link de candidatura</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Partilhe este link — quem se candidatar preenche os próprios dados; só precisa de aprovar aqui.
          </p>
          <CopyLinkField link={applicationLink} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold">
            Candidaturas Pendentes {applications.length > 0 && `(${applications.length})`}
          </h2>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma candidatura pendente.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((a) => (
                <EmployeeApplicationReview key={a.id} application={a} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold">Criar Colaborador Manualmente</h2>
          <CreateEmployeeForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhum colaborador criado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Nome</th>
                    <th className="p-4 font-medium">Comissão</th>
                    <th className="p-4 font-medium">Pagamento</th>
                    <th className="p-4 font-medium">Produtores</th>
                    <th className="p-4 font-medium">Saldo</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="p-4 font-medium">
                        {e.name}
                        <div className="text-xs font-normal text-muted-foreground">{e.email}</div>
                      </td>
                      <td className="p-4">{e.commission_percent}%</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {e.mpesa_number && <div>M-Pesa: {e.mpesa_number}</div>}
                        {e.emola_number && <div>e-Mola: {e.emola_number}</div>}
                        {!e.mpesa_number && !e.emola_number && "—"}
                      </td>
                      <td className="p-4">{e.registeredCount}</td>
                      <td className="p-4">{formatCurrency(e.balance_available, "MZN")}</td>
                      <td className="p-4">
                        <Badge variant={e.active ? "success" : "secondary"}>{e.active ? "ativo" : "inativo"}</Badge>
                      </td>
                      <td className="p-4">
                        <EmployeeActiveToggle employeeId={e.id} active={e.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
