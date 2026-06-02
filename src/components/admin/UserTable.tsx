'use client'

import { useState } from 'react'

interface User {
  id:        string
  name:      string
  email:     string
  role:      string
  active:    boolean
  createdAt: Date | null
}

interface UserTableProps {
  users: User[]
}

export function UserTable({ users: initialUsers }: UserTableProps) {
  const [users, setUsers] = useState(initialUsers)

  async function toggleActive(userId: string, active: boolean) {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !active } : u))
  }

  async function toggleRole(userId: string, role: string) {
    const newRole = role === 'admin' ? 'user' : 'admin'
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  return (
    <div className="bg-white rounded-[14px] border border-[#D4E8DF] p-6 shadow-[0_1px_4px_rgba(26,77,58,.08)]">
      <h2 className="text-[22px] font-medium text-[#1A4D3A] mb-4">Usuários</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[#5B8C7A] border-b border-[#D4E8DF]">
              <th className="pb-2 pr-4">Nome</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#EAF3EE]">
                <td className="py-2 pr-4 font-medium text-[#2D4A3E]">{u.name}</td>
                <td className="py-2 pr-4 text-[#5B8C7A]">{u.email}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-[12px] ${u.role === 'admin' ? 'bg-[#EAF3EE] text-[#1A4D3A]' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-[12px] ${u.active ? 'bg-[#EAF3EE] text-[#2B7A5A]' : 'bg-[#FEF0F0] text-[#C04848]'}`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-2 flex gap-2">
                  <button
                    onClick={() => toggleActive(u.id, u.active)}
                    className="text-[#1A4D3A] underline hover:no-underline text-[13px]"
                  >
                    {u.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => toggleRole(u.id, u.role)}
                    className="text-[#1A4D3A] underline hover:no-underline text-[13px]"
                  >
                    {u.role === 'admin' ? '→ user' : '→ admin'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-[#9CB8B0]">Nenhum usuário</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
