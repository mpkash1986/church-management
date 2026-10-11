import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import RecordActions from "@/components/RecordActions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roles = ["ADMIN", "TREASURER", "SECRETARY", "VIEWER"];

export default async function Users({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const actor = await getSession();
  if (!actor) redirect("/login");
  if (!actor.isActive) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/dashboard");
  const [{ error, success }, users] = await Promise.all([
    searchParams,
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, isActive: true } })
  ]);
  const messages: Record<string, string> = {
    invalid: "Enter a valid name, email, role, and password of at least 12 characters.",
    duplicate: "A user with that email address already exists.",
    server: "The user could not be created. Please try again."
  };

  return <Shell title="Users">
    {error && <p className="notice" role="alert">{messages[error] || "The user could not be saved."}</p>}
    {success && <p className="notice" role="status">User created.</p>}
    <section className="panel">
      <h2>Add user</h2>
      <form action="/api/users" method="post" className="form-grid">
        <div className="field"><label>Name *</label><input name="name" required /></div>
        <div className="field"><label>Email *</label><input name="email" type="email" required /></div>
        <div className="field"><label>Role *</label><select name="role" required>{roles.map((role) => <option key={role}>{role}</option>)}</select></div>
        <div className="field"><label>Temporary password (12+ characters) *</label><input name="password" type="password" minLength={12} required autoComplete="new-password" /></div>
        <div style={{ alignSelf: "end" }}><button type="submit">Add user</button></div>
      </form>
    </section>
    <section className="panel">
      <h2>User accounts</h2>
      <p className="muted">Passwords are never displayed. Leave the password field blank to keep the current password.</p>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{users.map((user) => <tr key={user.id}>
          <td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.isActive ? "Active" : "Inactive"}</td>
          <td><RecordActions entity="users" id={user.id} fields={[
            { name: "name", label: "Name", value: user.name, required: true },
            { name: "email", label: "Email", value: user.email, type: "email", required: true },
            { name: "role", label: "Role", value: user.role, type: "select", options: roles, required: true },
            { name: "password", label: "New password (optional, 12+ characters)", value: "", type: "password" },
            { name: "isActive", label: "Active", value: user.isActive }
          ]} canDelete={user.id !== actor.id} /></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </Shell>;
}
